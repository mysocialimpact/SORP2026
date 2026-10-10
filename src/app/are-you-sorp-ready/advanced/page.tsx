import type { Metadata } from "next";
import { SorpConversationWorkspace } from "../../sorp-conversation-workspace";
import "../../sorp-ready.css";

export const metadata: Metadata = {
  title: "SORP Readiness Conversation",
  description: "Talk to My Social Impact Intelligence, understand what SORP 2026 expects and receive a free personalised SORP readiness report.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <SorpConversationWorkspace />;
}
