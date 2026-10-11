import type { Metadata } from "next";
import { ExcellenceResults } from "@/features/excellence/excellence-results";

export const metadata: Metadata = { title: "Your Social Impact Excellence Results", robots: { index: false, follow: false } };

export default function ExcellenceResultsPage() { return <ExcellenceResults />; }
