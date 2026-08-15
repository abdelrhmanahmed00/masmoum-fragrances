// TEMPORARY route — for visual review of the extracted design tokens only.
// Not linked from anywhere, not real site content, no translations wired
// up (labels are plain English on purpose). Delete this whole folder once
// the tokens are approved (see Prompt 4 report).

type Swatch = {
  name: string;
  varName: string;
  hex: string;
  status: "confirmed" | "estimated";
  note: string;
};

const swatches: Swatch[] = [
  {
    name: "Brand Black",
    varName: "--color-brand-black",
    hex: "#000000",
    status: "confirmed",
    note: "--color-primary / --color-btn-bg / body+heading text",
  },
  {
    name: "Brand White",
    varName: "--color-brand-white",
    hex: "#ffffff",
    status: "confirmed",
    note: "--color-main-background / --color-btn-text — the site's real page background",
  },
  {
    name: "Brand Gold",
    varName: "--color-brand-gold",
    hex: "#dcb689",
    status: "confirmed",
    note: "--bg-cart-wishlist-count — accent used for badges/highlights",
  },
  {
    name: "Brand Gray",
    varName: "--color-brand-gray",
    hex: "#666666",
    status: "confirmed",
    note: "--color-sub-text / --color-secondary",
  },
  {
    name: "Brand Border",
    varName: "--color-brand-border",
    hex: "#dedede",
    status: "confirmed",
    note: "--color-border",
  },
  {
    name: "Brand Surface",
    varName: "--color-brand-surface",
    hex: "#f5f5f5",
    status: "confirmed",
    note: "--color-footer-background",
  },
  {
    name: "Brand Cream",
    varName: "--color-brand-cream",
    hex: "#f7f2e9",
    status: "estimated",
    note: "NOT found on the reference (its background is pure white) — invented placeholder only",
  },
];

const headingSamples = [
  { tag: "h1", label: "H1 · 54px", sizePx: 54 },
  { tag: "h2", label: "H2 · 42px", sizePx: 42 },
  { tag: "h3", label: "H3 · 31px", sizePx: 31 },
  { tag: "h4", label: "H4 · 27px", sizePx: 27 },
  { tag: "h5", label: "H5 · 23px", sizePx: 23 },
  { tag: "h6", label: "H6 · 21px", sizePx: 21 },
];

export default function DesignSystemPreviewPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-16">
      <header className="space-y-2 border-b border-brand-border pb-8">
        <p className="text-sm uppercase tracking-wide text-brand-gray">
          Temporary — visual review only
        </p>
        <h1 className="text-3xl font-semibold text-brand-black">
          Design System Preview
        </h1>
        <p className="text-brand-gray max-w-2xl">
          Tokens extracted from{" "}
          <span className="font-medium">shop-gulforchid.com</span> — compare
          this page against the reference site. This route is deleted once
          approved.
        </p>
      </header>

      {/* Colors */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-brand-black">Colors</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {swatches.map((s) => (
            <div
              key={s.varName}
              className="rounded-btn border border-brand-border overflow-hidden"
            >
              <div
                className="h-20 w-full border-b border-brand-border"
                style={{ backgroundColor: s.hex }}
              />
              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-brand-black">
                    {s.name}
                  </span>
                  <span
                    className={
                      "text-[10px] uppercase tracking-wide rounded-btn px-1.5 py-0.5 " +
                      (s.status === "confirmed"
                        ? "bg-brand-black text-brand-white"
                        : "bg-brand-gold text-brand-black")
                    }
                  >
                    {s.status}
                  </span>
                </div>
                <p className="text-xs font-mono text-brand-gray">
                  {s.varName}
                </p>
                <p className="text-xs font-mono text-brand-gray">{s.hex}</p>
                <p className="text-xs text-brand-gray">{s.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-brand-black">
          Typography — Jost (en) / Tajawal (ar)
        </h2>
        <div className="space-y-4">
          {headingSamples.map((h) => (
            <div
              key={h.tag}
              className="flex items-baseline gap-4 border-b border-brand-border pb-3"
            >
              <span className="w-28 shrink-0 text-xs font-mono text-brand-gray">
                {h.label}
              </span>
              <span
                className="text-brand-black font-medium"
                style={{ fontSize: `${h.sizePx}px`, lineHeight: 1.2 }}
              >
                Masmoum Fragrances
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-4">
          <p className="text-xs font-mono text-brand-gray">
            Body · 16px / 28px line-height (confirmed --font-base-size /
            --base-line-height)
          </p>
          <p
            className="text-brand-black max-w-xl"
            style={{ fontSize: "16px", lineHeight: "28px" }}
          >
            Masmoum Fragrances is a wholesale fragrance manufacturer offering
            perfumes, body mist, hair mist, deodorant, roll-on, and home
            fragrance products to retailers and distributors.
          </p>
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-brand-black">Buttons</h2>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="rounded-btn bg-brand-black text-brand-white px-6 shadow-brand"
            style={{
              fontSize: "16px",
              fontWeight: 500,
              lineHeight: "23px",
              paddingTop: "10px",
              paddingBottom: "10px",
            }}
          >
            Request a Quote
          </button>
          <span className="text-xs text-brand-gray font-mono">
            bg-brand-black · text-brand-white · rounded-btn (5px) ·
            shadow-brand
          </span>
        </div>
      </section>

      {/* Spacing */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-brand-black">
          Section spacing (confirmed)
        </h2>
        <div className="space-y-3 text-sm font-mono text-brand-gray">
          <p>--spacing-section-mobile: 1.5625rem (25px)</p>
          <p>--spacing-section-tablet: 2.5rem (40px)</p>
          <p>--spacing-section-desktop: 3.125rem (50px)</p>
        </div>
      </section>
    </div>
  );
}
