import "server-only";

/**
 * Best-effort, in-memory, per-IP rate limiter for public mutation
 * endpoints (currently just quote submission, Prompt 19). Explicitly NOT
 * a real distributed rate limiter -- proportionate to this project's
 * "don't over-engineer, don't leave it wide open either" instruction, not
 * a claim that this is bulletproof:
 *
 *   - State lives in a module-scoped Map, so it's per server instance.
 *     Vercel serverless functions can run as multiple concurrent
 *     instances and reset on cold start, so a determined attacker
 *     spreading requests across cold starts/instances is NOT reliably
 *     throttled by this alone.
 *   - It IS effective against the common case this project actually
 *     needs to worry about: a single script hammering the endpoint
 *     against one warm instance, or a slow trickle of accidental
 *     double-submits.
 *   - A real guarantee would need a shared store (Upstash Redis / Vercel
 *     KV) -- explicitly out of scope per "don't over-engineer a full
 *     rate-limiting service." Combined with the honeypot field (see
 *     app/[locale]/quote/request/actions.ts) and the DB's own FK/CHECK
 *     constraints, this is a reasonable, cheap second layer, not the only
 *     layer.
 *
 * Memory is bounded with an opportunistic sweep (a small random chance,
 * on each call, of pruning stale entries) rather than a cron job or timer
 * -- simplest thing that keeps a long-lived warm instance's Map from
 * growing unboundedly.
 */

const buckets = new Map<string, number[]>();
const PRUNE_PROBABILITY = 0.05;

function pruneStaleEntries(now: number, windowMs: number) {
  for (const [key, timestamps] of buckets) {
    const recent = timestamps.filter((t) => now - t < windowMs);
    if (recent.length === 0) {
      buckets.delete(key);
    } else {
      buckets.set(key, recent);
    }
  }
}

/**
 * Returns true if `key` (typically an IP address) has exceeded `max`
 * calls within `windowMs`, and records this call either way (a
 * rate-limited call still counts, so retrying immediately doesn't reset
 * the clock).
 */
export function isRateLimited(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): boolean {
  const now = Date.now();
  if (Math.random() < PRUNE_PROBABILITY) pruneStaleEntries(now, windowMs);

  const timestamps = (buckets.get(key) ?? []).filter(
    (t) => now - t < windowMs
  );

  if (timestamps.length >= max) {
    buckets.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return false;
}
