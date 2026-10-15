import type { Metadata } from "next";
import { Article } from "@/components/article";
import { Button } from "@/components/ui";
import { site } from "@/lib/site";
export const metadata: Metadata = {
  title: "Are You SORP Ready?",
  robots: { index: false, follow: false },
};
export default function Readiness() {
  return (
    <Article
      title="Are You SORP Ready?"
      eyebrow="IMPACT & SUSTAINABILITY REPORTING READINESS"
      lead="Understand where you stand, identify gaps and find practical next steps for your charity’s reporting."
    >
      <p>
        The My Social Impact readiness assessment focuses on impact,
        sustainability and narrative reporting. It is not a comprehensive
        financial accounting compliance assessment.
      </p>
      {site.readiness ? (
        <Button href={site.readiness}>Check your readiness: free</Button>
      ) : (
        <>
          <div className="notice">
            <p>
              <strong>Preview link awaiting verification.</strong> The existing
              live beta is hosted by My Social Impact. Its exact address has not
              yet been verified for this website, so this preview cannot open
              the assessment.
            </p>
          </div>
          <p>
            You can visit My Social Impact while the assessment link is being
            confirmed. We have not created a replacement assessment here.
          </p>
          <Button href={site.msi}>Visit My Social Impact</Button>
        </>
      )}
    </Article>
  );
}
