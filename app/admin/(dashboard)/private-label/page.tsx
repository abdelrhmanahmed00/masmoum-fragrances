import type { Metadata } from "next";
import { createSessionClient } from "@/lib/supabase/server";
import { getPrivateLabelImages } from "@/lib/admin/private-label-images";
import PrivateLabelImageSlotForm from "@/components/admin/PrivateLabelImageSlotForm";
import { PRIVATE_LABEL_IMAGE_SLOTS } from "@/types/admin-private-label";

export const metadata: Metadata = {
  title: "Private Label Page — Masmoum Admin",
  robots: { index: false, follow: false },
};

// Labels shown to the admin, English-only (admin is English-only per
// Prompt 21) -- deliberately NOT the same strings as the public page's
// PrivateLabel.tile1..tile6 translation keys, which are the actual
// visitor-facing captions: this label just identifies WHICH slot the
// admin is uploading to, matching HeroSlideForm.tsx's own precedent of
// plain English admin-facing labels distinct from public copy.
const SLOT_LABELS: Record<string, string> = {
  hero: "Hero Image (top banner)",
  // Prompt 93 (Phase 2) -- the large image alongside the "Built On Real
  // Manufacturing Experience" headline + bullet list section.
  experience: "Experience Section Image (headline + bullet list)",
  // Prompt 94 (Phase 3) -- one large image per 3-column feature block.
  block_a:
    "Feature Block A Image — Private Label Perfumes / Creative Design & Packaging / Quality in Manufacturing",
  block_b:
    "Feature Block B Image — Private Label Expertise / Custom Fragrance Design / Premium Manufacturing",
  // Prompt 96 (Phase 5, FINAL) -- the closing CTA band's background
  // photo. This section always renders (solid black band, gracefully) --
  // this slot only adds the dark-overlaid photo behind it.
  cta_background: "Closing CTA Background Image (dark overlay band)",
  // Prompt 101 -- the 6 grid-tile slots (Grid Tile 1-6) were removed
  // here: the 6-tile grid section was deleted from the public page
  // entirely, per client request.
};

export default async function AdminPrivateLabelPage() {
  const supabase = await createSessionClient();
  const rows = await getPrivateLabelImages(supabase);
  const byslot = new Map(rows.map((r) => [r.slot, r.storage_path]));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">
        Private Label Page — Images
      </h1>
      <p className="mt-1 text-sm text-brand-gray">
        The hero banner, the experience section image, the two feature
        block images, and the closing CTA background photo shown on the
        public /private-label page. Each slot always has SOME image
        rendered publicly (a graceful placeholder until one is uploaded
        here) -- replacing an image below updates it immediately.
      </p>

      <div className="mt-6 space-y-3">
        {PRIVATE_LABEL_IMAGE_SLOTS.map((slot) => (
          <PrivateLabelImageSlotForm
            key={slot}
            slot={slot}
            label={SLOT_LABELS[slot]}
            currentStoragePath={byslot.get(slot) ?? null}
          />
        ))}
      </div>
    </div>
  );
}
