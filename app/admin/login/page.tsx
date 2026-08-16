import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";

// The only publicly reachable page under /admin -- proxy.ts's admin
// branch explicitly allows unauthenticated requests through to exactly
// this one path (see ADMIN_LOGIN_PATH in proxy.ts) and redirects
// everything else in /admin/* to it.
export const metadata: Metadata = {
  title: "Sign In — Masmoum Admin",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <LoginForm />;
}
