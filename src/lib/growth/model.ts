export const stages = {
  accountants: ["Researched","Shortlisted","Contacted","Conversation started","Demo booked","Demo completed","Active strategic partner","Follow up later","Not interested"],
  charities: ["Identified","Researching","Report prepared","Report approved","Contacted","Conversation started","Meeting booked","Registered","Consulting engagement","Follow up later","Not interested"],
} as const;
export type Kind = keyof typeof stages;
export const channels = [
  { key:"accountants", title:"Accountants & Advisers", description:"Find the right firms, prepare an introduction and follow each partnership." },
  { key:"charities", title:"Charity Outreach", description:"Research charities, prepare something useful and track the relationship." },
  { key:"digital", title:"Digital Marketing", description:"See the registrations, assessment activity and enquiries the platform can verify." },
] as const;
export const growthPath = "/founder/growth/";
export function isKind(value: unknown): value is Kind { return value === "accountants" || value === "charities"; }
export function publicWebUrl(value: string) {
  try { const url = new URL(value); return ["https:","http:"].includes(url.protocol) && !url.username && !url.password ? url.href : ""; }
  catch { return ""; }
}
export function introduction(firm: string, source?: { title: string; url: string }, person?: string) {
  return {
    subject: `Supporting ${firm}’s charity clients with SORP 2026`,
    body: `Hi ${person || "there"},\n\n${source ? `I came across ${source.title} while researching ${firm} (${source.url}).\n\n` : ""}I’m working on SORP 2026, a platform to help charities prepare for reporting and help their advisers support them. I’d welcome a short conversation about whether the platform could be useful for your firm and its charity clients.\n\nWould you be open to a brief demo?\n\nMarcus\nMy Social Impact\nIf you’d prefer no further messages from me about this, please reply and I’ll update my records.`,
  };
}
