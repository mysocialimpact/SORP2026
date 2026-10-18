import { PurposeAssessment } from "@/features/excellence/purpose-assessment";
import { protectedExcellencePage } from "@/features/excellence/protected-page";

export default async function PurposeAssessmentPage() { return protectedExcellencePage("purpose", <PurposeAssessment />); }
