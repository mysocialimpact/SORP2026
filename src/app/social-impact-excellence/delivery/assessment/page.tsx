import { DeliveryAssessment } from "@/features/excellence/delivery-assessment";
import { protectedExcellencePage } from "@/features/excellence/protected-page";

export default async function DeliveryAssessmentPage() { return protectedExcellencePage("delivery", <DeliveryAssessment />); }
