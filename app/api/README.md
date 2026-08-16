# app/api

Route handlers. Still empty: quote submission (Prompt 19), the one thing
this directory originally anticipated, ended up as a Server Action instead
(`app/[locale]/quote/request/actions.ts`) — colocated with its one form,
gets Next.js's built-in CSRF check for public POSTs, and needs no separate
JSON API contract. See that file's own comment for the full reasoning.
This directory stays reserved for anything that genuinely needs a public
HTTP contract in the future (e.g. a webhook).
