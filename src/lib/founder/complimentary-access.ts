export function complimentaryAccessEnd(body: Record<string, unknown>, now = new Date()) {
  if (body.complimentary !== true) return null;
  const duration = String(body.duration || "indefinite");
  if (duration === "indefinite") return null;
  if (duration === "custom") {
    const expiry = String(body.expiry || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) throw new Error("Choose the date on which complimentary access should end.");
    const end = new Date(`${expiry}T23:59:59.999Z`);
    if (Number.isNaN(end.getTime()) || end.toISOString().slice(0, 10) !== expiry || end.getTime() <= now.getTime()) throw new Error("Choose a valid future expiry date.");
    return end.toISOString();
  }

  // Keep accepting the two durations supported by the original Founder Centre
  // while using the founder-selected period format for new requests.
  const legacyDays = duration === "30" || duration === "90" ? Number(duration) : null;
  const amount = legacyDays ?? Number(body.durationAmount);
  const unit = legacyDays ? "days" : String(body.durationUnit || "");
  const maximum = unit === "days" ? 3_650 : unit === "weeks" ? 520 : unit === "months" ? 120 : 0;
  if (!Number.isInteger(amount) || amount < 1 || amount > maximum) throw new Error("Enter a valid access period in days, weeks or months.");

  const end = new Date(now);
  if (unit === "days") end.setUTCDate(end.getUTCDate() + amount);
  else if (unit === "weeks") end.setUTCDate(end.getUTCDate() + amount * 7);
  else {
    const day = end.getUTCDate();
    end.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + amount);
    const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    end.setUTCDate(Math.min(day, lastDay));
  }
  return end.toISOString();
}
