import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

/**
 * Locale-aware wrappers around Next.js navigation APIs. Use these instead of
 * next/link and next/navigation anywhere locale-prefixed URLs are needed.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
