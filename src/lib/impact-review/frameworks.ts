import { PURPOSE_SECTIONS } from "@/features/excellence/purpose";
import { LEADERSHIP_SECTIONS } from "@/features/excellence/leadership";
import { DATA_SECTIONS } from "@/features/excellence/data";
import { DELIVERY_SECTIONS } from "@/features/excellence/delivery";
import { COMMUNICATIONS_SECTIONS } from "@/features/excellence/communications";
import { excellencePillars } from "./rubric";
// Use authored questions and explanations, without importing diagnostic star scoring
// into the report-disclosure review.
const sections=[PURPOSE_SECTIONS,LEADERSHIP_SECTIONS,DATA_SECTIONS,DELIVERY_SECTIONS,COMMUNICATIONS_SECTIONS];
export const excellenceDefinitions=excellencePillars.map((pillar,index)=>({
  ...pillar,
  authoredQuestions:JSON.parse(JSON.stringify(sections[index],(key,value)=>key==="stars"?undefined:value)),
}));
