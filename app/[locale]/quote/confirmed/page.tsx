import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Deliberately its own route (not a query-param flag on /quote/request)
// per the task's own suggestion -- a plain, stateless page that doesn't
// depend on the quote still having items (it's cleared by the time the
// buyer lands here, see QuoteRequestForm's post-success effect). Pure
// static content with no client state at all, so unlike every other
// page in the Quote system this one is a plain Server Component -- no
// "use client" needed, no QuoteContext read, nothing to hydrate.
export const revalidate = 3600;

export default async function QuoteConfirmedPage({
  params,
}: PageProps<"/[locale]/quote/confirmed">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("QuoteConfirmation");

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center md:py-24">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-black">
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8 text-brand-white"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="mt-6 text-2xl font-medium text-brand-black md:text-3xl">
        {t("heading")}
      </h1>
      <p className="mt-3 text-sm text-brand-gray">{t("message")}</p>

      <Link
        href="/"
        className="mt-8 rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
      >
        {t("continueShopping")}
      </Link>
    </div>
  );
}
