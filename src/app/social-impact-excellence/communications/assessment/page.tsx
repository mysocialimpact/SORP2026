import { CommunicationsAssessment } from "@/features/excellence/communications-assessment";
import { protectedExcellencePage } from "@/features/excellence/protected-page";

export default async function CommunicationsAssessmentPage() { return protectedExcellencePage("communications", <CommunicationsAssessment />); }
