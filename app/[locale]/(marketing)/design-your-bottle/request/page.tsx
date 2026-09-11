import { setRequestLocale } from "next-intl/server";
import DesignRequestForm from "@/components/design-your-bottle/DesignRequestForm";

// Thin server shell, same split as /quote/request itself (Prompt 19) --
// no server-side data fetching happens here. The whole "cart" this page
// summarizes/submits lives in DesignRequestProvider (mounted by this
// route's own parent layout, app/[locale]/(marketing)/design-your-bottle/
// layout.tsx), not fetched from the server -- so this page is
// necessarily a Client Component (DesignRequestForm) under a plain
// Server Component wrapper, same reasoning as /quote/request's own
// QuoteRequestForm split.
export default async function DesignYourBottleRequestPage({
  params,
}: PageProps<"/[locale]/design-your-bottle/request">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DesignRequestForm />;
}
