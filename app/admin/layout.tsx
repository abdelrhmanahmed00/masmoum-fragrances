import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "../globals.css";

// A second, independent root layout (its own <html>/<body>), sibling to
// app/[locale]/layout.tsx -- confirmed sound against Next.js's own
// "multiple root layouts" documentation
// (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md):
// each top-level segment with its own layout.tsx defining <html> is a
// valid independent root. Route groups are how you'd do this while
// *avoiding* a URL segment; here we want /admin in the URL anyway, so a
// plain top-level app/admin/ directory is simpler and just as correct.
//
// Why /admin doesn't go through app/[locale]/: per Prompt 21's own
// reasoning (confirmed, not just accepted at face value) -- this is an
// internal tool with exactly one operator (the client, per the
// single-admin architecture decision), not public-facing marketing
// content. Routing it through next-intl would force a fake locale prefix
// onto every admin URL, load NextIntlClientProvider/messages for no
// reader who needs them, and route it through proxy.ts's i18n redirect
// logic for no reason -- all real cost for zero benefit. English-only,
// hardcoded strings, is the right scope for this phase; the task didn't
// ask for a bilingual admin panel and building one now would be
// premature.
const jost = Jost({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Masmoum Admin",
  // Never indexed -- this is an internal tool, not a page any search
  // engine should ever surface.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className={`${jost.variable} h-full antialiased`}>
      <body className="min-h-full bg-brand-surface text-brand-black">
        {children}
      </body>
    </html>
  );
}
