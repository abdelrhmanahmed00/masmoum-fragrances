"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useDesignRequest } from "@/components/design-your-bottle/DesignRequestProvider";
import {
  submitDesignRequestCart,
  type DesignRequestCartItem,
} from "@/lib/design-requests";
import { EMAIL_PATTERN } from "@/lib/form-utils";

type FieldErrors = Partial<
  Record<"name" | "email" | "phone" | "company", "required" | "invalid">
>;

/**
 * Prompt 143 (Phase D) -- customer-info + final submission for the
 * Custom Bottle Designer's whole saved-designs cart. Reuses
 * quote_requests' own real field set (name/email/phone/company -- see
 * this component's own field ids below, matching QuoteRequestForm.tsx's
 * naming convention) and this project's established form UI (the same
 * Field pattern, the same top-level-error-banner-above-the-form
 * convention) -- deliberately NOT a new visual language, per this
 * prompt's own explicit instruction.
 *
 * PLAIN CLIENT STATE, NOT useActionState/a Server Action -- a real,
 * deliberate divergence from QuoteRequestForm's own pattern, not an
 * oversight: this submission's actual work (uploading every design's
 * composite/logo Blobs, inserting the 3-level design_requests rows) has
 * to run client-side regardless (see lib/design-requests.ts's own top
 * comment for the full "why no Server Action" reasoning, unchanged
 * here) -- there is no FormData/server round-trip in this flow to hang
 * useActionState off of in the first place.
 *
 * EMPTY-CART GUARD: if `savedDesigns` is empty (either a customer
 * navigated here directly with nothing saved, or a full page reload
 * happened -- see DesignRequestProvider.tsx's own comment on why this
 * state can't survive a reload), redirect back to the designer, same
 * "can't trust a client-only empty state, so guard against it" reasoning
 * as QuoteRequestForm's own empty-quote redirect. Guarded on
 * `!submitSuccess` so `clearSavedDesigns()` firing on a genuine
 * successful submission doesn't immediately bounce the customer away
 * from their own confirmation screen.
 */
export default function DesignRequestForm() {
  const t = useTranslations("DesignRequestForm");
  const tDesigner = useTranslations("BottleDesigner");
  const router = useRouter();
  const { savedDesigns, clearSavedDesigns } = useDesignRequest();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showValidationBanner, setShowValidationBanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (savedDesigns.length === 0 && !submitSuccess) {
      router.replace("/design-your-bottle");
    }
  }, [savedDesigns.length, submitSuccess, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = "required";
    if (!email.trim()) {
      errors.email = "required";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = "invalid";
    }
    if (!phone.trim()) errors.phone = "required";
    if (!company.trim()) errors.company = "required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setShowValidationBanner(true);
      return;
    }
    setFieldErrors({});
    setShowValidationBanner(false);
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Each design's ACTIVE logo url (background-removed if the
      // customer used that button for it, original otherwise) -- the
      // same resolution rule BottleDesigner.tsx's own canvas overlay and
      // generateCompositeImage already use, applied here identically so
      // what gets uploaded always matches what the composite (already
      // rendered at save time -- see DesignRequestProvider.tsx's own
      // `thumbnailUrl` comment) actually shows.
      const designs: DesignRequestCartItem[] = savedDesigns.map((design) => ({
        bottleColor: design.bottleColor,
        note: design.note,
        compositeUrl: design.thumbnailUrl,
        logoUrls: design.logos.map((logo) =>
          logo.useProcessed && logo.processedUrl ? logo.processedUrl : logo.originalUrl
        ),
      }));

      const result = await submitDesignRequestCart({
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        customerCompany: company.trim(),
        designs,
      });

      if (result.status === "success") {
        clearSavedDesigns();
        setSubmitSuccess(true);
      } else {
        setSubmitError(result.message);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong submitting your request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Same checkmark-circle/heading/message/action-button pattern as
  // /quote/confirmed (this prompt's own explicit "reuse the existing
  // tone, don't invent new confirmation language" instruction).
  if (submitSuccess) {
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
          {t("successHeading")}
        </h1>
        <p className="mt-3 text-sm text-brand-gray">{t("successMessage")}</p>

        <Link
          href="/"
          className="mt-8 rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black"
        >
          {t("backToHome")}
        </Link>
      </div>
    );
  }

  // About to redirect (the effect above) -- nothing meaningful to show,
  // same pattern as QuoteRequestForm's own empty-quote guard.
  if (savedDesigns.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12 lg:px-8">
      <Link
        href="/design-your-bottle"
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
        {t("backToDesigner")}
      </Link>

      <h1 className="mt-4 text-2xl font-medium text-brand-black md:text-3xl">
        {t("heading")}
      </h1>
      <p className="mt-2 text-sm text-brand-gray">
        {t("summary", { count: savedDesigns.length })}
      </p>

      {/* Design summary -- every design being submitted, each shown as
          the same real thumbnail "My Designs" already uses. */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
          {t("yourDesignsHeading")}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {savedDesigns.map((design) => (
            <div
              key={design.id}
              className="rounded-card border border-brand-border p-3"
            >
              <div className="relative aspect-3/4 w-full overflow-hidden rounded-btn bg-brand-surface">
                <img
                  src={design.thumbnailUrl}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
              <p className="mt-2 text-sm font-medium text-brand-black">
                {tDesigner(`color.${design.bottleColor}`)}
              </p>
              <p className="text-xs text-brand-gray">
                {tDesigner("designLogoCount", { count: design.logos.length })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {showValidationBanner ? (
        <div
          role="alert"
          className="mt-6 rounded-btn border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {t("errorValidation")}
        </div>
      ) : null}
      {submitError ? (
        <div
          role="alert"
          className="mt-6 rounded-btn border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {submitError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="design-request-name"
            label={t("labelName")}
            value={name}
            onChange={setName}
            error={fieldErrors.name}
            t={t}
          />
          <Field
            id="design-request-company"
            label={t("labelCompany")}
            value={company}
            onChange={setCompany}
            error={fieldErrors.company}
            t={t}
          />
          <Field
            id="design-request-email"
            label={t("labelEmail")}
            type="email"
            value={email}
            onChange={setEmail}
            error={fieldErrors.email}
            t={t}
          />
          <Field
            id="design-request-phone"
            label={t("labelPhone")}
            type="tel"
            value={phone}
            onChange={setPhone}
            error={fieldErrors.phone}
            t={t}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  error,
  t,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: "required" | "invalid";
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-brand-black"
      >
        {label} *
      </label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={
          "w-full rounded-btn border bg-brand-white px-3 py-2.5 text-sm text-brand-black " +
          (error ? "border-red-400" : "border-brand-border")
        }
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          {t(error === "invalid" ? "fieldErrorInvalid" : "fieldErrorRequired")}
        </p>
      ) : null}
    </div>
  );
}
