"use client";

import Link from "next/link";
import { ToolLink } from "./tool-link";
import { useNavigationAccount } from "./navigation-account";
import { signInHref } from "@/lib/account-navigation";

/** Presentation only: ToolLink and the server continue enforcing existing access. */
export function BetaToolAction({ href, label, className = "gateway-action", readiness = false }: {
  href: string; label: string; className?: string; readiness?: boolean;
}) {
  const { status, readinessComplete, readinessStarted } = useNavigationAccount();
  const action = status === "signed-out" ? "Get Started — Free"
    : readiness ? readinessComplete ? "View Assessment Results" : readinessStarted ? "Continue Assessment" : "Start Assessment" : label;
  return <ToolLink className={className} href={href}>{action} <span aria-hidden="true">→</span></ToolLink>;
}

export function BetaAccountNote({ className = "beta-account-note", destination = "/are-you-sorp-ready/review/" }: { className?: string; destination?: string }) {
  const { status } = useNavigationAccount();
  return <p className={className}>{status === "signed-in"
    ? "Your free beta account keeps your work together for your selected charity."
    : <>Create a free beta account for one charity. Save your work and return later. No card required. Already registered? <Link href={signInHref(destination)}>Log in →</Link></>}</p>;
}
