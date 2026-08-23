// Prompt 49: content format decision for static pages (Policy, Private
// Label, ...).
//
// No new dependency added -- checked package.json first (no markdown
// library present anywhere in this project: no `marked`, `remark`,
// `react-markdown`, etc.). A full Markdown library was rejected even
// though one would be easy to add: this content is admin-authored but
// PUBLIC-FACING (every visitor to /pages/policy sees it, unlike e.g.
// quote_requests' fields which only ever render inside the admin
// dashboard, Prompt 48). Real Markdown-to-HTML libraries produce an HTML
// STRING, which then has to be rendered via dangerouslySetInnerHTML --
// safe only with a real sanitizer on top (DOMPurify etc., itself a new,
// heavier dependency, and one built for a DOM environment, not
// straightforward in a Server Component). That's a real, avoidable XSS
// surface for a single trusted admin's content reaching every visitor:
// if the admin's account were ever compromised, or the admin pastes
// content copied from somewhere untrusted, the blast radius is every
// public visitor, not just the admin's own dashboard view (the
// distinction that mattered for Prompt 48's quote_requests XSS finding,
// which stayed safe specifically because it only ever renders back to
// the admin via plain JSX).
//
// Instead: a tiny, constrained-conventions parser (this file) that turns
// a handful of line-based rules into a small set of typed BLOCKS --
// never an HTML string. The renderer (components/pages/PageContent.tsx)
// maps each block to a real JSX element with the block's TEXT passed as
// plain children -- React's own JSX interpolation escapes it exactly like
// every other user-supplied string already rendered anywhere in this
// project (ProductDetail's description, quote_requests' message, ...).
// There is no dangerouslySetInnerHTML anywhere in this feature, so there
// is no HTML-injection surface to sanitize against in the first place --
// a stronger guarantee than "sanitized," at effectively zero cost.
//
// Conventions (documented for the admin form too, PageForm.tsx's hint
// text):
//   "## Heading text"   -> a section heading
//   "- item text"        -> a bullet list item (consecutive lines group
//                           into one list)
//   blank line            -> paragraph break
//   anything else          -> plain paragraph text (consecutive
//                           non-blank lines join into one paragraph,
//                           same "wrapped text" convention as writing a
//                           paragraph in plain Markdown)

export type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export function parseContentBlocks(raw: string): ContentBlock[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const blocks: ContentBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
      paragraphLines = [];
    }
  }

  function flushList() {
    if (listItems.length > 0) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      const text = line.slice(3).trim();
      if (text) blocks.push({ type: "heading", text });
    } else if (line.startsWith("- ")) {
      flushParagraph();
      const text = line.slice(2).trim();
      if (text) listItems.push(text);
    } else if (line === "") {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraphLines.push(line);
    }
  }
  flushParagraph();
  flushList();

  return blocks;
}
