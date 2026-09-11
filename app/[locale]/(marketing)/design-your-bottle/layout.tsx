import { DesignRequestProvider } from "@/components/design-your-bottle/DesignRequestProvider";

// Prompt 143 (Phase D) -- scoped to exactly this feature's 2 routes
// (/design-your-bottle, the designer, and /design-your-bottle/request,
// the customer-info + submit page), not the root [locale] layout
// QuoteProvider uses -- see DesignRequestProvider.tsx's own top comment
// for the full reasoning (this state has no reason to exist anywhere
// else on the site). A plain pass-through layout otherwise, same shape
// as the (marketing) route group's own layout.tsx.
export default function DesignYourBottleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DesignRequestProvider>{children}</DesignRequestProvider>;
}
