import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * Admin-only token route for Vercel Blob client-side (direct-to-Blob)
 * uploads -- the fix for the ~4.5MB Vercel serverless request body limit
 * that silently hung every home-video upload over that size (diagnosed in
 * a prior prompt: 0.38MB succeeded, 5.28MB hung forever with zero server
 * response, exactly the signature of a platform-level body-size rejection
 * that next.config.ts's own bodySizeLimit/proxyClientMaxBodySize cannot
 * override since it's enforced before Next's own body parsing runs).
 *
 * With this route, the actual file bytes never pass through a Server
 * Action body at all: the browser calls `upload()` from
 * "@vercel/blob/client", which POSTs here first (tiny JSON body) to get a
 * short-lived, narrowly-scoped token, then PUTs the real file bytes
 * directly to Vercel's Blob service. The Server Action that follows only
 * ever receives the resulting Blob URL (a short string), nowhere close to
 * any body-size ceiling.
 *
 * Auth: this route lives under /admin/api/, so proxy.ts's own
 * handleAdminRoute already blocks unauthenticated requests before this
 * handler runs (same getClaims() check, same redirect-to-login). The
 * explicit check below is deliberate defense-in-depth, not redundant --
 * it mirrors proxy.ts's own check exactly so this route is never
 * ACCIDENTALLY left open if that routing/matcher logic is ever changed,
 * matching the "defense in depth" pattern already used throughout this
 * project's upload code (e.g. every client-side file-size/type check also
 * re-validated server-side).
 *
 * Per-pathname-prefix allowlist below is the real authorization boundary
 * for WHAT can be uploaded and HOW BIG it can be -- enforced by Vercel
 * Blob itself via the signed token (onBeforeGenerateToken), not just
 * advisory client-side checks. Anything whose pathname doesn't match one
 * of these two prefixes is rejected outright, so this token can never be
 * used to write anywhere else in the Blob store.
 */
const UPLOAD_RULES: Record<string, { contentTypes: string[]; maxSizeBytes: number }> = {
  "home-videos/videos/": {
    contentTypes: ["video/mp4", "video/webm", "video/quicktime"],
    maxSizeBytes: 12 * 1024 * 1024,
  },
  "home-videos/thumbnails/": {
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: 5 * 1024 * 1024,
  },
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const rule = Object.entries(UPLOAD_RULES).find(([prefix]) =>
          pathname.startsWith(prefix)
        )?.[1];

        if (!rule) {
          throw new Error("Invalid upload destination.");
        }

        return {
          allowedContentTypes: rule.contentTypes,
          maximumSizeInBytes: rule.maxSizeBytes,
          // Caller (HomeVideoForm.tsx) already builds the pathname with
          // its own crypto.randomUUID() -- same collision-avoidance
          // reasoning as every other upload in this project (see
          // lib/admin/product-images.ts's own comment). A second random
          // suffix layered on top here would just make the uploaded
          // pathname not match what the client thinks it uploaded.
          addRandomSuffix: false,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 }
    );
  }
}
