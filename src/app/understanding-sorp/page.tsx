import type { Metadata } from "next";
import { Article } from "@/components/article";
import { Button } from "@/components/ui";
import { site } from "@/lib/site";
export const metadata: Metadata = {
  title: "Understanding SORP 2026",
  description:
    "A practical introduction to the Charities SORP: scope, effective dates, key areas of change and official resources.",
  alternates: site.live ? { canonical: "/understanding-sorp/" } : undefined,
};
export default function Understanding() {
  return (
    <Article
      title="A new SORP. A clearer picture."
      eyebrow="UNDERSTANDING SORP 2026"
      lead="A practical starting point for understanding the framework — and what it means for your charity’s next reporting cycle."
    >
      <p>
        The Charities Statement of Recommended Practice (SORP) explains how
        charities applying FRS 102 should prepare their accounts and trustees’
        annual report. It brings together financial reporting requirements with
        a narrative account of a charity’s activities, achievements and
        governance.
      </p>
      <div className="notice">
        <p>
          <strong>A starting point for discussion.</strong> This is an
          independent overview, not the standard itself or advice on a
          particular set of accounts. Refer to the official SORP and your
          professional adviser for the requirements that apply to you.
        </p>
      </div>
      <section id="who">
        <h2>Who is it for?</h2>
        <p>
          The SORP is relevant to charities preparing accruals accounts under
          FRS 102 in the UK and Republic of Ireland. Whether a charity must
          prepare those accounts depends on its legal form, jurisdiction, size
          and other applicable requirements.
        </p>
        <p>
          Do not assume that every charity must use the same reporting
          framework. Receipts and payments accounts are a different basis of
          preparation; check eligibility and local rules with your regulator or
          adviser.
        </p>
      </section>
      <section id="when">
        <h2>When does it apply?</h2>
        <p>
          SORP 2026 applies to reporting periods beginning on or after{" "}
          <strong>1 January 2026</strong>. The start of your accounting period
          is the key date, not simply the year in which you submit your
          accounts.
        </p>
        <ul>
          <li>
            A year beginning 1 January 2026 and ending 31 December 2026 falls
            within the new framework.
          </li>
          <li>
            A year beginning 1 April 2026 and ending 31 March 2027 also falls
            within it.
          </li>
          <li>
            A year beginning 1 April 2025 and ending 31 March 2026 began before
            the effective date.
          </li>
        </ul>
        <p>
          Discuss transition and any comparative information needed with your
          accountant early.
        </p>
      </section>
      <section id="changes">
        <h2>What should you look at first?</h2>
        <h3>Your trustees’ annual report</h3>
        <p>
          Review how clearly you explain your purpose, activities, achievements
          and the difference your work makes. Connect the financial story to
          your plans, risks and how resources are used.
        </p>
        <h3>The accounting changes</h3>
        <p>
          The revised FRS 102 framework includes changes to revenue recognition
          and lease accounting. The implications depend on your charity’s
          agreements and circumstances; review the relevant SORP modules with
          your finance team or adviser.
        </p>
        <h3>Proportionate reporting</h3>
        <p>
          The 2026 framework introduces tiered reporting. Check the official
          criteria and requirements for your charity’s tier, including any
          narrative and sustainability reporting expectations. Do not assume
          that every disclosure applies to every charity.
        </p>
        <h3>Evidence, not just a better narrative</h3>
        <p>
          Consider what evidence supports your account of achievements. Be clear
          about the difference between the activities you deliver, the people
          you reach, and the outcomes you can demonstrate. Be equally open about
          limitations and learning.
        </p>
      </section>
      <section>
        <h2>Questions we hear often</h2>
        <details>
          <summary>Is the readiness tool a full SORP compliance check?</summary>
          <p>
            No. Are You SORP Ready? focuses on impact, sustainability and
            narrative reporting readiness. It does not assess comprehensive
            financial accounting compliance, replace an audit or provide an
            assurance opinion.
          </p>
        </details>
        <details>
          <summary>Is this an official SORP website?</summary>
          <p>
            No. This is an independent initiative from My Social Impact, built
            by The Ideas Shed. The official standard and supporting resources
            are published through charitysorp.org.
          </p>
        </details>
        <details>
          <summary>Can AI make decisions about our accounts?</summary>
          <p>
            AI can help you explore questions and organise your thinking, but
            its answers may be incomplete or incorrect. Trustees retain their
            responsibilities and should use the official standard and
            appropriate professional advice.
          </p>
        </details>
      </section>
      <section id="sources">
        <h2>Official foundations</h2>
        <p>
          <a href={site.official}>
            Charities SORP — the official standard and supporting resources
          </a>{" "}
          is the authoritative reference. You can also access the{" "}
          <a href="https://www.charitysorp.org/documents/d/guest/charities-sorp-2026-1">
            published SORP 2026 document
          </a>
          . Always check the current text, effective dates, relevant modules and
          any official updates.
        </p>
        <p>
          This independent introduction draws on{" "}
          <a href="/are-you-sorp-ready/">
            My Social Impact’s published scope and methodology
          </a>
          , checked on 10 October 2026. The official site was returning an error
          at that check, so we have not independently revalidated the full
          standard here.
        </p>
        <p>
          Our guidance keeps accounting obligations distinct from wider good
          practice. The My Social Impact framework is an approach to
          organisational improvement; it is not an official SORP requirement.
        </p>
        <Button href={site.readiness ?? "/readiness"}>
          Explore your reporting readiness
        </Button>
      </section>
    </Article>
  );
}
