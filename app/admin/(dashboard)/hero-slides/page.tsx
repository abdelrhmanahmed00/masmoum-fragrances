import type { Metadata } from "next";
import PlaceholderPage from "@/components/admin/PlaceholderPage";

export const metadata: Metadata = {
  title: "Hero Slides — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminHeroSlidesPage() {
  return <PlaceholderPage title="Hero Slides" />;
}
