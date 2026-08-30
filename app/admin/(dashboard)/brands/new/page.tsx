import type { Metadata } from "next";
import BrandForm from "@/components/admin/BrandForm";

export const metadata: Metadata = {
  title: "Add Brand — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminNewBrandPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">Add Brand</h1>
      <div className="mt-6">
        <BrandForm mode="create" />
      </div>
    </div>
  );
}
