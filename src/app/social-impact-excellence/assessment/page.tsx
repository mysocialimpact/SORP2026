import type { Metadata } from "next";
import { ExcellenceAssessment } from "@/features/excellence/excellence-assessment";
import { protectedExcellencePage } from "@/features/excellence/protected-page";

export const metadata: Metadata = { title: "Social Impact Maturity Assessment", robots: { index: false, follow: false } };

export default async function ExcellenceAssessmentPage() { return protectedExcellencePage("maturity", <ExcellenceAssessment />); }
