/**
 * Prompt 133 (Phase 3) -- free, dependency-free background removal for
 * the customer's uploaded logo. Client-side only (imports nothing
 * server-only, safe to call from BottleDesigner.tsx directly) -- no new
 * server load, no paid API, per the client's own explicit decision.
 *
 * RESEARCH (this prompt's own task item 1):
 *
 * TECHNIQUE CHOSEN: flood-fill chroma-key, starting from the image's
 * OUTER EDGE, using the HTML5 Canvas API's getImageData/putImageData --
 * same "native browser API over a library" discipline already
 * established in this project (Prompt 82's image-compression decision,
 * Prompt 102's scroll-reveal decision, Prompt 132's own Pointer Events
 * decision this same feature already made). No new dependency: Canvas,
 * ImageBitmap, and Blob are all native.
 *
 * Flood-fill from the edges, NOT a naive global color-replace -- this is
 * a real, meaningful difference, not a wording nuance:
 *
 *   - A GLOBAL color-match approach scans every pixel in the whole image
 *     and makes ANY pixel within tolerance of the sampled background
 *     color transparent, wherever it happens to sit. This is fast and
 *     simple, but actively WRONG for a real logo: if the logo's own
 *     artwork contains a patch of white (a letter's counter-space, a
 *     highlight, a white letter "O" in the wordmark, ...) that happens to
 *     be close to the sampled background color, a global approach erases
 *     THAT too, punching a hole in the middle of the logo.
 *   - The FLOOD-FILL approach implemented here starts only from pixels on
 *     the image's outer border that match the sampled background color,
 *     then spreads to their 4-connected neighbors ONLY while those
 *     neighbors also match -- a classic BFS "paint bucket" fill. A
 *     background-colored patch INSIDE the logo that is not connected to
 *     the edge through a continuous path of background-colored pixels is
 *     never touched, because the fill can never reach it. This is
 *     meaningfully more robust and is the real, standard technique for
 *     this exact problem (the same algorithm behind every raster editor's
 *     own "magic wand"/paint-bucket background-removal tool).
 *
 * REAL, HONEST LIMITATION (communicated in the UI too, not just here):
 * this only works well when the background is a single, fairly uniform
 * solid color (white is the common case) that visually TOUCHES every
 * edge of the image. A photographic background, a gradient, a background
 * that doesn't reach the image's own border (e.g. the logo is inset with
 * padding of a DIFFERENT color), or a background color close to colors
 * used inside the logo's own artwork near the edge, will all produce a
 * partial or poor result. This is the genuine, known tradeoff of every
 * free, non-ML background-removal technique -- true subject/background
 * segmentation needs a trained model (a paid API, or a much heavier
 * client-side ML model), which the client explicitly ruled out.
 *
 * Background color reference: averaged from the image's 4 corner pixels
 * (falling back to white if all 4 corners are already fully transparent
 * -- see the already-transparent-PNG edge case below) -- corners are a
 * simple, reliable sample point for the common "logo centered on a solid
 * background" case, without needing the customer to manually pick a
 * color (out of scope for this phase, and the task's own spec doesn't
 * ask for a color picker).
 *
 * Tolerance: a squared-RGB-distance threshold (avoids a sqrt per pixel --
 * plain arithmetic comparison is enough for a threshold check and keeps
 * the flood-fill's hot inner loop cheap). DEFAULT_TOLERANCE below was
 * chosen to comfortably absorb ordinary JPEG-compression noise / PNG
 * anti-aliasing around a solid background without also swallowing a
 * visually distinct logo color -- a real, tunable constant, not a magic
 * number lifted from nowhere.
 *
 * Large images are downscaled to a max working dimension before
 * processing (MAX_DIMENSION below) -- a real performance safeguard, not
 * asked for explicitly by this prompt's own spec, but a direct,
 * reasonable response to its own "canvas pixel operations on a big image
 * aren't instant" acknowledgment: without a cap, a genuinely huge source
 * photo (e.g. a 6000x6000 phone photo of a printed logo) would make the
 * "brief processing state" the UI promises not brief at all. A logo
 * never legitimately needs more resolution than this for on-screen
 * positioning purposes.
 */

const DEFAULT_TOLERANCE = 32;
const MAX_DIMENSION = 1600;

export type RemoveBackgroundResult =
  | { status: "success"; url: string }
  | { status: "error"; message: string };

export async function removeBackground(
  file: File | Blob,
  tolerance: number = DEFAULT_TOLERANCE
): Promise<RemoveBackgroundResult> {
  try {
    const bitmap = await createImageBitmap(file);

    // Downscale to MAX_DIMENSION on the longer side, preserving aspect
    // ratio -- see this file's own top comment for why.
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return { status: "error", message: "This browser doesn't support the canvas operations background removal needs." };
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    if ("close" in bitmap) bitmap.close();

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Sample the background reference color from the 4 corners --
    // skipping any corner that's ALREADY fully transparent (the
    // "already-transparent PNG" edge case: a corner with alpha 0 carries
    // no meaningful color information to sample). If every corner is
    // already transparent, fall back to plain white -- the common
    // documented case this technique targets -- rather than sampling
    // garbage.
    const cornerIndexes = [
      0,
      (width - 1) * 4,
      (height - 1) * width * 4,
      ((height - 1) * width + (width - 1)) * 4,
    ];
    const opaqueCorners = cornerIndexes.filter((idx) => data[idx + 3] > 0);
    const sampleFrom = opaqueCorners.length > 0 ? opaqueCorners : null;

    let refR = 255;
    let refG = 255;
    let refB = 255;
    if (sampleFrom) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const idx of sampleFrom) {
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
      }
      refR = Math.round(r / sampleFrom.length);
      refG = Math.round(g / sampleFrom.length);
      refB = Math.round(b / sampleFrom.length);
    }

    const toleranceSquared = tolerance * tolerance;
    function matchesBackground(idx: number): boolean {
      const dr = data[idx] - refR;
      const dg = data[idx + 1] - refG;
      const db = data[idx + 2] - refB;
      return dr * dr + dg * dg + db * db <= toleranceSquared;
    }

    // BFS flood-fill from every border pixel that matches the reference
    // color -- see this file's own top comment for why this (not a
    // global scan) is the real technique. `visited` avoids re-checking a
    // pixel; the queue holds pixel INDEXES (y * width + x), not byte
    // offsets, and is walked with a head pointer rather than
    // Array.prototype.shift() (O(1) per step instead of O(n) -- matters
    // once the queue holds a meaningful fraction of a multi-hundred-
    // thousand-pixel image).
    const visited = new Uint8Array(width * height);
    const queue: number[] = [];

    function maybeEnqueue(x: number, y: number) {
      if (x < 0 || x >= width || y < 0 || y >= height) return;
      const pixelIndex = y * width + x;
      if (visited[pixelIndex]) return;
      visited[pixelIndex] = 1;
      const byteIdx = pixelIndex * 4;
      // Already transparent -- nothing to do, and correctly never
      // touched again (the already-transparent-PNG edge case).
      if (data[byteIdx + 3] === 0) return;
      if (!matchesBackground(byteIdx)) return;
      queue.push(pixelIndex);
    }

    for (let x = 0; x < width; x++) {
      maybeEnqueue(x, 0);
      maybeEnqueue(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      maybeEnqueue(0, y);
      maybeEnqueue(width - 1, y);
    }

    let head = 0;
    while (head < queue.length) {
      const pixelIndex = queue[head++];
      const byteIdx = pixelIndex * 4;
      data[byteIdx + 3] = 0; // make transparent
      const x = pixelIndex % width;
      const y = (pixelIndex - x) / width;
      maybeEnqueue(x + 1, y);
      maybeEnqueue(x - 1, y);
      maybeEnqueue(x, y + 1);
      maybeEnqueue(x, y - 1);
    }

    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) {
      return { status: "error", message: "Couldn't export the processed image. Please try again." };
    }

    return { status: "success", url: URL.createObjectURL(blob) };
  } catch (err) {
    // Real failure fallback (this prompt's own task item 3) -- the
    // CALLER (BottleDesigner.tsx) is what actually keeps the original
    // logo as the active/displayed one on error; this function just
    // reports the failure honestly rather than throwing an unhandled
    // exception up into a client component's render.
    return {
      status: "error",
      message:
        err instanceof Error
          ? err.message
          : "Something went wrong removing the background. Please try again.",
    };
  }
}
