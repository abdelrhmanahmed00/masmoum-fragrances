import type { Metadata } from "next";
import PlaceholderPage from "@/components/admin/PlaceholderPage";

export const metadata: Metadata = {
  title: "Collections — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminCollectionsPage() {
  return <PlaceholderPage title="Collections" />;
}
