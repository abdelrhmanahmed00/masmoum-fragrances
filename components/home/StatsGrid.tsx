"use client";

import { useEffect, useRef, useState } from "react";

export type StatItem = {
  id: string;
  /** The count-up target. Locale-invariant (this project displays digits
   *  in Western numerals in both locales, same convention already used
   *  by e.g. HeroSlider's "Slide {number}"/VideosCarousel's "Video
   *  {number}" aria-labels -- confirmed via those components' own real
   *  rendered output, not assumed). */
  value: number;
  /** "+" or "%" -- kept as plain config, not translated text, since it's
   *  not language-dependent either. */
  suffix: string;
  title: string;
  description: string;
};

const ANIMATION_DURATION_MS = 1500;

// Standard ease-out cubic -- fast start, settles gently into the final
// value instead of stopping abruptly (a linear count feels mechanical;
// pure ease-in would feel like it's still accelerating right as it
// stops). This is a purely cosmetic timing curve, unrelated to the
// project's Prompt 70 "linear only, for a seamless CSS loop" rule --
// that constraint was specific to an INFINITE, looping CSS animation
// needing an imperceptible seam; this is a one-shot, finite JS
// animation with a real start and end, where an eased curve is the
// standard, better-looking choice.
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** One stat's own count-up state, driven by `shouldStart` flipping to
 *  true (once, from the parent's IntersectionObserver -- see
 *  StatsGrid below). requestAnimationFrame-driven, same "compositor/
 *  frame-synced, not setInterval" discipline as Prompt 70's scroll
 *  handling, though this one directly recomputes a DOM-rendered number
 *  each frame (not a CSS transform) since there's no way to animate
 *  arbitrary integer text content via CSS alone. */
function useCountUp(target: number, shouldStart: boolean): number {
  const [value, setValue] = useState(0);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!shouldStart || hasStarted.current) return;
    hasStarted.current = true;

    let frameId: number;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
      setValue(Math.round(target * easeOutCubic(progress)));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [shouldStart, target]);

  return value;
}

function StatCard({
  stat,
  shouldStart,
}: {
  stat: StatItem;
  shouldStart: boolean;
}) {
  const count = useCountUp(stat.value, shouldStart);

  return (
    <div className="rounded-card bg-brand-gold/10 p-8 text-center">
      <p className="text-4xl font-semibold text-brand-gold md:text-5xl">
        {count}
        {stat.suffix}
      </p>
      <p className="mt-2 text-base font-medium text-brand-black">
        {stat.title}
      </p>
      <p className="mt-2 text-sm text-brand-gray">{stat.description}</p>
    </div>
  );
}

/**
 * Prompt 80 -- IntersectionObserver-triggered count-up, matching this
 * project's own already-established scroll-triggered-behavior pattern
 * (VideosCarousel.tsx's autoplay-on->=60%-visible, Prompt 10), reused
 * here rather than a different technique: watch the grid's own root
 * element, and the moment it's meaningfully on-screen, flip
 * `hasAnimated` once and DISCONNECT the observer immediately -- this is
 * the "trigger once per page load, don't re-trigger on scroll in/out"
 * requirement, enforced structurally (once disconnected, the observer
 * can never fire again for this instance, not just a state guard that
 * could theoretically be bypassed).
 *
 * threshold 0.3 (not VideosCarousel's 0.6): that value was tuned for "is
 * THIS video the one that should be actively playing" among several
 * horizontally-scrolling siblings -- a much stricter bar. This is a
 * one-shot "has the visitor scrolled far enough to plausibly see this
 * section" check for a single, full-width block; a lower bar reads as
 * more natural for an entrance animation (it starts as soon as the
 * section meaningfully enters view, not only once it's nearly filling
 * the viewport).
 */
export default function StatsGrid({ stats }: { stats: StatItem[] }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHasAnimated(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6"
    >
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} shouldStart={hasAnimated} />
      ))}
    </div>
  );
}
