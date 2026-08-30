import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { REVALIDATE_SECONDS } from "@/lib/config";
import {
  PRIVATE_LABEL_IMAGE_SLOTS,
  type PrivateLabelImageSlot,
} from "@/types/admin-private-label";

// Its own file, not folded into lib/catalog.ts/lib/pages.ts -- the
// Private Label page's images are a distinct content type (fixed admin-
// managed image slots for one specific custom page), unrelated to the
// product catalog or the generic Pages CMS. Same reasoning as
// lib/pages.ts/lib/admin/site-settings.ts each getting their own file.

export type PrivateLabelImageMap = Record<PrivateLabelImageSlot, string | null>;

/**
 * Every slot's public URL, or null if nothing's been uploaded for it yet
 * -- the public page (components/private-label/*) must render a
 * graceful placeholder for a null entry, never a broken <img>, same
 * convention as every other Storage-backed image in this project.
 *
 * Tagged "private_label_images" -- the admin's updatePrivateLabelImageAction
 * (app/admin/(dashboard)/private-label/actions.ts) calls
 * updateTag("private_label_images") on every successful upload,
 * invalidating this read on demand.
 */
export async function getPrivateLabelImageMap(): Promise<PrivateLabelImageMap> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.marketing, [
    "private_label_images",
  ]);
  const { data, error } = await supabase
    .from("private_label_images")
    .select("slot, storage_path");

  // Built FROM the single slots array (types/admin-private-label.ts),
  // not a hand-maintained duplicate of it -- Prompt 93 added an 8th slot
  // ("experience") by extending that ONE array; this map picks it up
  // automatically instead of needing a matching manual edit here too.
  const map = Object.fromEntries(
    PRIVATE_LABEL_IMAGE_SLOTS.map((slot) => [slot, null])
  ) as PrivateLabelImageMap;

  if (error || !data) return map;

  for (const row of data as { slot: string; storage_path: string | null }[]) {
    if (!(PRIVATE_LABEL_IMAGE_SLOTS as readonly string[]).includes(row.slot)) {
      continue;
    }
    const slot = row.slot as PrivateLabelImageSlot;
    map[slot] = row.storage_path
      ? getPublicStorageUrl("private-label-images", row.storage_path)
      : null;
  }

  return map;
}
