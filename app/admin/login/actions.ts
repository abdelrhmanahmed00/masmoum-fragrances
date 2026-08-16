"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import type { AdminLoginActionState } from "@/types/admin-auth";

// Same reasoning/caveats as the quote form's rate limiter (Prompt 20,
// lib/rate-limit.ts): best-effort, per-instance, not a real distributed
// guarantee -- but login attempts are exactly the kind of endpoint this
// is meant to slow down (credential stuffing / brute force), so it's
// applied here too rather than left unprotected. Tighter than the quote
// form's 5/10min: a real admin logging in mistypes their password at
// most a couple of times, so a low ceiling costs a legitimate user
// nothing while meaningfully slowing a brute-force attempt.
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? "unknown";
}

const GENERIC_INVALID_MESSAGE = "Invalid email or password.";
const RATE_LIMITED_MESSAGE =
  "Too many login attempts. Please wait a few minutes and try again.";

/**
 * Sign-in Server Action. No sign-up counterpart exists anywhere in this
 * codebase, deliberately -- the one admin account is created by hand in
 * the Supabase Dashboard (see the Prompt 21 report's dashboard-config
 * notes), matching the approved single-admin architecture.
 *
 * Uses createSessionClient (lib/supabase/server.ts), not
 * createAnonMutationClient (Prompt 20) or createServiceRoleClient: this
 * is the one client that's cookie-aware, and a Server Action is one of
 * the two contexts (alongside Route Handlers) where its cookie writes
 * actually persist -- signInWithPassword's session cookie is written
 * here, for real, not silently swallowed the way it would be from a
 * Server Component.
 */
export async function signIn(
  _prevState: AdminLoginActionState,
  formData: FormData
): Promise<AdminLoginActionState> {
  const ip = await getClientIp();
  if (isRateLimited(ip, RATE_LIMIT)) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.trim().length === 0 ||
    password.length === 0
  ) {
    return { status: "error", message: GENERIC_INVALID_MESSAGE };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    // Same generic message regardless of the actual failure (wrong
    // password vs. no account with this email at all) -- distinguishing
    // them would let an attacker enumerate valid admin emails.
    return { status: "error", message: GENERIC_INVALID_MESSAGE };
  }

  redirect("/admin");
}
