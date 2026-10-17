import type { Metadata } from "next";
import Link from "next/link";
import { DirectorAssessment } from "@/features/director/assessment";
import s from "@/features/director/director.module.css";

export const metadata: Metadata = { title: "My Impact Director workspace", robots: { index: false, follow: false } };

export default function DirectorWorkspacePage() {
  return <main id="main" className={s.page}>
    <div className="gateway-width"><Link className="gateway-quiet-link" href="/my-impact-director/">← Back to My Impact Director</Link></div>
    <DirectorAssessment autoStart />
  </main>;
}
