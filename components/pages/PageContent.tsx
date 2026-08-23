import { parseContentBlocks } from "@/lib/content-blocks";

/**
 * Renders parsed content blocks as real JSX elements -- every block's
 * text is passed as plain children (not dangerouslySetInnerHTML), so
 * React's own escaping applies exactly like everywhere else in this
 * project. See lib/content-blocks.ts's own comment for the full
 * reasoning behind this format over a Markdown-to-HTML library.
 *
 * No RTL-specific handling needed here: direction comes from the
 * ancestor `dir` attribute the root layout already sets per locale
 * (app/[locale]/layout.tsx) -- headings/paragraphs/lists all reverse
 * correctly under dir="rtl" the same way every other block of text on
 * this site already does, with no logical-property overrides required
 * for plain block-level text content.
 */
export default function PageContent({ content }: { content: string }) {
  const blocks = parseContentBlocks(content);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="max-w-none space-y-4 text-sm leading-relaxed text-brand-gray">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h2
              key={index}
              className="pt-2 text-lg font-medium text-brand-black first:pt-0"
            >
              {block.text}
            </h2>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={index} className="list-inside list-disc space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="whitespace-pre-line">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
