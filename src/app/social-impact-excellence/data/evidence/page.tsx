import { DataEvidenceUpload } from "@/features/excellence/data-evidence";
import { protectedExcellencePage } from "@/features/excellence/protected-page";

export default async function DataEvidencePage() { return protectedExcellencePage("data", <DataEvidenceUpload />); }
