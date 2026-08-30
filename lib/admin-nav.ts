export type AdminSection = {
  href: string;
  label: string;
  description: string;
};

/**
 * Single source of truth for the admin management areas (Prompt 22's
 * original 7, plus Pages added in Prompt 49, plus Brands added in
 * Prompt 86, plus Private Label added in Prompt 92). Used by both
 * SidebarNav (label + href) and the dashboard home's quick-link cards
 * (label + href + description), so adding, renaming, or reordering a
 * section only ever happens in one place.
 */
export const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/admin/categories",
    label: "Categories",
    description:
      "The 6 seeded categories (Perfumes, Body Mist, Hair Mist, Deodorant, Roll-On, Home Fragrance) and any new ones.",
  },
  {
    href: "/admin/collections",
    label: "Collections",
    description:
      "Cross-cutting tags like Luxury and Best Sellers, used as homepage tabs.",
  },
  {
    href: "/admin/brands",
    label: "Brands",
    description:
      "Brand names assignable to products (Phase A — not shown publicly yet).",
  },
  {
    href: "/admin/products",
    label: "Products",
    description:
      "The core catalog — name, category, gender, sizes, images, fragrance notes, MOQ, description.",
  },
  {
    href: "/admin/hero-slides",
    label: "Hero Slides",
    description: "The homepage's rotating banner images.",
  },
  {
    href: "/admin/home-videos",
    label: "Home Videos",
    description: "The homepage's circular/pill video row.",
  },
  {
    href: "/admin/settings",
    label: "Site Settings",
    description: "Contact email, phone, and WhatsApp shown in the Footer.",
  },
  {
    href: "/admin/pages",
    label: "Pages",
    description:
      "Standalone content pages (Policy, About, ...) shown at /pages/<slug>.",
  },
  {
    href: "/admin/private-label",
    label: "Private Label Page",
    description:
      "The hero banner, experience section image, 2 feature block images, and the closing CTA background photo on the fully custom /private-label landing page.",
  },
  {
    href: "/admin/quote-requests",
    label: "Quote Requests",
    description: "Incoming wholesale inquiries submitted through the site.",
  },
];
