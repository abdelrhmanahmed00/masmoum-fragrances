"use client";

import { useState } from "react";
import ChevronIcon from "./ChevronIcon";
import type { ContentBlock } from "@/lib/content-blocks";

/**
 * Prompt 91 -- the Footer's "Contact Us" list item, converted from a dead
 * `/contact` link (Prompt 48's own flagged gap) into a real expand/
 * collapse accordion. Extracted into its own small Client Component
 * rather than making the whole Footer "use client": Footer.tsx itself
 * stays a plain async Server Component doing its normal cached data
 * fetches (site_settings, the "about" page row) -- only the open/closed
 * `useState` and the click handler need a client boundary, same "server
 * fetches, a small client leaf owns the interactivity" split already
 * established for Header/HeaderClient.
 *
 * ChevronIcon: the exact same shared component the Header's Menu
 * dropdown/mobile accordion already uses (components/layout/
 * ChevronIcon.tsx, extracted from HeaderClient.tsx this same prompt) --
 * real visual consistency, not a lookalike re-implementation.
 *
 * `summaryBlocks` arrives already parsed (Footer.tsx calls
 * parseContentBlocks on the "about" page's footer_summary_en/ar) --
 * this component only renders blocks, it doesn't know or care that the
 * source was a pages-CMS row. Sized for the Footer's own existing
 * text-sm/text-brand-gray convention (NOT PageContent.tsx's larger
 * page-body typography, which would look oversized crammed into a
 * footer column) -- headings render as a bold text-brand-black label
 * line rather than a full <h2>, since a "page-within-a-footer" section
 * heading would overstate this compact panel's own hierarchy.
 */
export default function FooterContactAccordion({
  label,
  summaryBlocks,
  email,
  emailLabel,
  phone,
  phoneLabel,
}: {
  label: string;
  summaryBlocks: ContentBlock[];
  email: string | null;
  emailLabel: string;
  phone: string | null;
  phoneLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm text-brand-gray transition-colors hover:text-brand-black"
        aria-expanded={isOpen}
        aria-controls="footer-contact-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{label}</span>
        <ChevronIcon open={isOpen} />
      </button>

      <div
        id="footer-contact-panel"
        className={
          "space-y-2 pt-2 text-sm text-brand-gray " +
          (isOpen ? "block" : "hidden")
        }
      >
        {summaryBlocks.map((block, index) => {
          if (block.type === "heading") {
            return (
              <p
                key={index}
                className="pt-1 font-medium text-brand-black first:pt-0"
              >
                {block.text}
              </p>
            );
          }
          if (block.type === "list") {
            return (
              <ul key={index} className="list-inside list-disc space-y-1">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={index} className="whitespace-pre-line">
              {block.text}
            </p>
          );
        })}

        {/* Same mailto:/tel: convention as the neighboring "Contact Us"
            column (Prompt 11) -- graceful per-line omission, not a
            second gate on the whole accordion (that gate already
            happened in Footer.tsx before this component was even
            rendered). */}
        {email ? (
          <p>
            {emailLabel}:{" "}
            <a
              href={`mailto:${email}`}
              className="transition-colors hover:text-brand-black"
            >
              {email}
            </a>
          </p>
        ) : null}
        {phone ? (
          <p>
            {phoneLabel}:{" "}
            <a
              href={`tel:${phone}`}
              className="transition-colors hover:text-brand-black"
            >
              {phone}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
