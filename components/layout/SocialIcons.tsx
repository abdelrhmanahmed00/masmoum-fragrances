// Simple, hand-drawn inline SVG glyphs -- matches this project's existing
// icon convention (no icon library dependency anywhere in package.json,
// confirmed before writing these; see e.g. VideosCarousel.tsx's MuteIcon
// and its own play-button icon, ProductGallery's placeholder icon). Not
// pixel-perfect brand marks, just simple, recognizable approximations
// appropriate for a small footer icon row.

export function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.9.3-1.5 1.6-1.5H16.5V4.2C16.2 4.1 15.2 4 14 4c-2.4 0-4 1.5-4 4.2V10.5H7.5v3H10V21h3.5z" />
    </svg>
  );
}

export function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.5 3c.4 2.2 1.8 3.7 4 4v3c-1.4 0-2.8-.4-4-1.2V15a6 6 0 11-6-6c.3 0 .7 0 1 .1v3.1a3 3 0 102 2.8V3h3z" />
    </svg>
  );
}
