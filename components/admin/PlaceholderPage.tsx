/**
 * Shared shell for the 7 not-yet-built management pages (Prompt 22) --
 * each real route exists and is protected by proxy.ts's admin guard
 * (see the Prompt 22 report), it just has no CRUD functionality yet.
 * One component instead of 7 near-identical copies of the same markup.
 */
export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-semibold text-brand-black">{title}</h1>
      <p className="mt-2 text-sm text-brand-gray">Coming in a later prompt.</p>
    </div>
  );
}
