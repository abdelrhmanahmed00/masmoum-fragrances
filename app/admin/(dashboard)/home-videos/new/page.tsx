import type { Metadata } from "next";
import HomeVideoForm from "@/components/admin/HomeVideoForm";

export const metadata: Metadata = {
  title: "Add Home Video — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminNewHomeVideoPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">Add Home Video</h1>
      <div className="mt-6">
        <HomeVideoForm mode="create" />
      </div>
    </div>
  );
}
