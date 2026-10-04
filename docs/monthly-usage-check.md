# Monthly Vercel Blob usage check

Why this exists: Vercel's own API does not expose Blob Data Transfer or
Operations usage programmatically (confirmed by testing it directly, not
assumed from docs). `/api/blob-usage?secret=...` covers Storage Size only
(the 1GB Hobby cap) — for the other two Hobby limits, you need to look at
the Vercel dashboard yourself. Do this once a month.

## Where to look

1. Go to **vercel.com → your team → Storage → masmoum2** (the Blob store).
2. Open the **Usage** tab on that store's page.

**Important — how images must be uploaded:** all product images must go
through the admin dashboard's own upload form, which compresses in the
browser (1600px max for the full image, 500px max for thumbnails) before
anything reaches Blob. Never upload images via a direct script or API
call — there is no server-side enforcement of these limits (Step 3 of
Prompt 195 was tried and reverted after it broke real uploads on
deployment), so a script-based upload would store an uncompressed
original and silently undo the size reduction this whole document exists
to protect.

## What to check, and what's dangerous

| Metric | Hobby limit | Check this | Danger zone |
|---|---|---|---|
| **Data Transfer** | 10 GB/month | The "Data Transfer" graph on the store's Usage tab | Above ~5 GB (50%) by mid-month, or any sudden spike |
| **Simple Operations** | 10,000/month | The "Simple Operations" count | Above ~5,000 (50%) by mid-month |
| **Advanced Operations** | 2,000/month | The "Advanced Operations" count | Above ~1,000 (50%) — this one rises with admin uploads specifically, not visitor traffic |
| **Storage Size** | 1 GB | Covered automatically by `/api/blob-usage` — but double-check the dashboard agrees | Above 800 MB (80%) |

## What happens if any limit is hit

Vercel does **not** bill overage on Hobby — it locks Blob access entirely
for **30 days**. That means every product image on the live site would
stop loading until the lockout clears or the plan is upgraded. This is
the same class of outage as the original Supabase incident — treat any
metric crossing 50% as worth investigating that same week, not waiting
for month-end.

## If something looks high

- A Data Transfer spike with no corresponding traffic increase usually
  means something is bypassing the CDN cache (e.g., a new image path
  pattern, or Cache-Control not being set on a new upload path) —
  check a few recently-uploaded objects' `cache-control` header directly.
- A sustained rise in Advanced Operations tracks admin upload activity
  (`put()` calls) — if this is rising unexpectedly, check whether
  something outside the normal admin UI is uploading in a loop.
- If any number is genuinely approaching its limit with no obvious
  one-off cause, the real fix is the same lever used in Prompt 195:
  reduce the bytes/operations actually being used, not just wait it out.
