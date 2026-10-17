"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { registrationHref } from "@/lib/account-navigation";
import { useNavigationAccount } from "./navigation-account";
import { isToolPage } from "@/lib/tool-access-policy";

/** Keep the complete intended action, including query and fragment, at entry. */
export function ToolLink({ href, onClick, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { status } = useNavigationAccount();
  const protectedTool = isToolPage(new URL(href, "https://sorp2026.org").pathname);
  const target = protectedTool && status === "signed-out" ? registrationHref(href) : href;
  return <Link {...props} href={target} prefetch={false} onClick={async event => {
    onClick?.(event);
    if (!protectedTool || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || status !== "checking") return;
    event.preventDefault();
    try {
      const response = await fetch("/api/readiness-account/", { cache: "no-store" });
      const account = await response.json();
      window.location.assign(response.ok && account.signedIn === true ? href : registrationHref(href));
    } catch { window.location.assign(href); } // Server gate handles service failures.
  }} />;
}
