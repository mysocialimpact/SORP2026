import type { Metadata } from "next";
import { Article } from "@/components/article";
import { Button } from "@/components/ui";
import { site } from "@/lib/site";
export const metadata: Metadata = {
  title: "For charities",
  alternates: site.live ? { canonical: "/for-charities/" } : undefined,
};
export default function Charities() {
  return (
    <Article
      title="Your purpose. A clearer story."
      eyebrow="FOR CHARITIES"
      lead="You do important work. Preparing for SORP 2026 starts with understanding how to explain it clearly, confidently and honestly."
    >
      <section>
        <h2>Start with what you already have</h2>
        <p>
          Bring together your most recent trustees’ annual report, your
          charity’s strategy, the evidence you use to understand outcomes and
          your plans for the year ahead. You do not need a perfect reporting
          system to begin a useful conversation.
        </p>
      </section>
      <section>
        <h2>Make preparation manageable</h2>
        <ol>
          <li>
            <strong>Confirm your reporting framework.</strong> Ask your
            accountant which requirements, dates and tier apply.
          </li>
          <li>
            <strong>Map your story.</strong> Connect your purpose to your
            activities, achievements and future plans.
          </li>
          <li>
            <strong>Look for evidence.</strong> Identify what you know about the
            difference your work makes and where the gaps are.
          </li>
          <li>
            <strong>Agree your next steps.</strong> Give each action an owner
            and a realistic timescale. Bring trustees into the discussion.
          </li>
        </ol>
      </section>
      <section>
        <h2>A helpful first step</h2>
        <p>
          Are You SORP Ready? is an AI-supported assessment of impact,
          sustainability and narrative reporting readiness. Use it to surface
          questions, identify gaps and focus your next conversation.
        </p>
        <p>
          It does not cover comprehensive financial accounting compliance.
          Review its suggestions with people who know your organisation and
          reporting responsibilities.
        </p>
        <Button href={site.readiness ?? "/readiness"}>
          Check your readiness — free
        </Button>
      </section>
    </Article>
  );
}
