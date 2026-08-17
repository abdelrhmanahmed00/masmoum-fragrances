import type { Metadata } from "next";
import CategoryForm from "@/components/admin/CategoryForm";

export const metadata: Metadata = {
  title: "Add Category — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminNewCategoryPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">Add Category</h1>
      <div className="mt-6">
        <CategoryForm mode="create" />
      </div>
    </div>
  );
}
