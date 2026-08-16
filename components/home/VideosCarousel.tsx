"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

type CarouselVideo = {
  id: string;
  videoUrl: string | null;
  externalUrl: string | null;
  posterUrl: string | null;
  caption_en: string | null;
  caption_ar: string | null;
};

// CONFIRMED from the reference site (re-fetched shop-gulforchid.com,
// inspected its "vikst-ugc" section directly — a horizontally-scrolling
// row of video cards under the heading "World Wide Experts had their
// say"):
//   - Videos are muted/looping and autoplay via IntersectionObserver when
//     a card is >=60% visible in the scroll viewport, and pause when
//     scrolled out — NOT click-to-play, NOT a static thumbnail-only link.
//   - Per-card mute/unmute button, bottom-right, EXCLUSIVE (unmuting one
//     video mutes+pauses every other one).
//   - Navigation: native touch/drag scroll with CSS scroll-snap + dot
//     indicators that track scroll position. An arrow-button feature
//     exists in the underlying app's CSS/JS but is permanently
//     `display:none` in this merchant's live config (same pattern already
//     found for the Hero banner in Prompt 8) — replicated here as
//     dots-only, no arrows.
//   - Card width: ~40% of the container on mobile (~2.5 visible), ~25% on
//     desktop (~4 visible at once) — this is where the "4 videos shown"
//     framing comes from; the reference's actual total is 11 slides, not
//     4, so this is a per-viewport visible count, not a hard cap. Video
//     count here is fully dynamic (any number of rows), matching that.
//
// Shape: matches the reference's own confirmed values exactly —
// aspect-ratio 9/16 + border-radius:999px on that tall rectangle, which is
// what actually produces the stadium/pill shape (a border-radius large
// enough to fully round a non-square box doesn't make it a circle, it
// makes a pill). Desktop height is additionally capped at 500px
// (--vikst-ugc-maxH-d in the reference), same reasoning: at wide
// containers a strict 9:16 box would otherwise get too tall: the cap
// still relies on object-cover to crop the video sensibly once the box
// is shorter than a true 9:16 ratio, matching how the reference itself
// behaves at wide viewports. (Earlier revision of this component used
// true circles per the client's originally stated "circular" framing;
// superseded by this prompt's explicit decision to match the reference.)
//
// Also NOT replicated: reference hides its caption/meta area entirely
// (`.vikst-ugc__meta{display:none}` in its own CSS), so there's no
// confirmed visual pattern to copy for caption placement — the small
// centered caption below each circle here is this project's own design
// choice, not extracted from the reference.

function localizedCaption(
  video: CarouselVideo,
  locale: string
): string | null {
  const primary = (locale === "ar" ? video.caption_ar : video.caption_en)?.trim();
  const fallback = (locale === "ar" ? video.caption_en : video.caption_ar)?.trim();
  const value = primary || fallback || "";
  return value.length > 0 ? value : null;
}

function MuteIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 9l4 6M20 9l-4 6" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.5 8.5a5 5 0 010 7M18 6a9 9 0 010 12"
      />
    </svg>
  );
}

export default function VideosCarousel({ videos }: { videos: CarouselVideo[] }) {
  const locale = useLocale();
  const t = useTranslations("Videos");
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [unmutedId, setUnmutedId] = useState<string | null>(null);

  // Autoplay-on-visible, matching the reference's confirmed threshold.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = cardRefs.current.findIndex((el) => el === entry.target);
          if (index === -1) continue;
          const video = videoRefs.current[index];

          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setActiveIndex(index);
            video?.play().catch(() => {});
          } else {
            video?.pause();
          }
        }
      },
      { root: track, threshold: [0, 0.6, 1] }
    );

    for (const el of cardRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [videos.length]);

  const goToSlide = (index: number) => {
    cardRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  const toggleMute = (id: string, index: number) => {
    const video = videoRefs.current[index];
    if (!video) return;
    // Exclusive: unmuting this one mutes every other one — matches the
    // reference exactly.
    videoRefs.current.forEach((otherVideo, otherIndex) => {
      if (otherVideo && otherIndex !== index) otherVideo.muted = true;
    });
    video.muted = !video.muted;
    setUnmutedId(video.muted ? null : id);
  };

  return (
    <div>
      <div
        ref={trackRef}
        className="grid auto-cols-[40%] grid-flow-col gap-3.5 overflow-x-auto snap-x snap-mandatory py-4 [-ms-overflow-style:none] [scrollbar-width:none] md:auto-cols-[25%] [&::-webkit-scrollbar]:hidden"
      >
        {videos.map((video, index) => {
          const caption = localizedCaption(video, locale);
          const isUnmuted = unmutedId === video.id;

          return (
            <div
              key={video.id}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="flex snap-center flex-col items-center"
            >
              <div className="relative aspect-9/16 w-full max-h-125 overflow-hidden rounded-full shadow-[0_10px_26px_rgba(0,0,0,0.10)] ring-8 ring-inset ring-brand-gold">
                {video.videoUrl ? (
                  <>
                    <video
                      ref={(el) => {
                        videoRefs.current[index] = el;
                        // Set imperatively, not as a JSX prop: React
                        // re-asserting `muted` on every render would fight
                        // toggleMute's later mutation of the same
                        // property (a well-known React/<video> gotcha).
                        if (el) el.muted = true;
                      }}
                      src={video.videoUrl}
                      poster={video.posterUrl ?? undefined}
                      loop
                      playsInline
                      preload="metadata"
                      className="h-full w-full cursor-pointer object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => toggleMute(video.id, index)}
                      aria-label={isUnmuted ? t("mute") : t("unmute")}
                      className="absolute bottom-2.5 end-2.5 flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-black/80 text-brand-white transition-colors hover:bg-brand-black"
                    >
                      <MuteIcon muted={!isUnmuted} />
                    </button>
                  </>
                ) : video.externalUrl ? (
                  <a
                    href={video.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="relative flex h-full w-full items-center justify-center bg-brand-black"
                  >
                    {video.posterUrl ? (
                      <Image
                        src={video.posterUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 25vw, 40vw"
                        className="object-cover"
                      />
                    ) : null}
                    <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-white/90 text-brand-black">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-0.5" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </a>
                ) : null}
              </div>

              {caption ? (
                <p className="mt-3 max-w-[200px] text-center text-sm text-brand-gray">
                  {caption}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {videos.length > 1 ? (
        <div className="mt-2 flex justify-center gap-3">
          {videos.map((video, index) => (
            <button
              key={video.id}
              type="button"
              aria-label={t("slideLabel", { number: index + 1 })}
              aria-current={index === activeIndex}
              onClick={() => goToSlide(index)}
              className={
                "h-1.5 rounded-full border-2 border-brand-black transition-all " +
                (index === activeIndex
                  ? "w-8 bg-brand-black"
                  : "w-1.5 bg-transparent opacity-50")
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
