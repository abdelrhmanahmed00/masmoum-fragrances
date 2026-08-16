"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type GalleryImage = { url: string; sortOrder: number };

// CONFIRMED from the reference site (re-fetched shop-gulforchid.com/
// products/belgravia and inspected its <media-gallery> markup directly):
//   - Desktop: a thumbnail strip (their "nav-swiper-container", ~70px
//     items) alongside the main image, which itself is a swiper with
//     prev/next arrow buttons and image zoom enabled
//     (data-enable-image-zoom="true").
//   - Mobile: swipeable main image + dot pagination (swiper-pagination),
//     NO thumbnail strip at all.
//   - A product with only one image renders the thumbnail nav with a
//     single item — but since there's nothing to switch between, hiding
//     the strip entirely for a single image is the more correct
//     behavior than the reference's own (which still repeats one static
//     thumbnail below the same-looking main image), and matches this
//     task's explicit "handle 1 image gracefully" requirement.
//
// NOT replicated: click/pinch-to-zoom (a "Zoom in" tooltip button is
// confirmed present on the reference) and the desktop prev/next arrow
// buttons — deliberately out of scope for this pass given zero real
// product images exist yet to validate a zoom implementation against;
// thumbnails + swipe + dots already cover the core confirmed navigation
// pattern. Flagging this as a known simplification, not an oversight.
export default function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || images.length <= 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const index = slideRefs.current.findIndex((el) => el === entry.target);
            if (index !== -1) setActiveIndex(index);
          }
        }
      },
      { root: track, threshold: [0.6] }
    );

    for (const el of slideRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-card bg-brand-surface text-brand-gray">
        <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5V6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1zm0 0l6-6 4 4 3-3 5 5"
          />
          <circle cx="8" cy="8" r="1.5" />
        </svg>
      </div>
    );
  }

  const goToSlide = (index: number) => {
    setActiveIndex(index);
    slideRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  return (
    <div>
      <div
        ref={trackRef}
        className="flex aspect-square w-full snap-x snap-mandatory overflow-x-auto rounded-card bg-brand-surface [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((img, index) => (
          <div
            key={img.url}
            ref={(el) => {
              slideRefs.current[index] = el;
            }}
            className="relative h-full w-full flex-none snap-center"
          >
            <Image
              src={img.url}
              alt={productName}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              priority={index === 0}
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {images.length > 1 ? (
        <>
          {/* Desktop thumbnail strip */}
          <div className="mt-3 hidden gap-2 md:flex">
            {images.map((img, index) => (
              <button
                key={img.url}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`${index + 1}`}
                aria-current={index === activeIndex}
                className={
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-btn border-2 transition-colors " +
                  (index === activeIndex
                    ? "border-brand-black"
                    : "border-brand-border")
                }
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>

          {/* Mobile dots */}
          <div className="mt-3 flex justify-center gap-2 md:hidden">
            {images.map((_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={
                  "h-1.5 w-1.5 rounded-full transition-colors " +
                  (index === activeIndex ? "bg-brand-black" : "bg-brand-border")
                }
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
