import DashboardShell from "@/components/admin/DashboardShell";

// Pathless route group: everything under /admin EXCEPT /admin/login gets
// the sidebar/topbar chrome (DashboardShell) -- login stays a bare
// centered card with no nav, since there's nothing to navigate to before
// signing in. This layout nests inside app/admin/layout.tsx (the actual
// <html>/<body> root); (dashboard) itself adds no URL segment, so
// app/admin/(dashboard)/page.tsx still resolves to exactly /admin.
//
// Note on typing: (dashboard) is a pathless route group, so — same as
// app/[locale]/(marketing)/layout.tsx's own note — it has no entry in
// the generated LayoutRoutes type (route groups don't affect the URL).
// Plain React.ReactNode typing is used instead of the LayoutProps<>
// helper here, for the same reason.
export default function AdminDashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
