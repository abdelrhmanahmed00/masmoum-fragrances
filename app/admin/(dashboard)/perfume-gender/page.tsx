import type { Metadata } from "next";
import { createSessionClient } from "@/lib/supabase/server";
import { getPerfumeGenderImages } from "@/lib/admin/perfume-gender-images";
import PerfumeGenderImageSlotForm from "@/components/admin/PerfumeGenderImageSlotForm";
import { PERFUME_GENDER_SLOTS } from "@/types/admin-perfume-gender";

export const metadata: Metadata = {
  title: "Perfumes Gender Tiles — Masmoum Admin",
  robots: { index: false, follow: false },
};

// Labels shown to the admin, English-only (admin is English-only per
// Prompt 21) -- same "plain English admin-facing label, distinct from
// the public tile's own locale-aware caption" precedent as
// app/admin/(dashboard)/private-label/page.tsx's own SLOT_LABELS.
const SLOT_LABELS: Record<string, string> = {
  men: "Men Tile",
  women: "Women Tile",
  unisex: "Unisex Tile",
  kids: "Kids Tile",
};

export default async function AdminPerfumeGenderPage() {
  const supabase = await createSessionClient();
  const rows = await getPerfumeGenderImages(supabase);
  const bySlot = new Map(rows.map((r) => [r.slot, r.storage_path]));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">
        Perfumes Category — Gender Tiles
      </h1>
      <p className="mt-1 text-sm text-brand-gray">
        The 4 large tile images (Men / Women / Unisex / Kids) shown on
        /categories/perfumes before a visitor picks a gender. Each slot
        always has SOME tile rendered publicly (a graceful placeholder
        until an image is uploaded here) -- replacing an image below
        updates it immediately.
      </p>

      <div className="mt-6 space-y-3">
        {PERFUME_GENDER_SLOTS.map((slot) => (
          <PerfumeGenderImageSlotForm
            key={slot}
            slot={slot}
            label={SLOT_LABELS[slot]}
            currentStoragePath={bySlot.get(slot) ?? null}
          />
        ))}
      </div>
    </div>
  );
}
