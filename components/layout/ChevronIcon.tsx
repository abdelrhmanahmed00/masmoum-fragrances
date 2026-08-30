// Extracted from HeaderClient.tsx (Prompt 50/56's Menu dropdown chevron)
// to a shared file, Prompt 91: the Footer's new "Contact Us" accordion
// needs the exact same expand/collapse indicator, for real visual
// consistency, not a lookalike re-implementation. Byte-for-byte the same
// component -- HeaderClient.tsx now imports this instead of defining its
// own local copy.
export default function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={
        "h-4 w-4 shrink-0 transition-transform duration-200 " +
        (open ? "rotate-180" : "")
      }
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}
