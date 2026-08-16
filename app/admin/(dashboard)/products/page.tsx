import type { Metadata } from "next";
import PlaceholderPage from "@/components/admin/PlaceholderPage";

export const metadata: Metadata = {
  title: "Products — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminProductsPage() {
  return <PlaceholderPage title="Products" />;
}
