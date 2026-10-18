"use client";

import Link from "next/link";
import type { ExcellencePillar } from "@/lib/excellence/access-policy";
import { useExcellenceAccess } from "./use-excellence-access";

export function PillarStartLink({ pillar, href, label }: { pillar: ExcellencePillar; href: string; label: string }) {
  const { access, error } = useExcellenceAccess();
  if (error) return <span role="alert">Your access could not be checked. Please try again.</span>;
  if (!access) return <span>Checking your organisation’s access…</span>;
  if (!access.maturity.completed) return <span>Complete your Social Impact Maturity Assessment before beginning this deep dive. <Link href="/social-impact-excellence/assessment/">Continue baseline →</Link></span>;
  if (!access.pillars[pillar].available) return <span>Your Maturity Assessment is complete. This deep dive is awaiting activation.</span>;
  return <Link href={href}>{label} →</Link>;
}
