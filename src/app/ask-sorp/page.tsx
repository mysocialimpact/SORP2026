import type { Metadata } from "next";
import { AskPresentation } from "@/components/ask-presentation";
import { site } from "@/lib/site";
export const metadata: Metadata = {
  title: "Ask SORP — Coming soon",
  description:
    "A first look at Ask SORP: AI-supported guidance for questions across the entire SORP 2026. In development.",
  ...(site.live ? { alternates: { canonical: "/ask-sorp/" } } : {}),
};
export default function AskSorp() {
  return (
    <main id="main" className="gateway gateway-ask-page">
      <div className="gateway-width">
        <header className="gateway-ask-intro">
          <div>
            <p className="gateway-kicker">
              One question. A clearer way forward.
            </p>
            <h1>
              Ask SORP<span>.</span>
            </h1>
          </div>
          <span className="gateway-status">Coming soon · In development</span>
        </header>
        <AskPresentation />
        <p className="gateway-ask-note">
          Independent, AI-supported guidance. Always read alongside the official
          SORP and professional judgement.
        </p>
      </div>
    </main>
  );
}
