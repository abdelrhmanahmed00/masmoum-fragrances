import type { Metadata } from "next";
import PlaceholderPage from "@/components/admin/PlaceholderPage";

export const metadata: Metadata = {
  title: "Home Videos — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminHomeVideosPage() {
  return <PlaceholderPage title="Home Videos" />;
}
