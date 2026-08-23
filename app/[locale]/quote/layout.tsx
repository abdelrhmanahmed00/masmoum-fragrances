// Holds the quote summary (/quote), the request form (/quote/request),
// and the confirmation page (/quote/confirmed) -- the full Quote system,
// as of Prompt 19. A pure pass-through: nothing shared across those
// three needs its own chrome beyond what the root layout already
// provides (Header/Footer/QuoteSidebar).
//
// Prompt 57 briefly gave this layout a real job -- a pt-header-offset
// wrapping div, compensating for the header's temporary switch to
// `position: fixed`. Prompt 63 reverted the header back to `sticky`
// (which reserves its own flow space automatically), removing the need
// for it. Prompt 70 re-adds it: the header is `fixed` again, this time
// to support hide-on-scroll-down/show-on-scroll-up (see
// HeaderClient.tsx/globals.css's own comments for the full re-derivation
// and the recalculated offset value). Prompt 73: pt-header-offset
// lg:pt-header-offset-lg -- the two EXACT per-breakpoint header heights,
// no added safety-margin rounding (globals.css has the full arithmetic).
// Prompt 84: the SAME two classes still apply here unchanged -- the real
// bug fix (the header's true height varies by real, non-Tailwind-grid
// breakpoints, and differently again in RTL) is now handled entirely by
// extra CSS-custom-property cascade rules in globals.css layered on the
// SAME --spacing-header-offset*/--spacing-header-offset-lg tokens these
// two classes already read from -- no JSX/class changes needed here at
// all. See globals.css for the full real-measurement writeup.
// All three quote pages share this single layout, so adding it here once
// covers all three -- no per-page repetition needed, same reasoning
// Prompt 57 originally had for putting it here rather than in each of
// the three page files individually.
export default function QuoteLayout({
  children,
}: LayoutProps<"/[locale]/quote">) {
  return (
    <div className="pt-header-offset lg:pt-header-offset-lg">
      {children}
    </div>
  );
}
