import type { Metadata } from "next";
import CollectionForm from "@/components/admin/CollectionForm";

export const metadata: Metadata = {
  title: "Add Collection — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminNewCollectionPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">
        Add Collection
      </h1>
      <div className="mt-6">
        <CollectionForm mode="create" />
      </div>
    </div>
  );
}
