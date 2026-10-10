function externalUrl(value: string | undefined) {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("Product links must use credential-free HTTPS URLs.");
  return url.toString();
}
export const site = {
  live: process.env.SITE_LIVE === "true",
  origin: "https://sorp2026.org",
  msi: "https://mysocialimpact.org",
  official: "https://charitysorp.org",
  readiness:
    process.env.READINESS_ASSESSMENT_URL
      ? externalUrl(process.env.READINESS_ASSESSMENT_URL)
      : "/are-you-sorp-ready/review/?entry=intro",
  platform: externalUrl(
    process.env.MSI_PLATFORM_URL ||
      "https://platform.mysocialimpact.org/snapshot",
  ),
  studio: externalUrl(
    process.env.IDEAS_SHED_URL || "https://www.theideasshed.com/",
  ),
};
export const pillars = [
  {
    number: "01",
    title: "Purpose",
    text: "Be clear about the change you exist to create.",
  },
  {
    number: "02",
    title: "Leadership",
    text: "Make impact a shared responsibility, from trustees to teams.",
  },
  {
    number: "03",
    title: "Data",
    text: "Gather evidence that helps you learn, not just report.",
  },
  {
    number: "04",
    title: "Delivery",
    text: "Turn insight into better decisions and better outcomes.",
  },
  {
    number: "05",
    title: "Communications",
    text: "Tell an honest, compelling story of the difference you make.",
  },
];
