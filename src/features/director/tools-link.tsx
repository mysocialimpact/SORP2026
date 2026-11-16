"use client";

import Link from "next/link";
import { useNavigationAccount } from "@/components/navigation-account";
import { registrationHref } from "@/lib/account-navigation";

/** The shared dashboard is the entry to all free tools after registration. */
export function DirectorToolsLink({ className }: { className?: string }) {
  const { status } = useNavigationAccount();
  return <Link className={className} href={status === "signed-in" ? "/dashboard/" : registrationHref("/dashboard/")} prefetch={false}>
    Explore the Free Tools <span aria-hidden="true">→</span>
  </Link>;
}
