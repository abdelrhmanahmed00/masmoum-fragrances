import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import {
  getQuoteRequestDetail,
  getQuoteRequestItems,
} from "@/lib/admin/quote-requests";
import QuoteStatusBadge from "@/components/admin/QuoteStatusBadge";
import QuoteStatusControl from "@/components/admin/QuoteStatusControl";

export const metadata: Metadata = {
  title: "Quote Request — Masmoum Admin",
  robots: { index: false, follow: false },
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// A real page, not a modal (task's own framing) -- full contact record +
// a line-item table is more content than a modal comfortably holds, and
// this is the kind of thing an admin might want to open in its own tab
// or bookmark/share internally.
export default async function AdminQuoteRequestDetailPage({
  params,
}: PageProps<"/admin/quote-requests/[id]">) {
  const { id } = await params;

  const supabase = await createSessionClient();
  const [request, items] = await Promise.all([
    getQuoteRequestDetail(supabase, id),
    getQuoteRequestItems(supabase, id),
  ]);

  if (!request) notFound();

  // Best-effort wa.me link from whatever the buyer typed into
  // phone_whatsapp (0008 migration: plain required text, no format
  // enforcement at submission -- same reasoning QuoteRequestForm's own
  // field already documents). Same digit-stripping as Footer.tsx's own
  // wa.me link (Prompt 44) -- not guaranteed to include a country code if
  // the buyer didn't type one, but it's the same best-effort convenience
  // link, not a validated/guaranteed-correct one.
  const whatsappHref = `https://wa.me/${request.phone_whatsapp.replace(/[^\d]/g, "")}`;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/admin/quote-requests"
        className="text-sm text-brand-gray underline-offset-2 hover:text-brand-black hover:underline"
      >
        ← Back to Quote Requests
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-black">
            {request.full_name}
          </h1>
          <p className="mt-1 text-sm text-brand-gray">
            Submitted {DATE_FORMATTER.format(new Date(request.created_at))}
          </p>
        </div>
        <QuoteStatusBadge status={request.status} />
      </div>

      {/* Contact details */}
      <section className="mt-8 rounded-card border border-brand-border bg-brand-white p-6">
        <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
          Contact Details
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-brand-gray uppercase">Full Name</dt>
            <dd className="mt-0.5 text-sm text-brand-black">
              {request.full_name}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-gray uppercase">
              Company Name
            </dt>
            <dd className="mt-0.5 text-sm text-brand-black">
              {request.company_name}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-gray uppercase">Country</dt>
            <dd className="mt-0.5 text-sm text-brand-black">
              {request.country}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-gray uppercase">City</dt>
            <dd className="mt-0.5 text-sm text-brand-black">
              {request.city ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-gray uppercase">Email</dt>
            <dd className="mt-0.5 text-sm">
              <a
                href={`mailto:${request.email}`}
                className="text-brand-black underline-offset-2 hover:underline"
              >
                {request.email}
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
                {request.phone_whatsapp}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-gray uppercase">
              Business Type
            </dt>
            <dd className="mt-0.5 text-sm text-brand-black">
              {request.business_type ?? "—"}
            </dd>
          </div>
        </dl>
        {request.message ? (
          <div className="mt-4">
            <dt className="text-xs text-brand-gray uppercase">
              Message / Notes
            </dt>
            <dd className="mt-1 text-sm whitespace-pre-wrap text-brand-black">
              {request.message}
            </dd>
          </div>
        ) : null}

        {/* Click-to-contact shortcuts (task requirement) -- the fields
            above are already links, these two buttons are just a more
            prominent, unmissable version of the same href for quick
            admin action. */}
        <div className="mt-5 flex flex-wrap gap-3 border-t border-brand-border pt-5">
          <a
            href={`mailto:${request.email}`}
            className="rounded-btn border border-brand-black px-4 py-2 text-sm font-medium text-brand-black transition-colors hover:bg-brand-black hover:text-brand-white"
          >
            Email {request.full_name.split(" ")[0]}
          </a>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-btn border border-brand-black px-4 py-2 text-sm font-medium text-brand-black transition-colors hover:bg-brand-black hover:text-brand-white"
          >
            WhatsApp {request.full_name.split(" ")[0]}
          </a>
        </div>
      </section>

      {/* Requested items */}
      <section className="mt-6 rounded-card border border-brand-border bg-brand-white p-6">
        <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
          Requested Items
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-brand-border text-xs tracking-wide text-brand-gray uppercase">
                <th className="py-2 text-start font-medium">Product</th>
                <th className="py-2 text-start font-medium">Size</th>
                <th className="py-2 text-start font-medium">Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-brand-border last:border-0">
                  <td className="py-2.5 text-brand-black">
                    {item.product_name_en}
                  </td>
                  <td className="py-2.5 text-brand-gray">
                    {item.size_label ?? "N/A"}
                  </td>
                  <td className="py-2.5 text-brand-gray">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Status */}
      <section className="mt-6 rounded-card border border-brand-border bg-brand-white p-6">
        <h2 className="text-sm font-semibold tracking-wide text-brand-black uppercase">
          Status
        </h2>
        <div className="mt-4">
          <QuoteStatusControl id={request.id} currentStatus={request.status} />
        </div>
      </section>
    </div>
  );
}
