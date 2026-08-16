"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useQuote } from "./QuoteProvider";
import { submitQuoteRequest } from "@/app/[locale]/quote/request/actions";
import {
  BUSINESS_TYPES,
  QUOTE_REQUEST_INITIAL_STATE,
  type QuoteSubmissionItem,
} from "@/types/quote-request";

// Final piece of the Quote system (Prompt 19). Two client-only redirects
// live here, both explained in the report rather than left as bare
// useEffects:
//
// 1. Empty-quote guard: if there's nothing to request, bounce to /quote.
//    This can ONLY be checked client-side -- the quote has no server
//    representation at all (localStorage-backed QuoteContext), so there's
//    no server-side equivalent to fall back to. Gated on `isHydrated`
//    (same flag from QuoteProvider used for the sidebar/summary's
//    hydration-safe rendering) so a quote that's genuinely non-empty
//    isn't bounced away during the one-render window before localStorage
//    has been read. Also excluded while a submission just succeeded (see
//    next point) -- otherwise clearQuote() emptying the array would race
//    this guard into redirecting to /quote instead of /quote/confirmed.
//
// 2. Post-success handoff: the Server Action deliberately does NOT call
//    redirect() itself on success. If it did, the client's
//    useActionState promise would never resolve with a value the way a
//    plain return does -- Next.js instead navigates directly server-side,
//    and clearQuote() (a client-only, localStorage-backed mutation the
//    server has no access to) would never get a chance to run. Returning
//    a plain `{ status: "success" }` and reacting to it in a `useEffect`
//    here keeps the ordering explicit and correct: server confirms
//    success -> client clears its own state -> client navigates.
export default function QuoteRequestForm() {
  const t = useTranslations("QuoteRequest");
  const router = useRouter();
  const { items, totalItems, totalQuantity, isHydrated, clearQuote } =
    useQuote();

  const submissionItems = useMemo<QuoteSubmissionItem[]>(
    () =>
      items.map((item) => ({
        productId: item.productId,
        productSizeId: item.productSizeId,
        quantity: item.quantity,
      })),
    [items]
  );

  const boundAction = useMemo(
    () => submitQuoteRequest.bind(null, submissionItems),
    [submissionItems]
  );

  const [state, formAction, isPending] = useActionState(
    boundAction,
    QUOTE_REQUEST_INITIAL_STATE
  );

  useEffect(() => {
    if (isHydrated && items.length === 0 && state.status !== "success") {
      router.replace("/quote");
    }
  }, [isHydrated, items.length, state.status, router]);

  useEffect(() => {
    if (state.status === "success") {
      clearQuote();
      router.replace("/quote/confirmed");
    }
  }, [state.status, clearQuote, router]);

  // Nothing meaningful to show before hydration, for an empty quote (the
  // effect above is about to redirect away), or right after a successful
  // submit (same -- the effect above is navigating to /quote/confirmed).
  if (!isHydrated || items.length === 0) {
    return null;
  }

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;
  const topLevelErrorKey =
    state.status === "error"
      ? state.code === "validation"
        ? "errorValidation"
        : state.code === "itemsInvalid"
          ? "errorItemsInvalid"
          : state.code === "rateLimited"
            ? "errorRateLimited"
            : "errorSubmissionFailed"
      : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12 lg:px-8">
      <Link
        href="/quote"
        className="inline-flex items-center gap-2 text-sm text-brand-black transition-colors hover:text-brand-gray"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 rtl:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
        </svg>
        {t("backToQuote")}
      </Link>

      <h1 className="mt-4 text-2xl font-medium text-brand-black md:text-3xl">
        {t("heading")}
      </h1>
      <p className="mt-2 text-sm text-brand-gray">
        {t("summary", { items: totalItems, qty: totalQuantity })}
      </p>

      {topLevelErrorKey ? (
        <div
          role="alert"
          className="mt-6 rounded-btn border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {t(topLevelErrorKey)}
        </div>
      ) : null}

      <form action={formAction} className="mt-6 space-y-5">
        {/* Honeypot: invisible to real visitors (off-screen, aria-hidden,
            out of tab order) but present in the DOM for a naive bot that
            fills every input to fill in. See actions.ts's own comment for
            what happens server-side when this is non-empty. */}
        <div className="absolute -start-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label htmlFor="companyWebsite">Website</label>
          <input
            type="text"
            id="companyWebsite"
            name="companyWebsite"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label={t("labelFullName")}
            name="fullName"
            required
            error={fieldErrors?.fullName}
            t={t}
          />
          <Field
            label={t("labelCompanyName")}
            name="companyName"
            required
            error={fieldErrors?.companyName}
            t={t}
          />
          <Field
            label={t("labelCountry")}
            name="country"
            required
            error={fieldErrors?.country}
            t={t}
          />
          <Field
            label={t("labelCity")}
            name="city"
            required
            error={fieldErrors?.city}
            t={t}
          />
          <Field
            label={t("labelEmail")}
            name="email"
            type="email"
            required
            error={fieldErrors?.email}
            t={t}
          />
          <Field
            label={t("labelPhone")}
            name="phoneWhatsapp"
            type="tel"
            required
            error={fieldErrors?.phoneWhatsapp}
            t={t}
          />
        </div>

        <div>
          <label
            htmlFor="businessType"
            className="mb-1.5 block text-sm font-medium text-brand-black"
          >
            {t("labelBusinessType")}
          </label>
          <select
            id="businessType"
            name="businessType"
            defaultValue=""
            className="w-full rounded-btn border border-brand-border bg-brand-white px-3 py-2.5 text-sm text-brand-black"
          >
            <option value="">{t("businessTypePlaceholder")}</option>
            {BUSINESS_TYPES.map((bt) => (
              <option key={bt.value} value={bt.value}>
                {t(bt.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="message"
            className="mb-1.5 block text-sm font-medium text-brand-black"
          >
            {t("labelMessage")}
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            maxLength={2000}
            className="w-full rounded-btn border border-brand-border bg-brand-white px-3 py-2.5 text-sm text-brand-black"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  error,
  t,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: "required" | "invalid";
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-brand-black"
      >
        {label}
        {required ? " *" : null}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className={
          "w-full rounded-btn border bg-brand-white px-3 py-2.5 text-sm text-brand-black " +
          (error ? "border-red-400" : "border-brand-border")
        }
      />
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-600">
          {t(error === "invalid" ? "fieldErrorInvalid" : "fieldErrorRequired")}
        </p>
      ) : null}
    </div>
  );
}
