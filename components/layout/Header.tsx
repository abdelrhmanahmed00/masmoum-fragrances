import { getActiveCategoriesList } from "@/lib/catalog";
import HeaderClient from "./HeaderClient";

/**
 * Prompt 50 — the flat nav links (Perfumes/Body Mist/Home Fragrance/
 * About/Contact, hardcoded since Prompt 5) are replaced by a single
 * categories dropdown/expandable group, populated from the REAL
 * categories table -- the exact same getActiveCategoriesList()
 * (lib/catalog.ts) the homepage's own category tabs already use (Prompt
 * 24), not a duplicate query. This is why Header itself now has to be an
 * async Server Component (it wasn't before -- the whole thing was
 * "use client" purely for useState + useQuote()): fetching categories
 * needs server-side data access, but the mobile drawer/dropdown
 * open-state and useQuote() still need a client boundary. Same split
 * already established elsewhere in this project for "server data +
 * client interactivity" (VideosSection.tsx fetches, VideosCarousel.tsx
 * is the client half) -- HeaderClient below is that same shape.
 *
 * Tagged "categories" (inherited from getActiveCategoriesList's own
 * createPublicClient call) -- an admin adding/renaming/deactivating a
 * category already calls updateTag("categories")
 * (app/admin/(dashboard)/categories/actions.ts), so the header's dropdown
 * picks up the change on the very next request, same as every other
 * category-driven surface (homepage tabs, category filter pills, ...).
 * No new tag/mutation needed for this prompt.
 */
export default async function Header() {
  const categories = await getActiveCategoriesList();
  return <HeaderClient categories={categories} />;
}
