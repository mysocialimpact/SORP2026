import type { Metadata } from "next";
import { ExcellenceAssessment } from "@/features/excellence/excellence-assessment";

export const metadata: Metadata = { title: "Social Impact Maturity Assessment", robots: { index: false, follow: false } };

export default function ExcellenceAssessmentPage() { return <ExcellenceAssessment />; }
