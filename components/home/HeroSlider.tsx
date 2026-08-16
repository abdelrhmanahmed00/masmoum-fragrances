"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { HeroSlide } from "@/types/hero";

type SlideWithUrl = HeroSlide & { imageUrl: string };

// Confirmed from the reference site (shop-gulforchid.com), re-fetched and
// inspected directly rather than assumed:
//   - --vikst-autoplay: 5  -> 5 second interval
//   - .vikst-banner__track: display:flex; overflow-x:auto;
//     scroll-snap-type:x mandatory; scroll-behavior:smooth  -> a native
//     horizontal SLIDE via CSS scroll-snap, not an opacity fade
//   - .vikst-banner__viewport.is-pauseable -> autoplay pauses on
//     hover/interaction
//   - Nav dots present (.vikst-banner__dots, one per slide, .is-active on
//     current); an .vikst-banner__arrow CSS class exists in the theme's
//     stylesheet but NO arrow <button> elements are actually rendered in
//     the live page — only dots. Replicated as dots-only here to match
//     what's actually live, not the theme's unused capability.
//   - Fixed heights: 750px desktop / 392px mobile, object-fit: cover
//   - First image loading="eager" fetchpriority="high", rest lazy
//
// NOT confirmed on the reference's current live slides: none of its 4
// live banners actually use text/CTA overlays (each is just a full-bleed
// clickable image) — but the theme's own CSS does define
// .vikst-banner__heading/__body/__btn overlay classes as a supported
// feature, just unused in the current campaign. Our hero_slides schema
// requires headline/subheadline/CTA support (per Prompt 7 + this task), so
// that capability is built here using the same overlay positioning
// pattern confirmed in the reference's stylesheet, rendered only when a
// slide actually has that content (see `hasContent` below).
const AUTOPLAY_INTERVAL_MS = 5000;

function localized(
  en: string | null,
  ar: string | null,
  locale: string
): string | null {
  const primary = (locale === "ar" ? ar : en)?.trim();
  const fallback = (locale === "ar" ? en : ar)?.trim();
  const value = primary || fallback || "";
  return value.length > 0 ? value : null;
}

export default function HeroSlider({ slides }: { slides: SlideWithUrl[] }) {
  const locale = useLocale();
  const t = useTranslations("Hero");
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToSlide = useCallback((index: number) => {
    // scrollIntoView's `inline: "start"` resolves against the element's
    // writing direction, so this slides correctly in both LTR and RTL
    // without hand-rolled scrollLeft math.
    slideRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  }, []);

  // Autoplay — pauses on hover/touch, matching the reference's
  // "is-pauseable" viewport.
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const id = setInterval(() => {
      goToSlide((activeIndex + 1) % slides.length);
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [activeIndex, isPaused, slides.length, goToSlide]);

  // Tracks whichever slide is actually in view, including manual
  // swipe/scroll (not just autoplay-driven changes), to keep the active
  // dot accurate.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || slides.length <= 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const index = slideRefs.current.findIndex(
              (el) => el === entry.target
            );
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
  }, [slides.length]);

  return (
    <section
      className="relative isolate"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
    >
      <div
        ref={trackRef}
        className="flex h-[392px] snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] md:h-[750px] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => {
          const headline = localized(
            slide.headline_en,
            slide.headline_ar,
            locale
          );
          const subheadline = localized(
            slide.subheadline_en,
            slide.subheadline_ar,
            locale
          );
          const ctaLabel = localized(
            slide.cta_label_en,
            slide.cta_label_ar,
            locale
          );
          const hasContent = Boolean(
            headline || subheadline || (ctaLabel && slide.cta_href)
          );

          return (
            <div
              key={slide.id}
              ref={(el) => {
                slideRefs.current[index] = el;
              }}
              className="relative h-full w-full flex-none snap-start"
            >
              <Image
                src={slide.imageUrl}
                alt={headline ?? ""}
                fill
                sizes="100vw"
                priority={index === 0}
                loading={index === 0 ? undefined : "lazy"}
                className="object-cover"
              />

              {hasContent ? (
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-brand-black/60 via-transparent to-transparent md:items-center">
                  <div className="max-w-xl space-y-3 px-6 pb-10 text-start text-brand-white md:px-16 md:pb-0">
                    {headline ? (
                      <h1 className="text-2xl font-medium md:text-5xl">
                        {headline}
                      </h1>
                    ) : null}
                    {subheadline ? (
                      <p className="text-sm md:text-lg">{subheadline}</p>
                    ) : null}
                    {ctaLabel && slide.cta_href ? (
                      <a
                        href={slide.cta_href}
                        className="mt-2 inline-block rounded-btn bg-brand-white px-6 py-2.5 text-sm font-medium text-brand-black transition-colors hover:bg-brand-gold"
                      >
                        {ctaLabel}
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={t("slideLabel", { number: index + 1 })}
              aria-current={index === activeIndex}
              onClick={() => goToSlide(index)}
              className={
                "h-1.5 w-1.5 rounded-full transition-colors " +
                (index === activeIndex
                  ? "bg-brand-white"
                  : "bg-brand-white/50")
              }
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
