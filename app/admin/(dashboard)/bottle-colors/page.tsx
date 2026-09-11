import type { Metadata } from "next";
import { createSessionClient } from "@/lib/supabase/server";
import { getBottleColorImages } from "@/lib/admin/bottle-color-images";
import BottleColorImageSlotForm from "@/components/admin/BottleColorImageSlotForm";
import { BOTTLE_COLOR_SLOTS } from "@/types/admin-bottle-colors";

export const metadata: Metadata = {
  title: "Bottle Colors — Masmoum Admin",
  robots: { index: false, follow: false },
};

// Labels shown to the admin, English-only (admin is English-only per
// Prompt 21) -- same "plain English admin-facing label" precedent as
// every other fixed-slot admin page's own SLOT_LABELS.
const SLOT_LABELS: Record<string, string> = {
  yellow: "Yellow Cap",
  blue: "Blue Cap",
  fuchsia: "Fuchsia Cap",
  pink: "Pink Cap",
  green: "Green Cap",
};

export default async function AdminBottleColorsPage() {
  const supabase = await createSessionClient();
  const rows = await getBottleColorImages(supabase);
  const bySlot = new Map(rows.map((r) => [r.slot, r.storage_path]));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">
        Custom Bottle Designer — Bottle Colors
      </h1>
      <p className="mt-1 text-sm text-brand-gray">
        The 5 pre-colored bottle images (transparent glass, only the cap
        color differs) used by the customer-facing bottle designer. Each
        slot always has SOME image rendered on that page once it&apos;s
        built (a graceful placeholder until an image is uploaded here) --
        replacing an image below updates it immediately.
      </p>

      <div className="mt-6 space-y-3">
        {BOTTLE_COLOR_SLOTS.map((slot) => (
          <BottleColorImageSlotForm
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
