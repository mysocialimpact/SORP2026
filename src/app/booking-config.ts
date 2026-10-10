export type BookingServiceId = "free" | "readiness" | "wider";

export type BookingService = {
  id: BookingServiceId;
  name: string;
  duration: number;
  priceMinor: number;
  description: string;
  cta: string;
  label?: string;
  includes: readonly string[];
  fee: string;
  supportingEvidence: boolean;
  weeklySlots: Readonly<Record<number, readonly string[]>>;
};

const readinessIncludes = [
  "we review your completed SORP assessment before the meeting",
  "we read the comments and context you added",
  "we identify the most important readiness gaps",
  "we discuss what to prioritise before your next reporting period",
  "we look at where stronger evidence or measurement would help",
  "we help you move from year-end reporting towards managing impact more effectively throughout the year",
] as const;

export const bookingServices: readonly BookingService[] = [
  {
    id: "free",
    name: "QUICK QUESTION / FIT CHECK",
    duration: 10,
    priceMinor: 0,
    description: "Got a quick question or want to see whether My Social Impact can help? Book a short call.",
    cta: "BOOK A FREE 10-MINUTE CALL →",
    includes: [],
    fee: "No professional pre-read is included.",
    supportingEvidence: false,
    weeklySlots: { 2: ["10:00", "14:00", "16:00"] },
  },
  {
    id: "readiness",
    name: "SORP READINESS REVIEW",
    duration: 30,
    priceMinor: 5000,
    description: "Talk through your SORP readiness, gaps and priorities with My Social Impact.",
    cta: "BOOK MY £50 REVIEW →",
    label: "BEST STARTING POINT",
    includes: readinessIncludes,
    fee: "The £50 includes both our preparation beforehand and the 30-minute review session.",
    supportingEvidence: false,
    weeklySlots: { 2: ["11:00", "15:00"], 3: ["10:00", "14:00"], 4: ["10:00", "14:00"] },
  },
  {
    id: "wider",
    name: "SORP + WIDER EVIDENCE REVIEW",
    duration: 60,
    priceMinor: 10000,
    description: "Go deeper into your SORP readiness and the wider impact evidence behind it.",
    cta: "BOOK MY £100 REVIEW →",
    includes: [
      "everything included in the 30-minute SORP Readiness Review",
      "deeper pre-read of your completed assessment and comments",
      "light-touch review of ONE Impact Report or key wider-evidence source before the meeting",
      "strengths and gaps in that wider evidence",
      "how wider evidence can support future SORP reporting",
      "impact measurement and evidence",
      "relevant opportunities across Purpose, Leadership, Data, Delivery and Communication",
      "practical priorities for moving towards Social Impact Excellence",
    ],
    fee: "The £100 includes our preparation, a light-touch wider-evidence review and the 60-minute working session.",
    supportingEvidence: true,
    weeklySlots: { 2: ["16:30"], 3: ["15:30"], 4: ["15:30"] },
  },
] as const;

export function bookingService(id: unknown): BookingService | null {
  return bookingServices.find((service) => service.id === id) || null;
}

export const BOOKING_TIME_ZONE = "Europe/London";
