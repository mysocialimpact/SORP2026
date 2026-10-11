import type { PillarKey, Question } from "./models.ts";

export const PILLARS: { key: PillarKey; label: string; number: string; strapline: string }[] = [
  { key: "purpose", label: "Purpose", number: "01", strapline: "Why we exist" },
  { key: "leadership", label: "Leadership", number: "02", strapline: "How we lead" },
  { key: "data", label: "Data", number: "03", strapline: "How we measure" },
  { key: "delivery", label: "Delivery", number: "04", strapline: "What we do" },
  { key: "communication", label: "Communication", number: "05", strapline: "How we share" }
];

export const QUESTIONS: Question[] = [
  { id: 1, pillar: "purpose", statement: "We are clear about our organisation’s purpose and the impact we aim to create", meaning: "We can clearly describe why we exist and the outcomes or changes we aim to achieve." },
  { id: 2, pillar: "purpose", statement: "Our purpose reflects a clear understanding of our key stakeholders or beneficiaries", meaning: "Our purpose is grounded in a real understanding of who we serve and what matters to them." },
  { id: 3, pillar: "purpose", statement: "Our purpose is understood across the organisation", meaning: "Staff understand our purpose and it influences how people think and act." },
  { id: 4, pillar: "purpose", statement: "Our business strategy is aligned with our purpose and intended impact", meaning: "Our plans, priorities and decisions actively support our purpose." },
  { id: 5, pillar: "purpose", statement: "We can clearly explain how our activities deliver on our purpose", meaning: "We can explain how what we do leads to the outcomes we aim to achieve, for example through a Theory of Change." },
  { id: 6, pillar: "leadership", statement: "Senior leadership has clear responsibility for impact", meaning: "A senior leader or leadership group is clearly accountable for driving impact." },
  { id: 7, pillar: "leadership", statement: "Impact is discussed regularly in leadership meetings", meaning: "Impact is reviewed alongside priorities such as financial performance." },
  { id: 8, pillar: "leadership", statement: "There are clearly defined roles for managing and delivering impact", meaning: "People know who is responsible for what when it comes to impact." },
  { id: 9, pillar: "leadership", statement: "Staff responsible for impact have the skills and training they need", meaning: "People are equipped to manage and deliver impact, not simply expected to figure it out." },
  { id: 10, pillar: "leadership", statement: "Impact is consistently considered in leadership decision-making", meaning: "Leaders consider impact alongside cost, revenue and risk when making decisions." },
  { id: 11, pillar: "data", statement: "We collect data to understand and track our impact", meaning: "We collect data regularly, in a structured way, and use it to understand what is working." },
  { id: 12, pillar: "data", statement: "We have clearly defined KPIs or indicators to measure our impact", meaning: "We have identified the key measures that define success or impact." },
  { id: 13, pillar: "data", statement: "Our impact data is accurate, consistent and collected in a structured way", meaning: "Data is reliable, gathered regularly and follows a clear process." },
  { id: 14, pillar: "data", statement: "We use systems or tools to manage and review our impact data", meaning: "Data is organised, accessible and reviewed rather than scattered or ad hoc." },
  { id: 15, pillar: "data", statement: "We can clearly demonstrate the impact of our work using data", meaning: "We can show credible evidence of real change, not only activity." },
  { id: 16, pillar: "delivery", statement: "Impact is built into our core business model", meaning: "Impact is part of what we do as a business, not a side activity or add-on." },
  { id: 17, pillar: "delivery", statement: "We deliver impact consistently across our activities and operations", meaning: "Impact is delivered reliably, not dependent on one-off initiatives or individuals." },
  { id: 18, pillar: "delivery", statement: "Impact is part of how people actually do their jobs day-to-day", meaning: "Impact is embedded in normal working practices, not treated as extra." },
  { id: 19, pillar: "delivery", statement: "Our approach to impact is financially sustainable", meaning: "We can continue delivering impact without relying on short-term or uncertain funding." },
  { id: 20, pillar: "delivery", statement: "We regularly improve how we deliver impact based on what we learn", meaning: "We review what works, learn from experience and make improvements." },
  { id: 21, pillar: "communication", statement: "We communicate our purpose and impact clearly and relevantly to key stakeholders", meaning: "Our communication is easy to understand and tailored to the audience." },
  { id: 22, pillar: "communication", statement: "Our purpose and impact messaging is consistent across all channels", meaning: "Messaging is aligned across our website, reports, presentations and marketing." },
  { id: 23, pillar: "communication", statement: "Our communication about impact is supported by credible data or evidence", meaning: "We can back up what we say with reliable evidence that supports our claims." },
  { id: 24, pillar: "communication", statement: "We are open and transparent about challenges as well as successes", meaning: "We communicate honestly about what is not working, not just what is going well." },
  { id: 25, pillar: "communication", statement: "We actively use our purpose and impact to support key areas of the business", meaning: "We use impact to create value with customers, investors, partners and suppliers." }
];
