import type { Metadata } from "next";
import { protectAdviserPage } from "@/lib/platform/auth";
import { AdviserWorkspace } from "@/components/adviser/adviser-workspace";
import "./adviser.css";

export const metadata: Metadata = { title: "Adviser Workspace", robots: { index: false, follow: false } };

export default async function AdviserPage({searchParams}:{searchParams:Promise<{client?:string}>}) {
  const identity = await protectAdviserPage();
  const params=await searchParams;
  return <main id="main" className="adviser-workspace-page"><AdviserWorkspace name={identity.account.name} memberships={identity.advisers} initialClient={params.client} /></main>;
}
