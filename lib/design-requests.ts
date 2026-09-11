import { createClient } from "@/lib/supabase/client";

/**
 * Composite image generation + real submission for the Custom Bottle
 * Designer. Plain client-side module, no "server-only" / "use client"
 * directive needed (same as lib/remove-background.ts): it imports
 * nothing server-only, and is only ever called from BottleDesigner.tsx /
 * DesignRequestForm.tsx, both already Client Components.
 *
 * ARCHITECTURE DECISION (established Prompt 136, reaffirmed unchanged
 * for Prompt 143/Phase D's own multi-design submission below): both the
 * Storage uploads and the design_requests INSERT go straight from the
 * browser via lib/supabase/client.ts's createClient() (the same
 * anon-key browser client HeaderSearch.tsx already uses for live reads)
 * -- not a Server Action. Two real reasons, not just "the task said so":
 *   1. The canvas composite (generateCompositeImage below) can ONLY be
 *      produced in the browser -- canvas, Image, and the customer's own
 *      drag position all live client-side. Any Server Action here would
 *      still need the already-generated Blob handed to it as-is; it
 *      would add a network hop with zero validation/business logic
 *      actually happening on the server (unlike submit_quote_request's
 *      RPC, which genuinely needs server-side transactional stock
 *      decrements across multiple tables -- there is no equivalent
 *      multi-table invariant here). Still true for Phase D's
 *      multi-design submission: every design's composite/logo Blobs are
 *      already sitting in the browser as object URLs (Phase B's own
 *      "My Designs" snapshots), same as before, just more of them.
 *   2. Phase C's own migration (0037) already built RLS specifically for
 *      this across all three tables (design_requests, design_request_items,
 *      design_request_item_logos): anon INSERT only, `with check
 *      (status = 'new')` on the parent, no read-back/update/delete
 *      anywhere -- the REAL security boundary, deliberately designed so
 *      an anonymous browser session can do exactly this and nothing
 *      more. Routing through a Server Action would just be an extra hop
 *      in front of a boundary that already holds on its own.
 */

const BUCKET = "design-requests";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type DesignRequestSubmitResult =
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Loads a URL into a real HTMLImageElement, Promise-wrapped.
 *
 * `crossOrigin` MUST be true for the bottle color photo: it's served from
 * Supabase Storage, a different origin than this app (localhost during
 * dev, the Vercel domain in production) -- without
 * `img.crossOrigin = "anonymous"`, drawing it into the canvas below would
 * TAINT the canvas (origin-clean: false), and canvas.toBlob() throws a
 * SecurityError on a tainted canvas. Setting crossOrigin only works if
 * the image response actually sends a permissive CORS header back --
 * confirmed this is real, not assumed, by curling a real
 * bottle-color-images object directly: it returns
 * `access-control-allow-origin: *` on every response, so this genuinely
 * succeeds rather than failing to load.
 *
 * `crossOrigin` is false for the logo: `activeLogoUrl` is always a local
 * `blob:` URL (the customer's own upload, or Phase 3's background-removal
 * output) -- a blob: URL is always same-origin to the document that
 * created it, so no CORS concern applies, and setting crossOrigin on a
 * blob: URL is a no-op either way.
 */
function loadImage(src: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Couldn't load an image needed to generate your design. Please try again."));
    img.src = src;
  });
}

/** The visible photo's real sub-rectangle within the container box, in
 *  container pixels -- shared by every logo (same bottle, same
 *  container), so computed once per generateCompositeImage call rather
 *  than recomputed per logo. See generateCompositeImage's own top
 *  comment for the full object-contain letterboxing reasoning. */
type VisibleRect = {
  visibleWidthPx: number;
  visibleHeightPx: number;
  offsetXPx: number;
  offsetYPx: number;
};

function computeVisibleRect(
  containerWidthPx: number,
  containerHeightPx: number,
  imageAspect: number
): VisibleRect {
  const containerAspect =
    containerHeightPx > 0 ? containerWidthPx / containerHeightPx : 1;

  let visibleWidthPx: number;
  let visibleHeightPx: number;
  if (imageAspect > containerAspect) {
    // Photo is relatively WIDER than the container -- width is the
    // constraining dimension, letterboxing appears top/bottom.
    visibleWidthPx = containerWidthPx;
    visibleHeightPx = containerWidthPx / imageAspect;
  } else {
    // Photo is relatively NARROWER/TALLER than the container -- height
    // is constraining, letterboxing appears left/right (the real case
    // measured for the actual "yellow" bottle photo).
    visibleHeightPx = containerHeightPx;
    visibleWidthPx = containerHeightPx * imageAspect;
  }

  return {
    visibleWidthPx,
    visibleHeightPx,
    offsetXPx: (containerWidthPx - visibleWidthPx) / 2,
    offsetYPx: (containerHeightPx - visibleHeightPx) / 2,
  };
}

/** Draws ONE logo onto the canvas at its own position -- the exact same
 *  per-logo coordinate-remapping math Phase 4 established for the
 *  single-logo case, now factored out so Prompt 140's loop (below) can
 *  call it once per logo without duplicating the math. */
function drawLogoOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  logoImg: HTMLImageElement,
  position: { x: number; y: number },
  containerWidthPx: number,
  containerHeightPx: number,
  visibleRect: VisibleRect
) {
  const { visibleWidthPx, visibleHeightPx, offsetXPx, offsetYPx } = visibleRect;

  // position.x/y -> container pixels -> fraction of the VISIBLE photo
  // sub-rectangle (clamped: a position dragged all the way to the
  // container's own edge can legitimately land inside the letterbox
  // margin itself, which has no meaningful photo-relative fraction --
  // clamping keeps the logo from being drawn off-canvas in that case
  // rather than producing a nonsensical negative/>1 coordinate).
  const posXContainerPx = (position.x / 100) * containerWidthPx;
  const posYContainerPx = (position.y / 100) * containerHeightPx;
  const posXVisibleFrac =
    visibleWidthPx > 0
      ? Math.min(1, Math.max(0, (posXContainerPx - offsetXPx) / visibleWidthPx))
      : 0.5;
  const posYVisibleFrac =
    visibleHeightPx > 0
      ? Math.min(1, Math.max(0, (posYContainerPx - offsetYPx) / visibleHeightPx))
      : 0.5;

  const centerX = posXVisibleFrac * canvas.width;
  const centerY = posYVisibleFrac * canvas.height;

  // canvas.width native pixels correspond to visibleWidthPx on-screen
  // pixels (both represent the SAME photo content) -- this is the scale
  // factor that turns the overlay's on-screen logo width into the
  // equivalent canvas-native width.
  const screenToCanvasScale =
    visibleWidthPx > 0 ? canvas.width / visibleWidthPx : 1;
  const cssLogoWidthPx = Math.min(containerWidthPx * 0.25, 120);
  const logoWidth = cssLogoWidthPx * screenToCanvasScale;
  const logoHeight = logoWidth * (logoImg.naturalHeight / logoImg.naturalWidth);

  ctx.drawImage(
    logoImg,
    centerX - logoWidth / 2,
    centerY - logoHeight / 2,
    logoWidth,
    logoHeight
  );
}

/**
 * Renders the selected bottle color photo + EVERY logo the customer has
 * added (Prompt 140, Phase A -- a loop over `logos`, replacing Phase 4's
 * single-logo draw) into one flat PNG, at the bottle photo's own native
 * resolution -- this becomes the "what the customer actually designed"
 * record the admin will see.
 *
 * OBJECT-CONTAIN LETTERBOXING (a real correctness issue caught by Phase
 * 4's own real-flow verification, not a hypothetical edge case): the
 * live overlay's `position.x`/`position.y` (Phase 2's own coordinate
 * system) are percentages of the CONTAINER's own box
 * (`containerRef.current.getBoundingClientRect()`), but the bottle
 * `<Image fill className="object-contain">` does NOT necessarily fill
 * that whole box with visible photo -- `fill` forces the underlying
 * `<img>` element's LAYOUT box to 100% of the container regardless of
 * content (confirmed via a live getBoundingClientRect() check -- the img
 * element's own box always measures exactly the container's size,
 * `object-fit` only changes how pixels are painted WITHIN that
 * unchanged box), and `object-contain` then letterboxes the actual
 * photo inside it whenever the photo's own aspect ratio differs from
 * the container's forced `aspect-[3/4]` ratio. Confirmed this genuinely
 * happens for the real client-uploaded "yellow" bottle photo (natural
 * aspect ~0.667, vs the container's forced 0.75) -- real, measurable
 * ~5.5%-per-side empty margin, not negligible.
 *
 * Fixed by reproducing the browser's own object-contain math here (see
 * computeVisibleRect above): given the container's real box
 * (`containerWidthPx`/`containerHeightPx`) and the bottle image's own
 * natural dimensions, compute the visible photo's actual sub-rectangle
 * within the container (centered, per the default `object-position`
 * this project never overrides), remap each logo's `position` from
 * "percentage of the container" to "percentage of the VISIBLE PHOTO"
 * first, and only then onto the canvas (which is sized 1:1 to the
 * photo's own full natural resolution, so no further letterboxing math
 * applies past that point). This visible rect is the SAME for every
 * logo (same bottle, same container) -- computed once, reused across
 * the whole loop below, not recomputed per logo.
 */
export async function generateCompositeImage({
  bottleImageUrl,
  logos,
  containerWidthPx,
  containerHeightPx,
}: {
  bottleImageUrl: string;
  logos: { url: string; position: { x: number; y: number } }[];
  containerWidthPx: number;
  containerHeightPx: number;
}): Promise<Blob> {
  const [bottleImg, logoImgs] = await Promise.all([
    loadImage(bottleImageUrl, true),
    Promise.all(logos.map((logo) => loadImage(logo.url, false))),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = bottleImg.naturalWidth;
  canvas.height = bottleImg.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("This browser doesn't support generating your design image.");
  }

  // The canvas IS sized to the bottle photo's own natural dimensions, so
  // drawing it at (0, 0, canvas.width, canvas.height) is inherently a 1:1
  // "contain" of the photo into the canvas -- the letterboxing that
  // matters here is the CONTAINER's (computed below), not the canvas's.
  ctx.drawImage(bottleImg, 0, 0, canvas.width, canvas.height);

  const visibleRect = computeVisibleRect(
    containerWidthPx,
    containerHeightPx,
    bottleImg.naturalWidth / bottleImg.naturalHeight
  );

  // Prompt 140 -- draw EVERY logo, in array order (later entries paint
  // over earlier ones where they overlap, matching the live overlay's
  // own DOM/z-index stacking -- see BottleDesigner.tsx's own comment),
  // each independently positioned via its own `position`.
  logos.forEach((logo, index) => {
    drawLogoOnCanvas(
      ctx,
      canvas,
      logoImgs[index],
      logo.position,
      containerWidthPx,
      containerHeightPx,
      visibleRect
    );
  });

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) {
    throw new Error("Couldn't generate your design image. Please try again.");
  }
  return blob;
}

/** Uploads one Blob to the design-requests bucket under a fresh unique
 *  path -- real anon INSERT, matching this bucket's own deliberate RLS
 *  exception (0036 migration's own comment: the one bucket where a
 *  visitor can add their own files). Never overwrites -- `upsert: false`,
 *  same as every other image upload in this project. */
async function uploadDesignRequestFile(
  supabase: ReturnType<typeof createClient>,
  prefix: string,
  blob: Blob
): Promise<string | null> {
  const extension = EXTENSION_BY_MIME_TYPE[blob.type] ?? "png";
  const path = `${prefix}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type || `image/${extension}`, upsert: false });
  return error ? null : path;
}

const MAX_NOTE_LENGTH = 2000; // same cap as QuoteRequest's own message field

/** One design within a submission -- the shape submitDesignRequestCart
 *  needs, deliberately NOT the full SavedDesign/DesignLogoEntry types
 *  from DesignRequestProvider.tsx (this module has no reason to import
 *  a React-specific type just to read a few fields off it): the
 *  caller (DesignRequestForm.tsx) already resolves each logo's ACTIVE
 *  url (original vs. background-removed) before calling this, so this
 *  function only ever deals in plain strings/Blobs, matching
 *  generateCompositeImage's own logo-input shape above. */
export type DesignRequestCartItem = {
  bottleColor: string;
  note: string | null;
  /** The design's own pre-rendered composite (Phase B's "My Designs"
   *  thumbnail, generated once via generateCompositeImage at save
   *  time) -- reused as-is for the real submission, never regenerated. */
  compositeUrl: string;
  /** Every logo's own currently-active url, in the same order they
   *  should be recorded (sort_order = array index). */
  logoUrls: string[];
};

/**
 * Prompt 143 (Phase D) -- uploads EVERY design's composite + every one
 * of its logos, then inserts the real 3-level submission (Phase C's own
 * schema: one design_requests parent row with customer info, one
 * design_request_items row per design, one design_request_item_logos
 * row per logo) -- the real, final submission, anon-key-driven end to
 * end (see this file's own top comment for why no Server Action).
 *
 * Client-generated ids throughout (crypto.randomUUID()), same
 * established pattern as quote_requests' own documented
 * client-generates-id convention (0008 migration's own comment) --
 * required here specifically because anon has no SELECT grant on any of
 * these three tables, so `.insert().select()` to learn a just-inserted
 * row's real id is not an option; the id has to be known BEFORE the
 * insert so the next level's foreign key can reference it immediately.
 *
 * Uploads first, across every design and every logo, fully in parallel
 * (independent files, no ordering dependency) -- only once every single
 * upload has actually succeeded does this move on to the database
 * inserts, so a mid-way upload failure never leaves a half-written
 * parent/item structure pointing at files that don't exist.
 */
export async function submitDesignRequestCart({
  customerName,
  customerEmail,
  customerPhone,
  customerCompany,
  designs,
}: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany: string;
  designs: DesignRequestCartItem[];
}): Promise<DesignRequestSubmitResult> {
  const supabase = createClient();

  const uploadResults = await Promise.all(
    designs.map(async (design) => {
      const [compositeBlob, ...logoBlobs] = await Promise.all([
        fetch(design.compositeUrl).then((res) => res.blob()),
        ...design.logoUrls.map((url) => fetch(url).then((res) => res.blob())),
      ]);
      const [compositePath, ...logoPaths] = await Promise.all([
        uploadDesignRequestFile(supabase, "composite", compositeBlob),
        ...logoBlobs.map((blob) => uploadDesignRequestFile(supabase, "logo", blob)),
      ]);
      return { compositePath, logoPaths };
    })
  );

  const anyUploadFailed = uploadResults.some(
    (result) => !result.compositePath || result.logoPaths.some((path) => !path)
  );
  if (anyUploadFailed) {
    // Whichever uploads DID succeed are left in place, uncleaned -- same
    // "no anon DELETE policy on this bucket, by design" reasoning the
    // single-design flow's own version of this comment already gave:
    // real orphaned objects, never referenced by any row (no insert
    // below runs on this path), not a data-integrity problem.
    return {
      status: "error",
      message: "Something went wrong uploading your designs. Please try again.",
    };
  }

  const parentId = crypto.randomUUID();
  const { error: parentError } = await supabase.from("design_requests").insert({
    id: parentId,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    customer_company: customerCompany,
    status: "new",
  });
  if (parentError) {
    return {
      status: "error",
      message: "Something went wrong sending your request. Please try again.",
    };
  }

  const itemRows = uploadResults.map((result, index) => ({
    id: crypto.randomUUID(),
    design_request_id: parentId,
    bottle_color: designs[index].bottleColor,
    composite_image_storage_path: result.compositePath!,
    note: designs[index].note?.trim()
      ? designs[index].note!.trim().slice(0, MAX_NOTE_LENGTH)
      : null,
    sort_order: index,
  }));
  const { error: itemsError } = await supabase
    .from("design_request_items")
    .insert(itemRows);
  if (itemsError) {
    // A real partial-failure state (a parent row now exists with zero
    // items) -- the same accepted risk class as the orphaned-Storage-
    // object case above, restated for a DB row instead of a file: anon
    // has no DELETE grant on design_requests either (0037 migration, by
    // design), so there's no client-side cleanup available. Worth a
    // real transactional RPC (matching quote_requests' own
    // submit_quote_request) if this ever becomes an operational
    // nuisance at scale -- out of scope for this prompt, which didn't
    // ask for one.
    return {
      status: "error",
      message: "Something went wrong sending your request. Please try again.",
    };
  }

  const logoRows = itemRows.flatMap((itemRow, index) =>
    uploadResults[index].logoPaths.map((path, logoIndex) => ({
      design_request_item_id: itemRow.id,
      logo_storage_path: path!,
      sort_order: logoIndex,
    }))
  );
  if (logoRows.length > 0) {
    const { error: logosError } = await supabase
      .from("design_request_item_logos")
      .insert(logoRows);
    if (logosError) {
      return {
        status: "error",
        message: "Something went wrong sending your request. Please try again.",
      };
    }
  }

  return { status: "success" };
}
