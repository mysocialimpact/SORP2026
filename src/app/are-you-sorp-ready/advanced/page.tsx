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

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const adviserOrganisationId = typeof query.adviser === "string" ? query.adviser : "";
  const charityOrganisationId = typeof query.client === "string" ? query.client : "";
  const accountId = typeof query.account === "string" ? query.account : "";
  const delegated = adviserOrganisationId && charityOrganisationId && accountId
    ? { adviserOrganisationId, charityOrganisationId, accountId } : undefined;
  return <SorpConversationWorkspace delegated={delegated} />;
}
