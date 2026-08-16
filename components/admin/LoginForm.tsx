"use client";

import { useActionState } from "react";
import { signIn } from "@/app/admin/login/actions";
import { ADMIN_LOGIN_INITIAL_STATE } from "@/types/admin-auth";

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    signIn,
    ADMIN_LOGIN_INITIAL_STATE
  );

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-card bg-brand-white p-8 shadow-card">
        <h1 className="text-xl font-semibold text-brand-black">
          Masmoum Admin
        </h1>
        <p className="mt-1 text-sm text-brand-gray">
          Sign in to manage the site.
        </p>

        {state.status === "error" ? (
          <div
            role="alert"
            className="mt-6 rounded-btn border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {state.message}
          </div>
        ) : null}

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-brand-black"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              autoComplete="username"
              className="w-full rounded-btn border border-brand-border bg-brand-white px-3 py-2.5 text-sm text-brand-black"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-brand-black"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full rounded-btn border border-brand-border bg-brand-white px-3 py-2.5 text-sm text-brand-black"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-btn border border-brand-black bg-brand-black px-6 py-2.5 text-sm font-medium text-brand-white transition-colors hover:bg-brand-white hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
