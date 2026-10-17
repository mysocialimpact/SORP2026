import type { Metadata } from "next";
import { Suspense } from "react";
import { Onboarding } from "@/features/onboarding/onboarding";
import { ToolReturnFragment } from "@/components/tool-return-fragment";
import { previewMailEnabled } from "@/lib/sorp-auth/preview-mail";
import "@/features/onboarding/onboarding.css";
export const metadata: Metadata = {
  title: "Let’s Get Started",
  description:
    "Talk or type. We’ll help you get started with a more personal SORP 2026 experience.",
  robots: { index: false, follow: false },
};
export default function GetStartedPage() {
  return (
    <Suspense
      fallback={
        <main id="main" className="onboarding-page">
          <p>Opening your introduction…</p>
        </main>
      }
    >
      <ToolReturnFragment />
      <Onboarding previewEmailSandbox={previewMailEnabled()} />
    </Suspense>
  );
}
