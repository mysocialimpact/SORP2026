import type { Metadata } from "next";
import { Article } from "@/components/article";
import { Button } from "@/components/ui";
import { site } from "@/lib/site";
export const metadata: Metadata = { title: "Ask SORP — coming soon", alternates: site.live ? { canonical: '/ask-sorp/' } : undefined };
export default function AskSorp() {
  return (
    <Article
      title="Big questions. Clearer answers."
      eyebrow="ASK SORP · COMING SOON — BETA"
      lead="An AI-powered assistant designed to help charity finance teams, trustees, accountants and advisers explore the whole SORP 2026."
    >
      <div className="notice">
        <p>
          <strong>In development.</strong> Ask SORP is not yet available. This
          page describes the intended product, not a live service.
        </p>
      </div>
      <section>
        <h2>The whole framework. A more useful conversation.</h2>
        <p>
          Ask SORP is being designed for questions about financial accounting,
          reporting and disclosure requirements, as well as impact-related
          questions. Its scope will be wider than the impact and sustainability
          readiness assessment.
        </p>
        <h3>Questions it is being designed to help explore</h3>
        <ul>
          <li>Which reporting requirements are relevant to our charity?</li>
          <li>What should we consider when reviewing revenue or leases?</li>
          <li>
            How do we connect our trustees’ report to our financial statements?
          </li>
          <li>How can we explain achievements and impact more clearly?</li>
        </ul>
      </section>
      <section>
        <h2>Assistance, with perspective</h2>
        <p>
          Our ambition is a useful route into the official material, with clear
          references and visible limitations. AI can make mistakes. Professional
          judgement and the official SORP will remain essential.
        </p>
        <Button href="/#tools">Explore our tools</Button>
      </section>
    </Article>
  );
}
