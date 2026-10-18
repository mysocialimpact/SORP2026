import { PurposeEvidenceUpload } from "@/features/excellence/purpose-evidence";
import { protectedExcellencePage } from "@/features/excellence/protected-page";

export default async function PurposeEvidencePage() { return protectedExcellencePage("purpose", <PurposeEvidenceUpload />); }
