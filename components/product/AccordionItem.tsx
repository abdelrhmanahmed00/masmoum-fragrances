"use client";

import { useState } from "react";

/**
 * CONFIRMED from the reference site (re-fetched shop-gulforchid.com/
 * products/belgravia and inspected directly): the Delivery/Description/
 * Notes sections are a JS-driven accordion (`<button aria-expanded>` +
 * a wrapper whose height is toggled and CSS-transitioned), NOT native
 * <details> — confirmed no <details> element anywhere on the page. Icon
 * rotates 45deg on expand: `[aria-expanded="true"] .vikst-toggle-icon {
 * transform: rotate(45deg) }`, turning "+" into "×" visually — replicated
 * here exactly.
 *
 * Implementation differs from the reference's own JS (which measures
 * scrollHeight and animates a pixel height): this uses the CSS grid
 * `0fr`/`1fr` row-track trick instead, which animates smoothly to the
 * content's natural height without any DOM measurement — same visual
 * outcome, simpler React implementation.
 */
export default function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-brand-border first:border-t">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="grid w-full grid-cols-[1fr_auto] items-center gap-4 py-4 text-start text-base font-medium text-brand-black"
      >
        <span>{title}</span>
        <span
          aria-hidden="true"
          className={
            "text-xl leading-none transition-transform duration-300 " +
            (isOpen ? "rotate-45" : "")
          }
        >
          +
        </span>
      </button>
      <div
        className={
          "grid transition-[grid-template-rows] duration-300 ease-in-out " +
          (isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")
        }
      >
        <div className="overflow-hidden">
          <div className="pb-4 text-sm text-brand-gray">{children}</div>
        </div>
      </div>
    </div>
  );
}
