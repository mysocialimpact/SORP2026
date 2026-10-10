import Link from "next/link";
import { SorpReadinessConversation } from "./sorp-readiness-conversation";

export function SorpConversationWorkspace() {
  return <main className="sorp-conversation-page">
    <header className="sorp-workspace-brand">
      <Link href="/are-you-sorp-ready"><span>My Social Impact</span><strong>Are You SORP Ready?</strong></Link>
      <div className="sorp-workspace-brand-meta">
        <p><span>SORP is the requirement.</span> <strong>Better impact is the opportunity.</strong></p>
      </div>
    </header>
    <SorpReadinessConversation />
  </main>;
}
