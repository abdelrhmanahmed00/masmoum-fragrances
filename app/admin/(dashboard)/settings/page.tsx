import type { Metadata } from "next";
import PlaceholderPage from "@/components/admin/PlaceholderPage";

export const metadata: Metadata = {
  title: "Site Settings — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminSettingsPage() {
  return <PlaceholderPage title="Site Settings" />;
}
