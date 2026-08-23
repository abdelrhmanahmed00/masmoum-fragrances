"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HeroSlide } from "@/types/hero";

type SlideWithUrl = HeroSlide & { imageUrl: string };

// Confirmed from the reference site (shop-gulforchid.com), re-fetched and
// inspected directly rather than assumed:
//   - --vikst-autoplay: 5  -> 5 second interval (Prompt 36: client
//     explicitly wants 3s instead -- see AUTOPLAY_INTERVAL_MS below, a
//     deliberate deviation from the reference, not a bug)
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
// Prompt 36: changed from 5000 (the reference site's confirmed value) to
// 3000 per explicit client request -- a deliberate deviation, not a
// correction. Pause-on-hover/touch (isPaused, below) is untouched and
// fully independent of this value -- it just changes how often the
// autoplay effect's setInterval fires while NOT paused.
const AUTOPLAY_INTERVAL_MS = 3000;

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
    // without hand-rolled scrollLeft math -- kept exactly as before.
    //
    // Prompt 38 bug fix: confirmed by re-reading this exact call (not
    // assumed) that `block: "nearest"` is NOT enough to keep this
    // horizontal-only. scrollIntoView() walks the FULL chain of
    // scrollable ancestors, not just trackRef's own horizontal overflow
    // container -- `block` only controls how much it moves the vertical
    // axis of each of those ancestors, including the page itself
    // (window/document), it does not skip vertical scrolling entirely.
    // Once the Hero has scrolled off-screen (e.g. the visitor is reading
    // the Videos section further down), this slide <div> is no longer
    // vertically visible in the page's own scroll container either, so
    // "nearest" pulls the WHOLE PAGE back up just enough to make it
    // visible again -- exactly the reported "jumps back to Hero" bug,
    // firing every AUTOPLAY_INTERVAL_MS regardless of where the visitor
    // has scrolled to. There is no native ScrollIntoViewOptions flag to
    // scope this to a single ancestor.
    //
    // Fix: capture the page's own scroll position immediately before the
    // call and restore it immediately after, instantly (no animation).
    // scrollIntoView still handles the horizontal track scroll exactly as
    // before (smooth, RTL-correct via `inline: "start"`); any incidental
    // vertical (or horizontal, for symmetry/defense-in-depth) scroll it
    // also triggers on the page gets snapped back before the next paint.
    // When the Hero IS on-screen, "nearest" already does nothing
    // vertically, so scrollX/scrollY are unchanged and this restore is a
    // harmless no-op -- the fix only has an effect in the buggy case.
    const { scrollX, scrollY } = window;
    slideRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
    window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
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
    // Prompt 72: pt-header-offset -- the header floating transparently
    // OVER the Hero (Prompts 56/57's original premise, why the homepage
    // was excluded from this token through Prompt 70) no longer applies:
    // Prompt 67 made the header a solid gold bar, and the client
    // confirmed it physically covering the top of the Hero image is
    // wrong, not a look to preserve. Applied directly to this component's
    // own root -- no new wrapper needed, this <section> already has no
    // fixed height of its own (only the track div below it does), so
    // padding-top here simply pushes the whole slider (track included)
    // down by the offset without shrinking or squeezing the track's own
    // h-[392px]/md:h-[750px], which stays exactly its designed size,
    // just starting lower. Same reasoning does NOT carry over unchanged
    // to HeroEmptyState.tsx -- see that file's own comment for why it
    // needs a wrapper instead.
    //
    // Prompt 73: pt-header-offset lg:pt-header-offset-lg (not a single
    // flat value) -- the header's real rendered height genuinely differs
    // between mobile (73px, taller hamburger icon) and desktop (69px,
    // no hamburger, tallest element is the Search icon button instead).
    // Both values are the EXACT computed height with no added safety
    // margin -- see globals.css's own comment for the full arithmetic
    // and why the previous rounded-up value produced a visible gap.
    //
    // Static offset vs. the header's hide-on-scroll (Prompt 70): kept
    // static, deliberately not made dynamic. Once a visitor has scrolled
    // far enough for the header to hide, they're already well past the
    // Hero entirely (this offset only matters for the very top of the
    // page) -- the fixed 96px band simply becomes a normal part of the
    // page's scrolled-past content at that point, identical in kind to
    // the gap every other pt-header-offset page already has above ITS
    // own content while scrolled down with the header hidden (Prompt 70
    // introduced that property everywhere this token is used, not just
    // here). Making the offset shrink/grow in sync with header
    // visibility would require this Server Component's static padding
    // to react to client-only scroll state, which doesn't exist yet at
    // render time and would need prop-drilling scroll state down from a
    // client wrapper for a gap that's only ever visible for the first
    // ~100px of a page a visitor is actively scrolling away from --
    // solving a problem that isn't actually visible in practice.
    <section
      className="relative isolate pt-header-offset lg:pt-header-offset-lg"
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

              {/* Prompt 58: this overlay now renders UNCONDITIONALLY on
                  every slide -- it used to be gated behind `hasContent`
                  (headline/subheadline/per-slide-CTA all null skipped it
                  entirely), but the fixed "Shop Now" button below is
                  site-wide, always-real content, so there's no longer a
                  slide state where this area has nothing to show. The
                  per-slide headline/subheadline/CTA are each still
                  independently conditional exactly as before -- only the
                  OUTER hasContent gate was removed, not their own
                  individual `? ... : null` checks. */}
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
                  {/* Fixed "Shop Now" -- always present, additive to (not
                      a replacement for) the per-slide CTA above; both can
                      render together when a slide has its own. Locale-
                      aware Link (not a raw <a>, unlike the per-slide CTA
                      above, which is arbitrary admin-supplied href) --
                      /products is a real internal route, so this needs
                      next-intl's own routing to resolve to /en/products
                      or /ar/products correctly.

                      Prompt 68: restyled again, this time to match the
                      header's now-FINAL gold/black language (Prompt 67 --
                      solid gold background, black border/text at rest,
                      inverts to solid black background with gold text on
                      hover, reusing the Quote pill's exact pattern
                      verbatim from HeaderClient.tsx, not a new
                      interpretation). This REPLACES Prompt 59's dark-
                      glass/backdrop-blur restyle entirely, for the same
                      reason the header pills themselves dropped
                      translucency (Prompt 64/67): a solid background
                      doesn't need glass richness to read well against
                      whatever's behind it (Hero photography here, same
                      as the header bar's own reasoning) -- so the
                      two-layer gradient-border-wrapper + backdrop-blur
                      structure Prompt 59 built is gone, collapsed to a
                      single flat element the same way the header's own
                      Quote pill is a single element, not a wrapper.
                      One real difference from Quote: Quote has NO
                      background of its own at rest (it sits directly on
                      the header's already-gold bar) -- this button has
                      nothing gold behind it (it floats on Hero
                      photography), so it needs bg-brand-gold explicitly
                      here rather than relying on ambient context, exactly
                      matching this task's own spec ("solid brand-gold
                      background... at rest", distinct from Quote's
                      border-only rest state).
                      Size/shape (px-8/py-3, rounded-full) kept exactly as
                      Prompt 58/59 left them -- this prompt is a color/
                      surface restyle only, not a dimensions change. */}
                  <Link
                    href="/products"
                    className="mt-2 inline-block rounded-full border border-brand-black/60 bg-brand-gold px-8 py-3 text-sm font-medium text-brand-black shadow-lg transition-colors hover:border-brand-black hover:bg-brand-black hover:text-brand-gold"
                  >
                    {t("shopNow")}
                  </Link>
                </div>
              </div>
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
