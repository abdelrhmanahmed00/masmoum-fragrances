import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { REVALIDATE_SECONDS } from "@/lib/config";
import {
  BOTTLE_COLOR_SLOTS,
  type BottleColorSlot,
} from "@/types/admin-bottle-colors";

// Its own file, not folded into lib/catalog.ts -- same reasoning as
// lib/private-label.ts / lib/perfume-gender.ts each getting their own
// file: this is a distinct content type (5 fixed admin-managed image
// slots for one specific custom tool page), unrelated to the product
// catalog's own dynamic category/brand/product data.

export type BottleColorImageMap = Record<BottleColorSlot, string | null>;

/**
 * Every slot's public URL, or null if nothing's been uploaded for it yet
 * -- the public /design-your-bottle page must render a graceful
 * placeholder for a null entry, never a broken <img>, same convention as
 * every other Storage-backed image in this project.
 *
 * Tagged "bottle_color_images" -- the admin's
 * updateBottleColorImageAction (Phase 1) calls
 * updateTag("bottle_color_images") on every successful upload,
 * invalidating this read on demand. REVALIDATE_SECONDS.marketing (not
 * .category) -- this is a standalone tool/marketing page, not product-
 * catalog content, same window PrivateLabelPage's own
 * getPrivateLabelImageMap-adjacent reads use.
 */
export async function getBottleColorImageMap(): Promise<BottleColorImageMap> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.marketing, [
    "bottle_color_images",
  ]);
  const { data, error } = await supabase
    .from("bottle_color_images")
    .select("slot, storage_path");

  // Built FROM the single slots array (types/admin-bottle-colors.ts), not
  // a hand-maintained duplicate of it -- same discipline as
  // getPrivateLabelImageMap's/getPerfumeGenderImageMap's own comment.
  const map = Object.fromEntries(
    BOTTLE_COLOR_SLOTS.map((slot) => [slot, null])
  ) as BottleColorImageMap;

  if (error || !data) return map;

  for (const row of data as { slot: string; storage_path: string | null }[]) {
    if (!(BOTTLE_COLOR_SLOTS as readonly string[]).includes(row.slot)) {
      continue;
    }
    const slot = row.slot as BottleColorSlot;
    map[slot] = row.storage_path
      ? getPublicStorageUrl("bottle-color-images", row.storage_path)
      : null;
  }

  return map;
}
