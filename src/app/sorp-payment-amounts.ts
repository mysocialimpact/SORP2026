export type SupportChoice = 5 | 10 | 20 | "other";

export function supportPence(choice: SupportChoice, custom: string): number | null {
  if (choice !== "other") return choice * 100;
  const amount = custom.trim();
  if (!/^\d{1,4}(?:\.\d{1,2})?$/.test(amount)) return null;
  const [pounds, pence = ""] = amount.split(".");
  const value = Number(pounds) * 100 + Number(pence.padEnd(2, "0"));
  return value >= 100 && value <= 100000 ? value : null;
}
