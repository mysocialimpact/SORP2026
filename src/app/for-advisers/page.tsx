import type { Metadata } from "next";
import { Article } from "@/components/article";
import { Button } from "@/components/ui";
import { site } from "@/lib/site";
export const metadata: Metadata = {
  title: "For accountants and advisers",
  alternates: site.live ? { canonical: "/for-advisers/" } : undefined,
};
export default function Advisers() {
  return (
    <Article
      title="Better conversations. Stronger reporting."
      eyebrow="FOR ACCOUNTANTS & ADVISERS"
      lead="Help your charity clients connect the technical requirements with a clearer account of their purpose, performance and impact."
    >
      <section>
        <h2>Use readiness as a conversation starter</h2>
        <p>
          Invite a client to reflect on its narrative reporting before your
          planning meeting. The readiness assessment can help highlight where a
          report is unclear, where evidence is thin, and which questions need a
          wider discussion.
        </p>
        <p>
          Its scope is impact, sustainability and narrative readiness. It does
          not test the accounts, determine compliance, or provide audit evidence
          or assurance.
        </p>
      </section>
      <section>
        <h2>A practical client agenda</h2>
        <ul>
          <li>
            Confirm the accounting period, legal requirements and applicable
            SORP tier.
          </li>
          <li>
            Identify agreements and transactions affected by changes to revenue
            recognition and lease accounting.
          </li>
          <li>
            Review the connection between the trustees’ annual report and the
            financial statements.
          </li>
          <li>
            Discuss the evidence behind statements about achievements and
            outcomes.
          </li>
          <li>
            Agree an action plan with management and trustees, including
            specialist advice where needed.
          </li>
        </ul>
      </section>
      <section>
        <h2>Professional judgement stays central</h2>
        <p>
          AI-supported suggestions are prompts for review, not conclusions.
          Verify interpretations against the official standard and the facts of
          your client’s circumstances. Do not submit confidential client or
          beneficiary information to a tool without checking its terms and your
          own responsibilities.
        </p>
        <Button href={site.readiness ?? "/readiness"}>
          Explore the readiness assessment
        </Button>
      </section>
    </Article>
  );
}
