import { LeadershipAssessment } from "@/features/excellence/leadership-assessment";
import { protectedExcellencePage } from "@/features/excellence/protected-page";
export default async function LeadershipAssessmentPage() { return protectedExcellencePage("leadership", <LeadershipAssessment />); }
