import type { Metadata } from "next";
import HeroSlideForm from "@/components/admin/HeroSlideForm";

export const metadata: Metadata = {
  title: "Add Hero Slide — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminNewHeroSlidePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">Add Hero Slide</h1>
      <div className="mt-6">
        <HeroSlideForm mode="create" />
      </div>
    </div>
  );
}
