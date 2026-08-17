// Deliberately its own tiny module with no "server-only" guard and no
// other imports: it needs to be safely importable from BOTH a Client
// Component (CategoryForm.tsx's live auto-slug-as-you-type preview) and
// server code (lib/admin/categories.ts's authoritative server-side
// re-validation) -- see lib/admin/categories.ts's own comment for why
// the server-side copy re-runs this rather than trusting the client's
// value. Splitting this out avoids pulling lib/admin/categories.ts's
// "server-only" import (needed by its actual DB-mutating functions) into
// the client bundle just because CategoryForm needs this one pure
// function -- importing ANY export from a module pulls in that module's
// top-level imports too, "server-only" included.

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_DIACRITICS, "") // strip combining diacritics (e.g. "café" -> "cafe")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
