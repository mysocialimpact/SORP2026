import { CommunicationsEvidenceUpload } from "@/features/excellence/communications-evidence";
import { protectedExcellencePage } from "@/features/excellence/protected-page";

export default async function CommunicationsEvidencePage() { return protectedExcellencePage("communications", <CommunicationsEvidenceUpload />); }
