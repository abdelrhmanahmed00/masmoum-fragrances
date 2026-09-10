import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { REVALIDATE_SECONDS } from "@/lib/config";
import {
  PERFUME_GENDER_SLOTS,
  type PerfumeGenderSlot,
} from "@/types/admin-perfume-gender";

// Its own file, not folded into lib/catalog.ts -- same reasoning as
// lib/private-label.ts getting its own file: this is a distinct content
// type (3 fixed admin-managed image slots for one specific sub-template),
// unrelated to the product catalog's own dynamic category/brand/product
// data.

export type PerfumeGenderImageMap = Record<PerfumeGenderSlot, string | null>;

/**
 * Every slot's public URL, or null if nothing's been uploaded for it yet
 * -- the public sub-template must render a graceful placeholder for a
 * null entry, never a broken <img>, same convention as every other
 * Storage-backed image in this project (see PerfumeGenderTemplate.tsx).
 *
 * Tagged "perfume_gender_images" -- the admin's
 * updatePerfumeGenderImageAction calls updateTag("perfume_gender_images")
 * on every successful upload, invalidating this read on demand. Uses
 * REVALIDATE_SECONDS.category (same window as the category page itself,
 * lib/catalog.ts), not .marketing -- this content IS category-page
 * content (unlike Private Label's own .marketing window), so it should
 * share that page's own freshness budget, not a different one.
 */
export async function getPerfumeGenderImageMap(): Promise<PerfumeGenderImageMap> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.category, [
    "perfume_gender_images",
  ]);
  const { data, error } = await supabase
    .from("perfume_gender_images")
    .select("slot, storage_path");

  // Built FROM the single slots array (types/admin-perfume-gender.ts),
  // not a hand-maintained duplicate of it -- same discipline as
  // getPrivateLabelImageMap's own comment.
  const map = Object.fromEntries(
    PERFUME_GENDER_SLOTS.map((slot) => [slot, null])
  ) as PerfumeGenderImageMap;

  if (error || !data) return map;

  for (const row of data as { slot: string; storage_path: string | null }[]) {
    if (!(PERFUME_GENDER_SLOTS as readonly string[]).includes(row.slot)) {
      continue;
    }
    const slot = row.slot as PerfumeGenderSlot;
    map[slot] = row.storage_path
      ? getPublicStorageUrl("perfume-gender-images", row.storage_path)
      : null;
  }

  return map;
}
