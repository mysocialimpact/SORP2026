"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { currentAccountDestination, registrationHref, signInHref } from "@/lib/account-navigation";
import { safeDestination } from "@/lib/onboarding/state";
import { Arrow } from "./ui";
import { useNavigationAccount } from "./navigation-account";

export function AccountControl({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const router = useRouter();
  const { status } = useNavigationAccount();
  const inOnboarding = path === "/get-started" || path === "/get-started/";
  const destination = path === "/" || inOnboarding || path === "/login" || path === "/login/" ? "/dashboard/" : path;

  function navigate(event: React.MouseEvent<HTMLAnchorElement>, kind: "login" | "register") {
    onNavigate?.();
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const query = new URLSearchParams(window.location.search);
    const target = inOnboarding
      ? safeDestination(query.get("next") || query.get("return") || "/dashboard/", true)
      : currentAccountDestination(destination);
    router.push(kind === "login" ? signInHref(target) : registrationHref(target));
  }

  if (status === "checking" || status === "unavailable") {
    return <div className="gateway-account-group is-checking" aria-label="Checking account status"><Link className="gateway-account-placeholder" href={signInHref(destination)}>Account</Link></div>;
  }

  if (status === "signed-in") return <nav className="gateway-account-group" aria-label="Your account">
    <Link className="gateway-account-text-link" href="/dashboard/" onClick={onNavigate}>My Dashboard</Link>
    <Link className="gateway-account-control" href="/settings/" onClick={onNavigate}>My Account <Arrow diagonal /></Link>
  </nav>;

  return <nav className="gateway-account-group" aria-label="Account access">
    <Link className="gateway-account-text-link" href={signInHref(destination)} onClick={event => navigate(event, "login")}>Log in</Link>
    <Link className="gateway-account-control" href={registrationHref(destination)} onClick={event => navigate(event, "register")}>Start <Arrow diagonal /></Link>
  </nav>;
}

