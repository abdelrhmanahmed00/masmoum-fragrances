import type { Metadata } from "next";
import PageForm from "@/components/admin/PageForm";

export const metadata: Metadata = {
  title: "Add Page — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminNewPagePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">Add Page</h1>
      <div className="mt-6">
        <PageForm mode="create" />
      </div>
    </div>
  );
}
