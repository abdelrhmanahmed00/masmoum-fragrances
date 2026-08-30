"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Prompt 102 -- shared scroll-reveal primitive for /private-label's 4
 * large-image sections (Experience, Feature Block A/B, Closing CTA).
 * One hook + one component, reused everywhere rather than duplicated
 * per-section logic.
 *
 * RESEARCH (mandatory per this prompt) --
 *
 * Reference site's real technique (gulforchid.com/private-label,
 * re-inspected fresh): Elementor's own entrance-animation system.
 * Elements start `visibility:hidden` (`.elementor-invisible`, real CSS
 * from elementor/assets/css/frontend.min.css) with no animation, then a
 * scroll observer swaps in the declared animation name (mostly
 * `fadeIn`/`fadeInUp` on this page, real keyframes: `fadeIn` is opacity
 * 0->1 only; `fadeInUp` is opacity 0->1 PLUS
 * `transform:translate3d(0,100%,0)->none`), running once, duration set
 * by an `animated`/`animated-slow` class (`animated-slow` =
 * `animation-duration:2s`, confirmed the dominant class used on this
 * page's own real elements across Prompts 92-96's inspections). No
 * custom easing declared on the base entrance keyframes (browser default
 * `ease`) -- but the page's OWN large-photo widget
 * (`qi_addons_for_elementor_parallax_images`) uses a genuinely
 * distinctive real easing for its own motion:
 *   `.qodef-e-parallax-image{transition:all .7s cubic-bezier(.23,1,.32,1)}`
 * (qi-addons-for-elementor/assets/css/main.min.css) -- a real
 * "premium," fast-start/long-decelerating curve. Reused verbatim below
 * (EASING_CLASS) for genuine continuity with the reference's own actual
 * premium motion signature, applied consistently rather than the
 * default `ease` its OWN base entrance system uses.
 *
 * The reference's real 2s duration is deliberately NOT reused as-is:
 * with up to 7 staggered bullet items (Experience section) each waiting
 * their own turn on TOP of a 2s base duration, the full cascade would
 * take several seconds to finish -- reads as sluggish by 2026 standards,
 * not premium. Reused instead: the SAME order of magnitude as the
 * reference's OTHER real duration (parallax-image's own 0.7s) --
 * 900ms for images, 700ms for text -- same real easing curve, a
 * deliberately adapted (not blindly copied) duration, matching this
 * whole project's established "cite the real value, then make a
 * reasoned choice" precedent (e.g. Phase 2's rejected 121px stat
 * number, this same page's Prompt 94 gap-value pick).
 *
 * The reference's own real `@media(prefers-reduced-motion:reduce)`
 * guard (`.animated{animation:none!important}`, confirmed present in
 * elementor/frontend.min.css) validates that a reduced-motion guard is
 * standard practice here, not just this project's own added discipline
 * -- replicated below via both a CSS media query (globals.css, covers
 * the pre-hydration/no-JS window with zero flash) AND a JS
 * `matchMedia` check in the hook itself (skips the IntersectionObserver
 * entirely, not just shortening the animation).
 *
 * DEPENDENCY DECISION -- IntersectionObserver + CSS transitions,
 * NOT a library (Motion/Framer Motion) --
 *
 * Researched both. Motion's `whileInView`/`viewport={{once:true}}` API
 * is a close match for this exact need and includes a
 * `useReducedMotion()` helper, but costs real client bundle weight
 * (the animation-only "mini" bundle is still ~5-18KB gzip on top of
 * this page's existing JS, the full `motion/react` package is
 * ~35-50KB) for a project with a hard 10k-visitors/day free-tier
 * bandwidth/cost discipline (the same discipline behind next.config's
 * trimmed `imageSizes`/`qualities:[75]`, Prompt 82's canvas-over-library
 * image compression, and this project's own zero-animation-library
 * history -- 7 real dependencies as of the Prompt 81 audit, none of
 * them animation-related). A CSS transition animating only
 * `transform`/`opacity` is GPU-composited and runs on the compositor
 * thread regardless of whether IntersectionObserver+CSS or a JS library
 * drives the class/style toggle that starts it -- the actual
 * smoothness ceiling is identical either way. What makes an entrance
 * animation feel "premium" is curve/timing/stagger design, not the
 * underlying engine, and this project's own StatsGrid.tsx (Prompt 80)
 * already proves the exact IntersectionObserver "trigger once, observer
 * disconnects immediately" pattern works well here -- reused verbatim
 * below rather than introducing a second, inconsistent animation
 * paradigm (a library-driven `motion.div` style) for just this one
 * page. Motion's real value-add (declarative `variants`, spring
 * physics, layout animations, drag gestures) isn't needed for a
 * straightforward one-shot reveal-on-scroll effect, so it doesn't
 * justify the added weight here.
 *
 * PERFORMANCE -- transform + opacity ONLY, confirmed: HIDDEN_CLASSES/
 * the revealed state below never touch width/height/top/left or any
 * other layout-triggering property. Real gotcha found and fixed while
 * verifying this (via actual mid-transition computed-style sampling,
 * not assumed): Tailwind v4's `translate-y-*`/`scale-*` utilities set
 * the CSS `translate`/`scale` INDIVIDUAL transform properties (confirmed
 * in the compiled output: `.translate-y-4{translate:var(--tw-translate-x)
 * var(--tw-translate-y)}`), NOT the legacy `transform` shorthand --
 * `transition-property: opacity, transform` (this file's first, wrong
 * attempt) does NOT cover those, so the slide/scale motion silently
 * jumped instantly while only opacity faded. Fixed by listing the real
 * property names: `transition-[opacity,translate,scale]`. Both
 * `translate`/`scale` are still GPU-composited exactly like `transform`
 * was -- this is a naming correction, not a different (slower)
 * mechanism. `will-change: translate, scale` (matching the same real
 * property names, not the generic `transform`) is applied ONLY while an
 * element hasn't revealed yet (removed once `isVisible` -- this
 * project's Reveal never leaves `will-change` set indefinitely, which
 * would otherwise waste GPU memory on elements that no longer need it).
 *
 * RTL SAFETY -- every offset here is Y-axis (`translate-y-*`) or
 * uniform (`scale-*`), never `translate-x-*`. Vertical motion and
 * uniform scale mean the same thing in LTR and RTL, so there is no
 * mirroring logic to get right or wrong -- this is a structural choice
 * (no horizontal-offset variant exists in this file at all), not a
 * direction-aware conditional that could be gotten wrong.
 *
 * NO-JS / SSG SAFETY -- this file is a Client Component, but it's
 * rendered as a CHILD of the async Server Components that use it
 * (standard RSC composition); it does not force those pages into
 * Dynamic rendering (confirmed via the real `next build` output, see
 * this prompt's own report). Server-rendered HTML includes the HIDDEN
 * classes (not client-only), so a genuinely no-JS visitor would see
 * permanently offset/transparent content -- covered by a `<noscript>`
 * global override targeting `.pl-reveal` (added once, in the page
 * itself) that forces full opacity/no-transform when JS never runs.
 */

export type RevealVariant = "fade-up" | "image";

const HIDDEN_CLASSES: Record<RevealVariant, string> = {
  "fade-up": "pl-reveal opacity-0 translate-y-4 will-change-[translate,scale]",
  image: "pl-reveal opacity-0 translate-y-6 scale-105 will-change-[translate,scale]",
};

// Real cited easing (see this file's own top comment) -- reused for
// every variant, not just images, for one consistent motion signature
// across the whole page.
const EASING_CLASS = "ease-[cubic-bezier(0.23,1,0.32,1)]";

const DURATION_CLASSES: Record<RevealVariant, string> = {
  "fade-up": "duration-700",
  image: "duration-[900ms]",
};

function useScrollReveal(threshold: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip attaching the observer entirely for reduced-motion users --
    // no setState here (an unconditional setState synchronously inside
    // an effect body is a real anti-pattern React's own lint rule
    // flags, react-hooks/set-state-in-effect). Not needed anyway: the
    // CSS media query in globals.css already forces `.pl-reveal` to its
    // final visible state regardless of this component's `isVisible`
    // state, so simply never transitioning away from the (CSS-overridden)
    // hidden classes produces the correct result with no visible defect.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Same "trigger once, disconnect immediately" pattern as
    // StatsGrid.tsx (Prompt 80) -- once disconnected the observer can
    // never fire again for this instance, a structural guarantee, not
    // just a state guard.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

export default function Reveal({
  children,
  variant = "fade-up",
  delayMs = 0,
  threshold = 0.2,
  className = "",
}: {
  children: React.ReactNode;
  variant?: RevealVariant;
  delayMs?: number;
  threshold?: number;
  className?: string;
}) {
  const { ref, isVisible } = useScrollReveal(threshold);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,translate,scale] ${DURATION_CLASSES[variant]} ${EASING_CLASS} ${
        isVisible
          ? "pl-reveal opacity-100 translate-y-0 scale-100"
          : HIDDEN_CLASSES[variant]
      } ${className}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
