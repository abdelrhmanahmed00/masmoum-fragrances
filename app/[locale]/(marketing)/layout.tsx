// Route group for homepage, category pages, and product pages. Pass-through
// for now — shared marketing chrome (header/footer/nav) is added once the
// visual design is implemented.
//
// Note: (marketing) is a pathless route group, so it has no entry in the
// generated LayoutRoutes type (route groups don't affect the URL) — plain
// React.ReactNode typing is used instead of the LayoutProps<> helper here.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
