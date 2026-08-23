import type { Metadata } from "next";
import Link from "next/link";
import { createSessionClient } from "@/lib/supabase/server";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { getHeroSlides } from "@/lib/admin/hero-slides";
import DeleteHeroSlideButton from "@/components/admin/DeleteHeroSlideButton";

export const metadata: Metadata = {
  title: "Hero Slides — Masmoum Admin",
  robots: { index: false, follow: false },
};

// Card/grid layout, not a <table> like categories/collections/products'
// list pages -- deliberate deviation, not an inconsistency: this is a
// small (realistically single-digit), image-forward list where the
// thumbnail IS the primary way to identify a row, unlike categories/
// collections/products where the name is. A table would either omit the
// thumbnail (losing the most useful identifying info) or need an
// awkward, cramped image column; a card shows it at a reasonable size
// alongside the same actions a table row would have.
export default async function AdminHeroSlidesPage() {
  const supabase = await createSessionClient();
  const slides = await getHeroSlides(supabase);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-black">
          Hero Slides
        </h1>
        <Link
          href="/admin/hero-slides/new"
          className="rounded-btn border border-brand-black bg-brand-black px-4 py-2 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
        >
          Add Slide
        </Link>
      </div>

      {slides.length === 0 ? (
        <p className="mt-8 text-sm text-brand-gray">
          No slides yet -- the homepage is showing its empty-state
          fallback until at least one active slide exists.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slides.map((slide) => {
            const label = slide.headline_en || slide.headline_ar || "Untitled slide";
            return (
              <div
                key={slide.id}
                className="overflow-hidden rounded-card border border-brand-border bg-brand-white"
              >
                <div className="relative aspect-video bg-brand-surface">
                  {/* Plain <img>, not next/image -- see HeroSlideForm.tsx's
                      own comment for the same reasoning (small admin-only
                      preview). */}
                  <img
                    src={getPublicStorageUrl("hero-images", slide.storage_path)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <span
                    className={
                      "absolute start-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium " +
                      (slide.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-brand-white/90 text-brand-gray")
                    }
                  >
                    {slide.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-2 p-4">
                  <div>
                    <p className="font-medium text-brand-black">
                      {slide.headline_en || (
                        <span className="text-brand-gray italic">
                          No headline
                        </span>
                      )}
                    </p>
                    {slide.headline_ar ? (
                      <p className="text-xs text-brand-gray" dir="rtl">
                        {slide.headline_ar}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-xs text-brand-gray">
                    Sort order: {slide.sort_order}
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <Link
                      href={`/admin/hero-slides/${slide.id}/edit`}
                      className="text-sm text-brand-black underline-offset-2 hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteHeroSlideButton id={slide.id} label={label} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
