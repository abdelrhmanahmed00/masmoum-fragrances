import { getLocale, getTranslations } from "next-intl/server";
import { getWhatsAppNumber, buildWhatsAppHref } from "@/lib/whatsapp";

/**
 * Prompt 122 -- a persistent floating "chat with us" entry point, fixed
 * to the bottom-right corner of the viewport on every public page.
 *
 * Deliberately a plain async Server Component, not a Client Component:
 * it renders one static <a> server-side with zero client state or
 * interactivity beyond the browser's own default link-click behavior --
 * same "server fetches the data, no client boundary needed" reasoning as
 * Footer.tsx itself (which only reaches for a small client LEAF,
 * FooterContactAccordion, for its own expand/collapse state -- this
 * component has nothing equivalent to need one for).
 *
 * Mounted once in the root locale layout (app/[locale]/layout.tsx),
 * alongside Header/Footer/QuoteSidebar -- NOT under /admin, which lives
 * under its own separate app/admin/layout.tsx tree entirely outside
 * app/[locale]/ (confirmed via the real route structure, not assumed;
 * same reason Header/Footer/QuoteSidebar already never render there
 * either). No `no-store`/exclusion logic needed here for that -- it's
 * structural, the same way it already is for every other root-layout-only
 * element in this project.
 *
 * Position is fixed bottom-right using PHYSICAL `right-*`/`bottom-*`
 * classes, NOT this project's usual `end-*`/`start-*` logical-property
 * convention -- a deliberate, explicit exception per the client's own
 * decision (this prompt's own spec): floating chat widgets conventionally
 * stay in the same visual corner regardless of language, unlike this
 * project's actual bidirectional content (QuoteSidebar's off-canvas edge,
 * the mobile drawer, etc.), which correctly mirrors under dir="rtl". This
 * is the one deliberate non-mirroring exception in the project, not an
 * oversight -- verified live in both locales, see the Prompt 122 report.
 *
 * z-40 -- sits below the mobile nav drawer (z-[60], HeaderClient.tsx) and
 * the QuoteSidebar (z-70, QuoteSidebar.tsx), both full-viewport overlays
 * with their own backdrop that should visually cover this button while
 * open rather than have it float above them; below the header (z-50) too,
 * for consistency with "lowest-priority layer in the existing overlay
 * stack," even though this button sits in the opposite corner and never
 * spatially overlaps the header regardless of z-index. Comfortably above
 * ordinary page content (which carries no z-index, i.e. auto/0).
 *
 * Sized h-14 w-14 (56px) -- above this project's own established 44px
 * minimum interactive-element size (QuoteQuantityStepper.tsx's own
 * comment cites this exact number, h-11/w-11), matching the conventional
 * size for a WhatsApp-style floating action button.
 *
 * Renders nothing when contact_whatsapp is unset -- same graceful-
 * disable pattern as every other WhatsApp touchpoint in this project
 * (Footer.tsx's own two whatsapp-gated blocks).
 *
 * No pre-filled message (unlike Footer's own "Quick Price Inquiry" link)
 * -- buildWhatsAppHref is called with no second argument, per this
 * prompt's own explicit "general chat with us entry point, distinct from
 * the Footer's specific pre-filled link" spec.
 */
export default async function FloatingWhatsAppButton() {
  const locale = await getLocale();
  const t = await getTranslations("Footer");
  const whatsapp = await getWhatsAppNumber(locale);

  if (!whatsapp) return null;

  return (
    <a
      href={buildWhatsAppHref(whatsapp)}
      target="_blank"
      rel="noreferrer"
      aria-label={t("contactWhatsappLabel")}
      className="fixed right-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-brand transition-transform hover:scale-105 sm:right-6 sm:bottom-6"
    >
      {/* Real WhatsApp glyph, inline SVG -- no external image dependency,
          matching this project's own "7 real dependencies, zero
          animation/image libraries" discipline (Prompt 82/102/105's own
          precedent). Path data is the standard WhatsApp glyph. */}
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12.004 2C6.486 2 2.004 6.482 2.004 12c0 1.85.501 3.663 1.451 5.243L2 22l4.879-1.417A9.96 9.96 0 0012.004 22C17.522 22 22.004 17.518 22.004 12S17.522 2 12.004 2zm0 18.171a8.14 8.14 0 01-4.152-1.135l-.298-.177-3.09.898.906-3.164-.194-.318A8.15 8.15 0 013.85 12c0-4.502 3.653-8.155 8.154-8.155 4.502 0 8.155 3.653 8.155 8.155 0 4.502-3.653 8.171-8.155 8.171z" />
      </svg>
    </a>
  );
}
