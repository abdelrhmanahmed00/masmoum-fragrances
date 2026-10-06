import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Prompt 197, Phase 3 -- optional replacement for the removed home-videos
 * carousel. A static, text-and-icon-only 4-step "how it works" strip aimed
 * at a wholesale B2B buyer's actual purchase flow (quote -> catalog ->
 * design -> fulfillment), each step linking to the existing page that
 * carries it out. No images/video by design (that's the whole point of
 * this being the lightweight replacement option).
 *
 * Plain async Server Component, same reasoning as CategoryTemplatesStrip.tsx:
 * nothing here is interactive (no autoplay/mute state like the removed
 * VideosCarousel), so no "use client" boundary is needed.
 *
 * No icon library exists in this project (confirmed zero lucide/heroicons
 * deps) -- the 4 icons below are hand-rolled inline SVGs matching the
 * existing minimalist stroke style used by ProductCard.tsx/
 * CategoryTemplatesStrip.tsx's own empty-state glyphs (viewBox 0 0 24 24,
 * stroke="currentColor", strokeWidth 1.5, round caps/joins).
 */

function QuoteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h9l4 4v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 3v4h4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 13h8M8 17h5" />
    </svg>
  );
}

function BottleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 2h4M11 2v3.5L8.5 8A3 3 0 008 9.8V20a1 1 0 001 1h6a1 1 0 001-1V9.8a3 3 0 00-.5-1.8L13 5.5V2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 13h7" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19 4 20z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6.5L17 10" />
    </svg>
  );
}

function ShipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4-9 4-9-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10l9 4 9-4V7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v10" />
    </svg>
  );
}

type Step = {
  href: string;
  Icon: () => ReactNode;
  title: string;
  description: string;
};

export default async function HowItWorksSection() {
  const t = await getTranslations("HowItWorks");

  const steps: Step[] = [
    { href: "/quote", Icon: QuoteIcon, title: t("step1Title"), description: t("step1Description") },
    { href: "/products", Icon: BottleIcon, title: t("step2Title"), description: t("step2Description") },
    { href: "/design-your-bottle", Icon: PencilIcon, title: t("step3Title"), description: t("step3Description") },
    { href: "/private-label", Icon: ShipIcon, title: t("step4Title"), description: t("step4Description") },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:py-16 lg:px-8">
      <h2 className="mb-2 text-center text-2xl font-medium text-brand-black md:text-3xl">
        <span className="relative inline-block">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-[10%] -z-10 h-[0.55em] bg-brand-gold/40"
          />
          {t("heading")}
        </span>
      </h2>
      <p className="mx-auto mb-10 max-w-xl text-center text-sm text-brand-gray md:text-base">
        {t("subheading")}
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <Link
            key={step.href}
            href={step.href}
            className="group relative flex flex-col items-start gap-3 rounded-card border border-brand-border p-6 transition-colors hover:border-brand-gold"
          >
            <span className="absolute end-6 top-6 text-sm font-medium text-brand-gold">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold/15 text-brand-black">
              <step.Icon />
            </span>
            <h3 className="text-base font-bold text-brand-black">{step.title}</h3>
            <p className="text-sm text-brand-gray">{step.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
