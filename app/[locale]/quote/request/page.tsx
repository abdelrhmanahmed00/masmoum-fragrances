import { setRequestLocale } from "next-intl/server";
import QuoteRequestForm from "@/components/quote/QuoteRequestForm";

// Thin server shell, same split as /quote itself (Prompt 19) -- no
// server-side data fetching happens here. In particular, the "quote is
// empty -> redirect to /quote" check can't happen in this shell: the
// quote has no server representation at all (client-side/localStorage
// state only), so it's handled inside QuoteRequestForm itself via a
// post-hydration effect -- see that component's own comment for the full
// reasoning.
export default async function QuoteRequestPage({
  params,
}: PageProps<"/[locale]/quote/request">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <QuoteRequestForm />;
}
