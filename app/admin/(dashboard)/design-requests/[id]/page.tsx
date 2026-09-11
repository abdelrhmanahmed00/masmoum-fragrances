import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { getDesignRequestDetail } from "@/lib/admin/design-requests";
import DesignRequestStatusBadge from "@/components/admin/DesignRequestStatusBadge";
import DesignRequestStatusControl from "@/components/admin/DesignRequestStatusControl";

export const metadata: Metadata = {
  title: "Design Request — Masmoum Admin",
  robots: { index: false, follow: false },
};

// Same plain-English admin-facing labels as /admin/bottle-colors' own
// SLOT_LABELS -- kept as a small local duplicate rather than a shared
// constants file, matching this project's own established
// EXTENSION_BY_MIME_TYPE-style precedent.
const BOTTLE_COLOR_LABELS: Record<string, string> = {
  yellow: "Yellow Cap",
  blue: "Blue Cap",
  fuchsia: "Fuchsia Cap",
  pink: "Pink Cap",
  green: "Green Cap",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** `?download` -- Supabase Storage's public object endpoint honors this
 *  query param by setting a real `Content-Disposition: attachment`
 *  response header (confirmed for real against a live object before
 *  relying on it here, not assumed from docs alone -- see this prompt's
 *  own verification). The plain `download` HTML attribute is added too,
 *  as a same-origin-download hint for whichever browser honors it --
 *  belt and suspenders, not required for this to work. */
function downloadHref(url: string): string {
  return `${url}?download`;
}

// Prompt 142 (Phase C) -- a real page, not a modal (same reasoning as
// Quote Requests' own detail page): customer info + potentially several
// design items, each with several images, is more than a modal
// comfortably holds.
export default async function AdminDesignRequestDetailPage({
  params,
}: PageProps<"/admin/design-requests/[id]">) {
  const { id } = await params;

  const supabase = await createSessionClient();
  const request = await getDesignRequestDetail(supabase, id);

  if (!request) notFound();

  // Best-effort wa.me link -- same digit-stripping as Quote Requests'
  // own detail page and Footer.tsx's wa.me link, not guaranteed to
  // include a country code if the customer didn't type one.
  const whatsappHref = `https://wa.me/${request.customer_phone.replace(/[^\d]/g, "")}`;
  const firstName = request.customer_name.split(" ")[0];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/admin/design-requests"
        className="text-sm text-brand-gray underline-offset-2 hover:text-brand-black hover:underline"
      >
        ← Back to Design Requests
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-black">
            {request.customer_name}
          </h1>
          <p className="mt-1 text-sm text-brand-gray">
            Submitted {DATE_FORMATTER.format(new Date(request.created_at))} —{" "}
            {request.items.length} design{request.items.length === 1 ? "" : "s"}
          </p>
        </div>
        <DesignRequestStatusBadge status={request.status} />
      </div>

      {/* Customer info -- same shape/tone as Quote Requests' own
          "Contact Details" section (name/email/phone/company +
          click-to-contact shortcuts), for consistency across the two
          request systems (this prompt's own explicit instruction). */}
      <section className="mt-8 rounded-card border border-brand-border bg-brand-white p-6">
        <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
          Customer
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-brand-gray uppercase">Name</dt>
            <dd className="mt-0.5 text-sm text-brand-black">
              {request.customer_name}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-gray uppercase">Company</dt>
            <dd className="mt-0.5 text-sm text-brand-black">
              {request.customer_company}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-gray uppercase">Email</dt>
            <dd className="mt-0.5 text-sm">
              <a
                href={`mailto:${request.customer_email}`}
                className="text-brand-black underline-offset-2 hover:underline"
              >
                {request.customer_email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-gray uppercase">
              Phone / WhatsApp
            </dt>
            <dd className="mt-0.5 text-sm">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="text-brand-black underline-offset-2 hover:underline"
              >
                {request.customer_phone}
              </a>
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-3 border-t border-brand-border pt-5">
          <a
            href={`mailto:${request.customer_email}`}
            className="rounded-btn border border-brand-black px-4 py-2 text-sm font-medium text-brand-black transition-colors hover:bg-brand-black hover:text-brand-white"
          >
            Email {firstName}
          </a>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-btn border border-brand-black px-4 py-2 text-sm font-medium text-brand-black transition-colors hover:bg-brand-black hover:text-brand-white"
          >
            WhatsApp {firstName}
          </a>
        </div>
      </section>

      {/* Design items -- Prompt 142 (Phase C): looped, not a single
          composite/logo pair, since one request can now hold several
          saved designs (Phase B). Each item shows its own composite,
          EVERY one of its own logos (looped again -- Phase A), and its
          own note. Download links/buttons on every image (this prompt's
          own explicit, previously-flagged-as-outstanding requirement). */}
      <section className="mt-6 space-y-6">
        {request.items.map((item, index) => (
          <div
            key={item.id}
            className="rounded-card border border-brand-border bg-brand-white p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
                Design {index + 1} —{" "}
                {BOTTLE_COLOR_LABELS[item.bottle_color] ?? item.bottle_color}
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Composite */}
              <div>
                <p className="text-xs text-brand-gray uppercase">
                  Composite Design
                </p>
                <div className="relative mt-2 aspect-3/4 w-full overflow-hidden rounded-btn bg-brand-surface">
                  {/* Plain <img>, not next/image -- same admin-preview
                      convention as every other Storage-backed image in
                      the admin dashboard. */}
                  <img
                    src={item.compositeImageUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
                <a
                  href={downloadHref(item.compositeImageUrl)}
                  download
                  className="mt-2 inline-block text-xs text-brand-black underline-offset-2 hover:underline"
                >
                  Download composite
                </a>
              </div>

              {/* Every logo used in this design */}
              <div>
                <p className="text-xs text-brand-gray uppercase">
                  Logo{item.logos.length === 1 ? "" : "s"} ({item.logos.length})
                </p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {item.logos.map((logo, logoIndex) => (
                    <div key={logo.id}>
                      <div className="relative aspect-square w-full overflow-hidden rounded-btn bg-brand-surface">
                        <img
                          src={logo.logoImageUrl}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <a
                        href={downloadHref(logo.logoImageUrl)}
                        download
                        className="mt-1 inline-block text-xs text-brand-black underline-offset-2 hover:underline"
                      >
                        Download logo {logoIndex + 1}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {item.note ? (
              <div className="mt-4 border-t border-brand-border pt-4">
                <p className="text-xs text-brand-gray uppercase">Note</p>
                <p className="mt-1 text-sm whitespace-pre-wrap text-brand-black">
                  {item.note}
                </p>
              </div>
            ) : null}
          </div>
        ))}
      </section>

      {/* Status -- on the PARENT request, unchanged shape/control. */}
      <section className="mt-6 rounded-card border border-brand-border bg-brand-white p-6">
        <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
          Status
        </h2>
        <div className="mt-4">
          <DesignRequestStatusControl id={request.id} currentStatus={request.status} />
        </div>
      </section>
    </div>
  );
}
