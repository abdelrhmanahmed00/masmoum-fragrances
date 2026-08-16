import type { Metadata } from "next";
import PlaceholderPage from "@/components/admin/PlaceholderPage";

export const metadata: Metadata = {
  title: "Quote Requests — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminQuoteRequestsPage() {
  return <PlaceholderPage title="Quote Requests" />;
}
