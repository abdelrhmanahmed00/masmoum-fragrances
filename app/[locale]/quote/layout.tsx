// Holds the quote summary (/quote), the request form (/quote/request),
// and the confirmation page (/quote/confirmed) -- the full Quote system,
// as of Prompt 19. Still just a pass-through: nothing shared across those
// three needs its own chrome beyond what the root layout already
// provides (Header/Footer/QuoteSidebar).
export default function QuoteLayout({
  children,
}: LayoutProps<"/[locale]/quote">) {
  return children;
}
