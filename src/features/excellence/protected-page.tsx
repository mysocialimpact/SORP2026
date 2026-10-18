import "server-only";
import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { excellenceContext, accessMessage } from "@/lib/excellence/access-server";
import type { ExcellencePillar } from "@/lib/excellence/access-policy";

export async function protectedExcellencePage(section: ExcellencePillar | "maturity", content: ReactNode) {
  try {
    const context = await excellenceContext((await cookies()).toString());
    const allowed = section === "maturity" ? context.access.stages.maturity : context.pillars[section].available;
    if (allowed) return content;
    const title = section === "maturity" ? "Your Maturity Assessment is not currently available." : `${section[0].toUpperCase()}${section.slice(1)} is not yet available.`;
    const explanation = section === "maturity" ? "This stage is not yet available for your organisation." : accessMessage(context, section);
    return <main className="sie-report"><section className="sie-state"><p className="sie-eyebrow">Social Impact Excellence · Access</p><h1>{title}</h1><p>{explanation}</p><p>Your existing work is saved and will be here when access is restored.</p><Link href={section === "maturity" ? "/social-impact-excellence/" : `/social-impact-excellence/${section}/`}>Explore the overview →</Link><Link href="/social-impact-excellence/journey/">See your whole journey →</Link></section></main>;
  } catch {
    return <main className="sie-report"><section className="sie-state" role="alert"><h1>We couldn’t check your organisation’s access.</h1><p>Please try again. Your saved work has not been changed.</p><Link href="/social-impact-excellence/">Return to Social Impact Excellence →</Link></section></main>;
  }
}
