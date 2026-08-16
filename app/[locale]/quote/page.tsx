import { setRequestLocale } from "next-intl/server";
import QuoteSummary from "@/components/quote/QuoteSummary";

// Thin server shell around a client component, same split as every other
// page here (categories/collections/products) -- setRequestLocale is what
// actually enables static rendering for this locale segment. No data
// fetching happens on the server for this route: the entire quote is
// client-side state (QuoteProvider/localStorage), so there's nothing else
// for this shell to await. This mirrors how QuoteSidebar (Prompt 18) is
// itself a plain client component with no server-side data dependency.
export default async function QuotePage({
  params,
}: PageProps<"/[locale]/quote">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <QuoteSummary />;
}
