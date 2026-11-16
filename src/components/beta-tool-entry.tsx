"use client";

import Link from "next/link";
import { ToolLink } from "./tool-link";
import { useNavigationAccount } from "./navigation-account";
import { signInHref } from "@/lib/account-navigation";
import { Arrow } from "./ui";

/** Presentation only: ToolLink and the server continue enforcing existing access. */
export function BetaToolAction({ href, label, className = "gateway-action", readiness = false }: {
  href: string; label: string; className?: string; readiness?: boolean;
}) {
  const { status, readinessComplete, readinessStarted } = useNavigationAccount();
  const action = status === "signed-out" ? "Get Started — Free"
    : readiness ? readinessComplete ? "View Assessment Results" : readinessStarted ? "Continue Assessment" : "Start Assessment" : label;
  return <ToolLink className={`${className} beta-tool-action`} href={href}>{action} <Arrow /></ToolLink>;
}

export function BetaAccountNote({ className = "beta-account-note", destination = "/are-you-sorp-ready/review/" }: { className?: string; destination?: string }) {
  const { status } = useNavigationAccount();
  return <p className={`${className} beta-account-note`}>{status === "signed-in"
    ? "For your selected charity. Return to your saved work at any time."
    : <>Free account. No card required. <Link href={signInHref(destination)}>Already registered? Log in →</Link></>}</p>;
}
