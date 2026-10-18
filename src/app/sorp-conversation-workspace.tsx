import Link from "next/link";
import { SorpReadinessConversation, type DelegatedAssessment } from "./sorp-readiness-conversation";

export function SorpConversationWorkspace({ delegated }: { delegated?: DelegatedAssessment }) {
  return <main className="sorp-conversation-page">
    <header className="sorp-workspace-brand">
      <Link href="/are-you-sorp-ready"><span>My Social Impact</span><strong>Are You SORP Ready?</strong></Link>
      <div className="sorp-workspace-brand-meta">
        <p><span>SORP is the requirement.</span> <strong>Better impact is the opportunity.</strong></p>
      </div>
    </header>
    {delegated&&<p className="adviser-notice" role="status">You are contributing as an authorised adviser. Changes save to the selected client’s assessment and are recorded in the audit history.</p>}
    <SorpReadinessConversation delegated={delegated} />
  </main>;
}
