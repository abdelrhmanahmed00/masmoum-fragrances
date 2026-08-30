import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createPublicClient } from "@/lib/supabase/server";
import { REVALIDATE_SECONDS } from "@/lib/config";
import { getPrivateLabelImageMap } from "@/lib/private-label";
import PrivateLabelHero from "@/components/private-label/PrivateLabelHero";
import PrivateLabelExperience from "@/components/private-label/PrivateLabelExperience";
import PrivateLabelFeatureBlock, {
  type FeatureBlockItem,
} from "@/components/private-label/PrivateLabelFeatureBlock";
import PrivateLabelComparisonTable from "@/components/private-label/PrivateLabelComparisonTable";
import PrivateLabelClosingCta from "@/components/private-label/PrivateLabelClosingCta";

// Prompt 94 (Phase 3) -- the 3 items per feature block, keyed to the
// translation keys added under PrivateLabel.blockAItem*/blockBItem* in
// messages/en.json + ar.json. Order here IS the real reference's own
// item order (Private Label Perfumes -> Creative Design & Packaging ->
// Quality in Manufacturing, and Private Label Expertise -> Custom
// Fragrance Design -> Premium Manufacturing), confirmed via the real
// markup -- see PrivateLabelFeatureBlock.tsx's own top comment.
const BLOCK_A_ITEMS: readonly FeatureBlockItem[] = [
  { titleKey: "blockAItem1Title", textKey: "blockAItem1Text" },
  { titleKey: "blockAItem2Title", textKey: "blockAItem2Text" },
  { titleKey: "blockAItem3Title", textKey: "blockAItem3Text" },
];
const BLOCK_B_ITEMS: readonly FeatureBlockItem[] = [
  { titleKey: "blockBItem1Title", textKey: "blockBItem1Text" },
  { titleKey: "blockBItem2Title", textKey: "blockBItem2Text" },
  { titleKey: "blockBItem3Title", textKey: "blockBItem3Text" },
];

// Prompt 92 -- own dedicated top-level route (sibling to /products,
// /quote, ...), NOT the generic /pages/[slug] Pages-CMS route the OLD
// private-label content lived under (Prompt 25/49). See this prompt's
// own report for the full architecture-decision writeup: special-casing
// one hardcoded slug inside a route meant to be fully generic would
// couple that generic system to a permanent exception; a real dedicated
// route keeps the Pages CMS honestly generic and gives this fully
// custom, multi-section design its own natural home, matching how
// /products (Prompt 25) already has its own dedicated route rather than
// living under a generic listing mechanism.
//
// Same ISR discipline as every other marketing page: no searchParams
// read, so this stays a plain static/ISR page (confirmed via the real
// build output, see this prompt's own report).
export const revalidate = 1800; // REVALIDATE_SECONDS.marketing

export const metadata: Metadata = {
  title: "Private Label — Masmoum Fragrances",
};

/** Prompt 88's own contact_whatsapp read, reused here rather than
 *  duplicated ad hoc -- same tag/revalidate window as Footer.tsx's own
 *  getContactSettings, scoped to just the one key this page needs. */
async function getWhatsappNumber(): Promise<string | null> {
  const supabase = createPublicClient(REVALIDATE_SECONDS.siteSettings, [
    "site_settings",
  ]);
  const { data, error } = await supabase
    .from("site_settings")
    .select("value_en")
    .eq("key", "contact_whatsapp")
    .maybeSingle();

  const trimmed = data?.value_en?.trim();
  return error || !trimmed ? null : trimmed;
}

export default async function PrivateLabelPage({
  params,
}: PageProps<"/[locale]/private-label">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("PrivateLabel");

  const [images, whatsapp] = await Promise.all([
    getPrivateLabelImageMap(),
    getWhatsappNumber(),
  ]);

  // CTA target: WhatsApp (with a private-label-specific pre-filled
  // message, same wa.me + digit-strip convention as Prompt 88/89's
  // footer link) when contact_whatsapp is actually configured --
  // "Get In Touch" for a private-label inquiry is inherently a
  // conversation-starter, not "add this catalog item to a cart," so a
  // direct chat is the better default destination. But this is the
  // PAGE'S OWN primary call-to-action, not a supplementary footer link
  // -- unlike Footer.tsx's WhatsApp links (which just disappear when
  // unset, an acceptable secondary-link degradation), this button must
  // never silently vanish or dead-end. Falls back to /quote (always a
  // real, working destination, no external config dependency) when
  // WhatsApp isn't configured -- still gets the visitor into a real
  // conversion path rather than a broken/missing button.
  // Locale-prefixed explicitly for the /quote fallback -- PrivateLabelHero
  // renders this as a plain <a>, not the locale-aware Link component
  // (the WhatsApp branch is an external URL and genuinely needs a plain
  // <a target="_blank">, so the component takes one href prop either
  // way; the prefix has to be resolved here instead).
  const ctaHref = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(t("whatsappMessage"))}`
    : `/${locale}/quote`;

  return (
    <>
      {/* Prompt 102 -- no-JS fallback for components/private-label/
          Reveal.tsx's scroll-reveal animations: server-rendered HTML
          includes the pre-reveal (hidden) classes, so a visitor with
          JS genuinely disabled would otherwise see permanently
          offset/transparent content. Added once here (not per-section)
          since it targets the one shared `.pl-reveal` class every
          Reveal instance carries. */}
      <noscript>
        <style>{`.pl-reveal{opacity:1!important;transform:none!important}`}</style>
      </noscript>
      <PrivateLabelHero imageUrl={images.hero} ctaHref={ctaHref} />
      {/* Prompt 101 -- the 6-tile image grid section (Prompt 92, Phase 1)
          was removed entirely per client request. Page now flows
          straight from Hero to Experience -- see this prompt's own
          report for verification that no visual gap/broken spacing was
          left behind. */}
      <PrivateLabelExperience imageUrl={images.experience} />
      {/* Prompt 104 -- background="white"/"black" here is the deliberate
          rhythm sequence (white, beige, white, black, gray, white,
          black) -- see PrivateLabelFeatureBlock.tsx's own top comment
          for the full reasoning. */}
      <PrivateLabelFeatureBlock
        imageUrl={images.block_a}
        imagePosition="start"
        items={BLOCK_A_ITEMS}
        paddingClassName="pt-[8%] pb-0"
        background="white"
      />
      <PrivateLabelFeatureBlock
        imageUrl={images.block_b}
        imagePosition="end"
        items={BLOCK_B_ITEMS}
        paddingClassName="pt-[12%] pb-[12%]"
        background="black"
      />
      <PrivateLabelComparisonTable />
      <PrivateLabelClosingCta imageUrl={images.cta_background} ctaHref={ctaHref} />
    </>
  );
}
