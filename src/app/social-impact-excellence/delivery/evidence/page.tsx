import { DeliveryEvidenceUpload } from "@/features/excellence/delivery-evidence";
import { protectedExcellencePage } from "@/features/excellence/protected-page";

export default async function DeliveryEvidencePage() { return protectedExcellencePage("delivery", <DeliveryEvidenceUpload />); }
