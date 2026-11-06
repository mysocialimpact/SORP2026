import Link from "next/link";
import type { Metadata } from "next";
import { protectAdviserPage } from "@/lib/platform/auth";
import { AdviserWorkspace } from "@/components/adviser/adviser-workspace";
import { independentAuthCutover } from "@/lib/sorp-auth/switch";
import "./adviser.css";

export const metadata: Metadata = { title: "Adviser Workspace", robots: { index: false, follow: false } };

export default async function AdviserPage({searchParams}:{searchParams:Promise<{client?:string; workspace?:string}>}) {
  const params=await searchParams;
  const msi = params.workspace === "my-social-impact";
  const identity = await protectAdviserPage(msi);
  const memberships = msi ? identity.advisers.filter(item => item.name.trim().toLowerCase() === "my social impact") : identity.advisers;
  if (!memberships.length) return <main id="main" className="adviser-workspace-page"><div className="adviser-shell">
    <h1>My Social Impact — Adviser</h1><p>Your signed-in account does not have active Adviser access for My Social Impact.</p>
    <Link href={identity.founder ? "/founder/#organisations" : "/dashboard/"}>{identity.founder ? "Open Founder organisations" : "Return to My Dashboard"} →</Link>
  </div></main>;
  return <main id="main" className="adviser-workspace-page"><AdviserWorkspace name={identity.account.name} memberships={memberships} initialClient={params.client} independent={independentAuthCutover()} /></main>;
}
