import type { Metadata } from "next";
import PlaceholderPage from "@/components/admin/PlaceholderPage";

export const metadata: Metadata = {
  title: "Categories — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminCategoriesPage() {
  return <PlaceholderPage title="Categories" />;
}
