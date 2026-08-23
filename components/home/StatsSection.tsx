import { getTranslations } from "next-intl/server";
import StatsGrid, { type StatItem } from "./StatsGrid";

/**
 * "By The Numbers" (Prompt 80) -- placed after VideosSection on the
 * homepage. Content is HARDCODED (client explicitly confirmed this is
 * not dashboard-editable, unlike every other homepage section's real
 * Supabase-backed content) -- no data fetching here at all, which is
 * also why this stays a trivially static/ISR-friendly Server Component
 * with zero query cost.
 *
 * Re-fetched shop-gulforchid.com fresh before building this (same
 * discipline as Prompts 60/61/74) specifically to find a real "By The
 * Numbers"/stat-cards-with-count-up section to replicate -- NONE EXISTS
 * on the reference site's current live homepage. Confirmed via its full,
 * real section inventory (every `id="shopify-section-*"` block present):
 * announcement bar, header, the hero slider, the product tabs, a
 * testimonials block, a reviews block, an "award hero" (brand-
 * positioning banner: "World's Fastest Growing Perfume Brand / Award
 * Winning", with a looping video, NOT stat cards or a count-up), an FAQ,
 * and the footer -- no counter/stats/percentage-card section anywhere.
 * One genuinely useful thing that award-hero section DID confirm: its
 * own heading uses the EXACT same gold-highlight-behind-text technique
 * this project already replicated in Prompt 60/76 (`position:relative`
 * span + an inset-x-0/bottom-10%/height-0.55em background block) --
 * real, independent confirmation that this really is the reference
 * site's consistent heading convention, not a one-off this project
 * over-applied. Since there's no reference stat-card layout to copy,
 * this section's own card styling is built from this project's already-
 * established tokens instead (see StatsGrid.tsx's own comment on the
 * bg-brand-gold/10 card background choice) -- and per that same
 * consistency, the heading below gets the identical gold-highlight
 * treatment as "Our Products"/"See It In Action"/"You May Also Like"
 * (Prompts 60/76), extending an established site-wide pattern rather
 * than inventing a new heading style for the one section that happens
 * to have no reference implementation to check against.
 *
 * CONTENT — placeholder-style, for the client's review, NOT verified
 * business data: the three figures below (50+ fragrance formulations,
 * 15+ export markets, 10+ years of craftsmanship) are illustrative round
 * numbers chosen to be plausible for a wholesale fragrance manufacturer,
 * not measured facts about this specific business. Deliberately avoided
 * precise unverifiable performance claims (e.g. "98% on-time delivery",
 * "97% client satisfaction") -- exactly the kind of overclaim the task
 * itself warned against -- in favor of "+"-suffixed round counts, which
 * read as honest, non-committal placeholders rather than measured
 * statistics. The client should replace these with real figures (or
 * confirm these approximate ones are acceptable) before launch.
 */
export default async function StatsSection() {
  const t = await getTranslations("Stats");

  const stats: StatItem[] = [
    {
      id: "formulations",
      value: 50,
      suffix: "+",
      title: t("formulationsTitle"),
      description: t("formulationsDescription"),
    },
    {
      id: "markets",
      value: 15,
      suffix: "+",
      title: t("marketsTitle"),
      description: t("marketsDescription"),
    },
    {
      id: "experience",
      value: 10,
      suffix: "+",
      title: t("experienceTitle"),
      description: t("experienceDescription"),
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:py-16 lg:px-8">
      {/* Wrap check for the highlight (Prompt 60's own methodology,
          reused): "By The Numbers" (14 chars) and "بالأرقام" (one word)
          are both well short of "Our Products"/"See It In Action", the
          two headings already confirmed single-line at this exact
          type scale -- no new wrapping risk introduced here. */}
      <h2 className="mb-3 text-center text-2xl font-medium text-brand-black md:text-3xl">
        <span className="relative inline-block">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-[10%] -z-10 h-[0.55em] bg-brand-gold/40"
          />
          {t("heading")}
        </span>
      </h2>
      <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-brand-gray md:text-base">
        {t("subheading")}
      </p>
      <StatsGrid stats={stats} />
    </section>
  );
}
