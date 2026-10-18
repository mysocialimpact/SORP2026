import type { Metadata } from "next";
import { InvitationAcceptance } from "@/components/platform/invitation-acceptance";

export const metadata: Metadata = { title: "Accept invitation", robots: { index: false, follow: false } };

export default async function InvitationPage({ params }:{params:Promise<{token:string}>}) {
  const { token } = await params;
  return <main id="main" className="gateway invitation-page"><div className="gateway-width"><InvitationAcceptance token={token} /></div></main>;
}
