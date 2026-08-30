"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useQuote } from "@/components/quote/QuoteProvider";
import HeaderSearch from "./HeaderSearch";
import LanguageSwitcher from "./LanguageSwitcher";
import ChevronIcon from "./ChevronIcon";
import type { CategoryRow } from "@/lib/catalog";

// Brand wordmark — a proper noun, so it stays as-is in both locales rather
// than going through next-intl. The client's real logo image (Prompt 51,
// public/logo.jpg) was tried alongside this text and removed again
// (Prompt 55, after three rounds of sizing never landing right visually)
// -- this text wordmark is the header's only brand mark for now. The
// logo file itself is still on disk, just not referenced here.
const BRAND_NAME = "MASMOUM FRAGRANCES";

// Prompt 70 -- hide the header on scroll down, show it on scroll up.
// Researched before implementing (see the Prompt 70 report's cited
// sources): a passive, requestAnimationFrame-throttled `scroll` listener
// is the current standard-practice approach for this exact interaction --
// NOT a setTimeout-debounced listener (adds a fixed delay before the
// header reacts, reads as laggy/disconnected from the actual scroll) and
// NOT IntersectionObserver (IO reports whether a target is crossing a
// FIXED threshold -- e.g. "has the page scrolled past this sentinel" --
// not which way the page is scrolling on a continuous, ongoing basis; the
// task's own "even mid-page, not just back at the very top" requirement
// needs a running comparison between consecutive scroll positions, which
// is exactly the kind of thing IO isn't built to report). `{ passive:
// true }` on the listener plus a `ticking` guard around
// requestAnimationFrame caps the real work to once per animation frame no
// matter how many raw `scroll` events the browser fires in between --
// avoiding both an unthrottled-handler performance hit and layout thrash
// (the only DOM read in the handler is `window.scrollY`; no layout-
// triggering writes happen here at all -- the actual visual effect is a
// CSS `transform`, applied via a class swap after React re-renders,
// which runs on the compositor thread, not something this hook touches
// directly).
const HEADER_HIDE_THRESHOLD_PX = 16;
const HEADER_TOP_ZONE_PX = 16;

function useHeaderVisibility() {
  const [isVisible, setIsVisible] = useState(true);
  // The scrollY this hook last "committed" a visibility decision against
  // -- NOT necessarily the very last scrollY read on the previous frame.
  // Small same-direction deltas deliberately accumulate against this same
  // reference point across multiple frames (see the comment inside the
  // handler for why comparing against only the immediately-previous
  // frame would make the threshold practically unreachable at normal
  // scroll speeds).
  const committedY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    committedY.current = window.scrollY;

    function handleScroll() {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - committedY.current;

        if (currentY <= HEADER_TOP_ZONE_PX) {
          // Always visible right at the very top, regardless of
          // direction -- matches the task's own explicit spec, and
          // avoids the header flickering hidden from a tiny downward
          // wiggle while scrollY is still near 0.
          setIsVisible(true);
          committedY.current = currentY;
        } else if (delta > HEADER_HIDE_THRESHOLD_PX) {
          // Scrolled down past the threshold since the last committed
          // point -- hide.
          setIsVisible(false);
          committedY.current = currentY;
        } else if (delta < 0) {
          // Scrolled up by ANY amount -- show immediately (per spec),
          // and reset the reference point so a later down-scroll has to
          // earn the full threshold again starting from here.
          setIsVisible(true);
          committedY.current = currentY;
        }
        // else: a small downward delta (0 < delta <= threshold) below
        // the top zone -- deliberately does NOT update committedY.current
        // here. Leaving the reference point where it is lets these small
        // deltas accumulate frame over frame until they cross the
        // threshold; resetting it on every single frame instead would
        // require a 16px+ jump between two CONSECUTIVE animation frames
        // to ever trigger a hide, which ordinary scrolling (mouse wheel,
        // trackpad, touch) rarely produces even while genuinely
        // scrolling down at a sustained pace -- exactly the "avoid
        // jitter on tiny scroll wiggles" outcome the task asks for,
        // without also accidentally suppressing real sustained scrolling.

        ticking.current = false;
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Cleanup on unmount -- HeaderClient is mounted once at the app root
    // (Prompt 5) and never unmounts during normal navigation, but this
    // still matters for React StrictMode's mount/unmount/remount cycle in
    // development and for correctness in general (a leaked listener on
    // `window` outlives the component that added it).
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return isVisible;
}

export default function HeaderClient({
  categories,
}: {
  categories: CategoryRow[];
}) {
  const t = useTranslations("Header");
  const locale = useLocale();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Desktop dropdown: opens on hover (onMouseEnter/Leave on the wrapping
  // group below) AND on click/keyboard activation of the trigger button
  // — hover alone isn't reachable by keyboard, click-only isn't the
  // expected desktop-nav feel, so both drive the SAME state.
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  // Mobile drawer's own accordion state, independent of the desktop one
  // (different viewport, never both mounted-and-visible at once, but
  // kept as separate state rather than shared so opening one can never
  // leave the other stuck open when the viewport is resized).
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  // totalItems = distinct line count, matching the client's own "Quote (3)"
  // spec for this pill (their Quote Summary example distinguishes "TOTAL
  // ITEMS" from "TOTAL QTY" — the pill uses the former; the latter is for
  // the future summary page). Starts at 0 identically on server and first
  // client render (see QuoteProvider's hydration note), then updates once
  // localStorage is read post-mount — no hydration mismatch.
  const { totalItems, openSidebar } = useQuote();
  const isHeaderVisible = useHeaderVisibility();

  function closeMobileMenu() {
    setIsMenuOpen(false);
    setIsMobileCategoriesOpen(false);
  }

  return (
    // Prompt 79 -- color-role INVERSION again, the exact reverse of
    // Prompt 67: background flips back from bg-brand-gold to
    // bg-brand-black, and every element that Prompt 67 made black
    // (text/icons/borders/wordmark) flips to gold. Same discipline as
    // Prompt 67 -- not a mechanical find/replace, each specific hover
    // case reasoned through individually below (several would break if
    // treated as a blind swap, same reasons as before, just mirrored).
    //
    // Contrast -- reusing Prompt 67's own real computed math, not
    // re-derived from scratch (the token values haven't changed):
    //   brand-gold #dcb689 relative luminance ~= 0.505
    //   brand-black #000000 relative luminance = 0
    //   contrast ratio (0.505+0.05)/(0+0.05) ~= 11.1:1
    // This ratio is SYMMETRIC regardless of which color is text vs.
    // background (the WCAG formula only cares about lighter/darker, not
    // foreground/background role) -- so gold-on-black passes at the
    // exact same 11.1:1 AAA-level contrast Prompt 67 confirmed for
    // black-on-gold. Confirmed by re-running the same calculation this
    // prompt (see the Prompt 79 report) rather than assumed from the
    // ratio's symmetry alone.
    //
    // Prompt 70's hide-on-scroll-down/show-on-scroll-up mechanics below
    // (positioning, the transform-based show/hide, the offset token) are
    // UNCHANGED by this color-only prompt -- kept for reference.
    //
    // AddToQuoteButton.tsx (Prompt 71) and the Hero "Shop Now" buttons
    // (Prompts 68/71) -- deliberately left UNCHANGED, not flipped along
    // with the header. Both were originally styled to match whatever the
    // header's Quote pill looked like AT THE TIME they were built (a
    // one-time derivation, "reuse the established pattern" -- Prompts 68/
    // 71's own instructions), not wired to perpetually track every future
    // header color change. They're independent, site-wide UI conventions
    // now (Add to Quote appears on every product card; Shop Now on every
    // Hero slide) that read correctly on their own regardless of what the
    // header does -- they never sit adjacent to or overlapping the header,
    // so there's no visual clash from the header inverting while they
    // don't. Forcing every element that happens to share this two-token
    // palette to always mirror the header's current color state would
    // make a header-specific experiment (this is the header's SECOND
    // inversion already) ripple into every product card and the Hero on
    // every future header change -- more fragile coupling than this
    // project's own actual requirement, which was scoped to the header
    // itself (this prompt's own task literally opens with "re-read
    // HeaderClient.tsx's current state"). Coincidentally, this prompt's
    // new Quote-pill hover state (gold fill/black text) now happens to
    // land on the exact same pairing those buttons already use at THEIR
    // rest state -- noted at that button's own comment below, but that's
    // an outcome of both landing on the same two colors, not a rule this
    // prompt is establishing going forward.
    //
    // `sticky` -> `fixed` again, and why this doesn't repeat the
    // Prompt 63 mistake of blindly carrying `fixed` forward: the
    // show/hide motion is a CSS `transform: translateY(...)`, and
    // `position: sticky` elements still reserve their own box in normal
    // document FLOW at all times (re-confirmed, same fact this project
    // has now derived three separate times -- Prompt 57, 63, and here).
    // Transform never changes an element's reserved layout space, only
    // where it's painted -- so a `sticky` header hidden via `translateY`
    // would slide out of view while its ORIGINAL flow position stayed
    // reserved as empty space, leaving a header-shaped gap in the page
    // every time it hides. `position: fixed` removes it from flow
    // entirely (regardless of visibility), so translating it up/down
    // only ever changes where it floats -- no gap, ever. `inset-x-0` is
    // back for the same reason Prompt 57 first added it: `fixed`
    // switches an element with auto inset values to shrink-to-fit its
    // own content instead of spanning the containing block, so it's
    // needed again to restore full width (confirmed via a real compile
    // in the Prompt 57/63 reports -- inset-x-0 emits the logical
    // `inset-inline: 0`).
    //
    // This REOPENS the page-content-offset question (Prompts 57/63/64) on
    // purpose, not by accident -- `fixed` reserves zero flow space,
    // whether the header is currently visible or hidden, so every page's
    // content needs a constant top clearance again (recalculated for
    // THIS header's real current dimensions -- `--spacing-header-offset`
    // in globals.css has the full math). As of Prompt 72, that now
    // includes the HOMEPAGE too -- the Prompt 57-70 exception that kept
    // Hero at true y=0 (deliberately letting the header float
    // transparently over it) no longer applies now that the header is a
    // solid bar with nothing transparent left to justify an overlap; see
    // HeroSlider.tsx/HeroEmptyState.tsx for where the offset is applied.
    // A flow-collapsing alternative (animating
    // margin/height back on a still-`sticky` header instead of using
    // `fixed`+transform) was considered and rejected: it would require
    // knowing the header's exact pixel height up front (fragile -- breaks
    // if content wraps to 2 lines or the header's height ever changes),
    // where translateY(-100%) self-computes from the element's OWN real
    // rendered height with no magic number at all. It would also make
    // page content BELOW the header visibly shift up/down every time the
    // header's visibility toggles while scrolling, which is jarring --
    // "the header slides away, everything else stays put" (what a
    // constant offset + fixed positioning gives you) is the actual
    // intended feel of this pattern, not "the whole page reflows on every
    // direction change."
    //
    // Motion: transition-transform duration-300, the SAME transition-*
    // convention already used elsewhere in this exact file (the mobile
    // drawer's own transition-transform duration-300 slide, referenced
    // directly per this prompt's own instruction to reuse it rather than
    // invent a new duration). translate-y-0 / -translate-y-full toggle by
    // isHeaderVisible (useHeaderVisibility(), defined above this
    // component) -- -translate-y-full moves the element by 100% of its
    // OWN rendered height, not a hardcoded pixel value, so this stays
    // correct even if the header's real height ever changes later.
    // will-change-transform: a standing hint for a persistently-
    // transform-animated piece of UI chrome (this header can be
    // translated at any moment on any page, unlike a one-off animation),
    // encouraging the browser to promote it to its own compositor layer
    // ahead of time rather than only reactively.
    // No rtl: variant anywhere in this change -- translateY is a
    // vertical transform, direction-agnostic the same way this file's
    // other symmetric values already are (the gradient underline's
    // center-fade, this component's own left-1/2 centering elsewhere) --
    // there is no "start/end" axis for a Y-axis motion to mirror.
    //
    // Prompt 84 -- real bug fix, wraps the return in a Fragment: the
    // mobile off-canvas nav (below, after the gradient underline) used to
    // be a CHILD of this <header>, but this element always has a real,
    // non-"none" `transform` applied (translate-y-0 / -translate-y-full,
    // whichever isHeaderVisible picks) AND `will-change-transform` -- both
    // independently make an element the CSS containing block for its own
    // `position: fixed` descendants, per spec. The mobile-nav overlay
    // below is itself `fixed inset-0`, meant to size against the real
    // viewport -- nested inside this <header>, it was instead sizing
    // against the HEADER's own box (fixed, full width, but only as tall
    // as its own content -- 69-107px depending on breakpoint/direction,
    // see globals.css), collapsing the entire drawer down to a sliver the
    // height of the header bar itself. Confirmed via real getBoundingClientRect()
    // measurements (both a real Chromium instance AND a real WebKit
    // instance, driving the actual live production deployment, real tap
    // events) -- not a data problem, not a categories-fetching problem
    // (the category rows were always correct in the server-rendered HTML,
    // in every test), a pure CSS containing-block bug that only a real
    // rendered-layout measurement (not markup/class-name inspection) could
    // catch. Fixed by moving the mobile-nav overlay OUT of <header>
    // entirely, to be its OWN sibling -- `position: fixed` elements
    // position against the viewport regardless of DOM nesting depth as
    // long as no ancestor establishes a containing block, so this has zero
    // effect on the drawer's actual visual position/z-index under normal
    // (non-buggy) circumstances, it just removes the one ancestor that was
    // wrongly claiming that role.
    //
    // Prompt 107 -- THIRD bar-color flip (67 gold, 79 black, 107 white),
    // plus real mobile-sizing/wrap fixes. Prompt 108 -- FOURTH flip,
    // back to black+gold (the client tried white and didn't like it):
    // color-only revert, back to the exact Prompt 79 gold-on-black
    // pairing (real math re-cited below per element, not re-derived --
    // the token values haven't changed since Prompt 79 first computed
    // them). Every one of Prompt 107's real mobile-sizing/wrap-fix
    // measurements (mobile icon/gap/padding/wordmark/pill sizes, the
    // "Quote" text hidden below `sm`, the recomputed globals.css header-
    // offset values) stays EXACTLY as Prompt 107 left it -- this prompt
    // touches background/text/border/hover colors only, per its own
    // explicit scope. Hide-on-scroll (Prompt 70) and the containing-
    // block fix above are unrelated, unchanged.
    <>
      <header
        className={
          "fixed inset-x-0 top-0 z-50 bg-brand-black shadow-lg transition-transform duration-300 will-change-transform " +
          (isHeaderVisible ? "translate-y-0" : "-translate-y-full")
        }
      >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:gap-4 lg:px-8 lg:py-4">
        {/* Mobile: hamburger (hidden on desktop). Prompt 108: back to
            text-brand-gold -- the bar is black again, and gold-on-black
            is the same real 11.1:1 AAA pairing Prompt 79 originally
            computed (brand-gold #dcb689 luminance 0.505, brand-black
            luminance 0, ratio (0.505+0.05)/(0+0.05) = 11.1:1, symmetric
            regardless of fg/bg role). Every header text/icon color below
            makes this same reversion for the same reason (cited once
            here, not repeated per element). No hover state exists here
            (tap-only on mobile).
            Sizing UNCHANGED from Prompt 107 (out of this prompt's
            scope): icon h-5 w-5, p-2 padding -- both stay exactly as
            Prompt 107 left them. */}
        <button
          type="button"
          className="-ms-2 p-2 text-brand-gold lg:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-nav"
          onClick={() => setIsMenuOpen(true)}
        >
          <span className="sr-only">{t("openMenu")}</span>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        {/* Text wordmark -- unchanged position (start/left), still links
            home. Prompt 108: back to text-brand-gold (11.1:1 against the
            black bar, same math as the hamburger above). No hover state
            existed before either, so nothing to invert here beyond the
            base color.
            Sizing UNCHANGED from Prompt 107 (out of this prompt's
            scope): mobile-only text-sm + tracking-tight (vs. desktop's
            text-base + tracking-wide) stays exactly as Prompt 107 left
            it -- this is what makes the one-line mobile wrap-prevention
            still work, unrelated to this prompt's color-only revert. */}
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-brand-gold lg:flex-1 lg:text-base lg:tracking-wide"
        >
          {BRAND_NAME}
        </Link>

        {/* End/right zone -- Menu dropdown + Quote pill grouped together
            (Prompt 51). Prompt 62 adds Search and the language toggle
            into this SAME group, in between: Menu (desktop-only,
            browse) -> Search (find something specific) -> Language
            (utility) -> Quote (the zone's one primary CTA, kept
            furthest along/most prominent, unchanged position). Both
            new pieces sit OUTSIDE the `nav`'s `hidden lg:flex` -- unlike
            the categories dropdown (which has a full mobile-drawer
            equivalent, Prompt 50), neither Search nor the language
            toggle has any other entry point on mobile, and both are
            compact enough (an icon; a 2-3 character pill) not to strain
            the collapsed mobile bar the way another full nav ever
            would. */}
        <div className="flex items-center gap-2 lg:flex-1 lg:justify-end lg:gap-4">
          {/* Desktop categories dropdown -- hover/click/keyboard
              interaction logic byte-for-byte unchanged from Prompt 50.
              Prompt 108: trigger text back to brand-gold (bar is black
              again). Hover CANNOT mechanically stay brand-gold
              (identical to the new rest state, no visible feedback) or
              become brand-black (invisible against a black bar) -- back
              to the same dimming-not-hue-shifting solution this element
              used before Prompt 107, gold this time: gold at 70% opacity
              over black -- blending onto black is NOT a simple linear
              scale of gold's own luminance (relative luminance is
              computed from GAMMA-LINEARIZED channel values, so opacity
              blending has to happen in sRGB space first, then
              re-linearize -- confirmed by computing it properly, not
              assumed): effective rgb(154,127,96), luminance 0.230,
              contrast vs. black (0.230+.05)/(0+.05) = 5.60:1 --
              comfortably above the 4.5:1 this text size needs, and
              matches Prompt 79's own original ~5.58:1 for this exact
              element almost exactly (real confirmation, not just reused
              blindly). hover:text-brand-gold/70. This is desktop-only
              (`hidden lg:flex`), so no mobile-sizing question applies
              here. */}
          <nav className="hidden lg:flex">
            <div
              className="relative"
              onMouseEnter={() => setIsCategoriesOpen(true)}
              onMouseLeave={() => setIsCategoriesOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-medium text-brand-gold transition-colors hover:text-brand-gold/70"
                aria-haspopup="true"
                aria-expanded={isCategoriesOpen}
                onClick={() => setIsCategoriesOpen((open) => !open)}
              >
                {t("menuLabel")}
                <ChevronIcon open={isCategoriesOpen} />
              </button>

              {/* Dropdown panel -- start-0 logical alignment and the
                  absolute+fixed-offset overlay mechanism both unchanged
                  from Prompt 50. Prompt 56: background/border/text
                  matched the header bar's own dark glass treatment
                  (bg-brand-black/75 + backdrop-blur-md) rather than
                  staying the old white panel -- kept at those exact DARK
                  values through EVERY header-shape/color prompt since
                  (63/64/65/66/67, 79's second inversion, 107's third,
                  and now 108's fourth), deliberately NOT tracking the
                  bar's own color role: this dropdown is an absolutely-
                  positioned panel that opens ON TOP of real page content
                  (whatever the visitor is looking at scrolls/sits
                  underneath it, genuinely visible through the panel) --
                  a wholly different UI surface from the persistent bar,
                  opened on demand (same "pill vs. panel" distinction
                  Prompt 65/67 already established). Prompt 108
                  re-confirmed this again: nothing in THIS panel's own
                  color pairing (cream/gold text on black/75 background)
                  depends on the bar's color, so its contrast is
                  unchanged by the bar flipping back to black -- the bar
                  has now flipped FOUR times (67, 79, 107, 108) while
                  this panel has needed zero color changes any of those
                  times. Same reasoning applies unchanged to
                  HeaderSearch.tsx's own results panel, which mirrors
                  this one's classes exactly. rounded-card (22px, an
                  established token, Prompt 4/9) kept as-is for this
                  element specifically -- the header BAR itself uses no
                  rounding at all (Prompt 63), but the dropdown is a
                  distinct UI element no header prompt has asked to
                  reshape, only to re-skin in the same glass/gold
                  language. */}
              <div
                className={
                  "absolute start-0 top-full pt-3 " +
                  (isCategoriesOpen ? "block" : "hidden")
                }
              >
                <ul className="min-w-48 rounded-card border border-brand-gold/20 bg-brand-black/75 py-2 shadow-lg backdrop-blur-md">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <Link
                        href={`/categories/${category.slug}`}
                        className="block px-4 py-2 text-sm text-brand-cream transition-colors hover:bg-brand-gold/10 hover:text-brand-gold"
                        onClick={() => setIsCategoriesOpen(false)}
                      >
                        {locale === "ar" ? category.name_ar : category.name_en}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </nav>

          <HeaderSearch />
          <LanguageSwitcher />

          {/* Quote indicator. Opens the sidebar (Prompt 18) -- behavior
              unchanged. Prompt 108: rest state back to the pre-107
              black-bar pairing -- border-brand-black/60 ->
              border-brand-gold/60 (checked properly, not linearly
              scaled: gold at 60% opacity over black = effective
              rgb(132,109,82), luminance 0.165, contrast vs. black =
              4.30:1 -- clears the 3:1 non-text/border floor comfortably;
              a border isn't held to the stricter 4.5:1 text threshold),
              text-brand-black -> text-brand-gold (11.1:1, this
              component's own top-comment math). Hover state needs NO
              change at all, same as it needed none going the other
              direction in Prompt 107: it fills with a SOLID gold
              background (not blended with the bar's own color), so
              black text on top of that local gold fill is still the
              same real, unchanged 11.1:1 pairing regardless of what
              color the surrounding bar is.
              Sizing UNCHANGED from Prompt 107 (out of this prompt's
              scope): mobile-only px-3 py-1 text-xs (vs. lg:px-4
              lg:py-1.5 lg:text-sm) and the icon size all stay exactly as
              Prompt 107 left them.

              WORD "Quote" HIDDEN below `sm` (640px), "(N)" always shown --
              real measured trade-off, not the first thing tried. After
              every other mobile-sizing reduction in this file (wordmark
              text-sm/no-tracking, hamburger h-5, all the reduced
              gaps/padding above), the row STILL didn't fit unwrapped at
              real phone widths -- true natural-width sums vs. real
              available width, measured via cloned nowrap elements (not
              estimated): en 320px needed 411.6/288 avail (123.6px short),
              375px 411.6/343 (68.6px short), 390px 411.6/358 (53.6px
              short), 430px 411.6/398 (13.6px short) -- ar slightly worse
              at every width (128.0/73.0/58.0/18.0px short respectively).
              Even at 430px, the widest common phone, a real double-digit
              deficit remained -- no further legible font-size/
              letter-spacing tightening on the wordmark closes a 54-124px
              gap without becoming illegible, so per this prompt's own
              instruction ("propose the most reasonable trade-off... your
              call, flag this clearly") this hides the one word here that
              is genuinely redundant with its own icon + visible count --
              tapping still opens the sidebar, the count is still visible,
              nothing about the FEATURE is removed, only a repeated label.
              aria-label keeps the FULL "Quote (N)" phrase for assistive
              tech regardless of which visual state is showing -- screen
              reader users never lose the word, only sighted narrow-mobile
              users see the shorter version. Re-measured with this change
              applied (see this file's own top comment): now fits
              unwrapped through the task's own stated 375-430px range;
              320px specifically still falls short by a real, reported
              amount -- flagged, not silently forced.
              Prompt 108 -- this whole abbreviation UNCHANGED (out of
              scope, color-only prompt): still hidden below `sm`, still
              the same real measured wrap-prevention fix. */}
          <button
            type="button"
            onClick={openSidebar}
            aria-label={`${t("quote")} (${totalItems})`}
            className="flex items-center gap-1.5 rounded-full border border-brand-gold/60 px-3 py-1 text-xs font-medium text-brand-gold transition-colors hover:border-brand-gold hover:bg-brand-gold hover:text-brand-black lg:gap-2 lg:px-4 lg:py-1.5 lg:text-sm"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span aria-hidden="true">
              <span className="hidden sm:inline">{t("quote")} </span>
              ({totalItems})
            </span>
          </button>
        </div>
      </div>

      {/* Prompt 63's gradient underline -- NO color change this prompt
          either. The bar is black again (Prompt 108), and gold is
          exactly the underline color Prompt 79 already paired with a
          black bar (this same pairing shipped once before, between
          Prompts 79 and 107) -- decorative/aria-hidden, not subject to
          text-contrast rules, so this is a historical-consistency
          choice, not a math one: reusing a pairing this project already
          proved out, rather than picking a new one. Same center-fade-
          both-edges gradient shape/opacity as always -- see Prompt 63's
          report for why that shape (not one-directional) and why no
          rtl: variant is needed (symmetric either direction, still
          true). */}
      <div
        aria-hidden="true"
        className="h-px w-full bg-linear-to-r from-transparent via-brand-gold/50 to-transparent"
      />
      </header>

      {/* Mobile off-canvas nav — container/backdrop/slide-direction
          mechanics UNCHANGED since Prompt 5 (full-screen backdrop + panel
          sliding in from the logical start edge, left in LTR / right in
          RTL via the rtl: variant), and its own light theme (white
          panel, black text, brand-border dividers) is ALSO deliberately
          UNCHANGED by any header redesign since (Prompt 56 through 66) --
          a real decision, not an oversight. Prompt 84: this whole overlay
          moved from being a CHILD of <header> to a SIBLING of it -- see
          this file's own top-of-return comment for the real containing-
          block bug this fixes. Everything else about it (backdrop, slide
          mechanics, light theme, z-[60]) is byte-for-byte unchanged:
            - This drawer is a solid, fully opaque navigation surface
              (its own dark scrim sits behind it separately, below), not
              a "floating over page content" surface the way the header
              bar is -- there's nothing for backdrop-blur to usefully
              blur here, since the drawer is meant to fully replace the
              view, not glaze over it.
            - It's a dense, scrollable browsing tool (the full category
              list lives here on mobile) -- the header bar's glass effect
              works as a thin decorative strip glimpsed for a moment;
              stretched across a whole panel a visitor reads line-by-line,
              the same effect would fight legibility rather than add
              polish.
            - Keeping it on the site's existing light theme means it
              reads as a continuation of the site's own content (matching
              every other page's white background), which suits a
              functional navigation tool better than extending a
              decorative header treatment into it.
          The collapsed mobile bar itself (hamburger + wordmark + Quote
          pill, above) already gets the identical solid-black/gold-text
          treatment (Prompt 79) as desktop at this same narrow width --
          it's the SAME markup, no separate mobile styling exists for
          that row at all -- so the "collapsed bar gets the treatment
          too" property this header has had since Prompt 56 is met
          without any additional code here. */}
      <div
        className={
          "fixed inset-0 z-[60] lg:hidden " +
          (isMenuOpen ? "pointer-events-auto" : "pointer-events-none")
        }
        aria-hidden={!isMenuOpen}
      >
        <div
          className={
            "absolute inset-0 bg-brand-black/50 transition-opacity duration-300 " +
            (isMenuOpen ? "opacity-100" : "opacity-0")
          }
          onClick={closeMobileMenu}
        />
        <div
          id="mobile-nav"
          className={
            "absolute inset-y-0 start-0 w-4/5 max-w-sm overflow-y-auto bg-brand-white shadow-brand transition-transform duration-300 " +
            (isMenuOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full")
          }
        >
          <div className="flex items-center justify-between border-b border-brand-border px-4 py-4">
            <span className="text-sm font-semibold text-brand-black">
              {BRAND_NAME}
            </span>
            <button
              type="button"
              className="p-2 text-brand-black"
              onClick={closeMobileMenu}
            >
              <span className="sr-only">{t("closeMenu")}</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* Single expandable "Menu" group (Prompt 50, relabeled Prompt
              51), matching the reference screenshot's mobile pattern -- a
              header row with a chevron that expands to reveal the
              category list beneath it, collapsible back. Not a <Link>, a
              plain toggle button: this row has no destination of its
              own. */}
          <div className="px-4">
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-brand-border py-3 text-start text-brand-black"
              aria-expanded={isMobileCategoriesOpen}
              aria-controls="mobile-nav-categories"
              onClick={() => setIsMobileCategoriesOpen((open) => !open)}
            >
              <span>{t("menuLabel")}</span>
              <ChevronIcon open={isMobileCategoriesOpen} />
            </button>
            <ul
              id="mobile-nav-categories"
              className={isMobileCategoriesOpen ? "block" : "hidden"}
            >
              {categories.map((category) => (
                <li key={category.id} className="border-b border-brand-border">
                  <Link
                    href={`/categories/${category.slug}`}
                    className="block py-3 ps-4 text-brand-black"
                    onClick={closeMobileMenu}
                  >
                    {locale === "ar" ? category.name_ar : category.name_en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
