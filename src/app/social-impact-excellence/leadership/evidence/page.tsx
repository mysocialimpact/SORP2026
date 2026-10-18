import { LeadershipEvidenceUpload } from "@/features/excellence/leadership-evidence";
import { protectedExcellencePage } from "@/features/excellence/protected-page";
export default async function LeadershipEvidencePage() { return protectedExcellencePage("leadership", <LeadershipEvidenceUpload />); }
