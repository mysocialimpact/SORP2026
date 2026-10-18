import { DataAssessment } from "@/features/excellence/data-assessment";
import { protectedExcellencePage } from "@/features/excellence/protected-page";

export default async function DataAssessmentPage() { return protectedExcellencePage("data", <DataAssessment />); }
