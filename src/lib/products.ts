export type ProductStatus = "Live beta" | "Coming soon" | "Available" | "Explore";

export type PlatformProduct = {
  number: string;
  slug: string;
  name: string;
  short: string;
  status: ProductStatus;
  href: string;
  external?: boolean;
  className: string;
};

export const primaryProducts: PlatformProduct[] = [
  {
    number: "01",
    slug: "sorp-ready",
    name: "Are You SORP Ready?",
    short: "Discover how ready your charity is for impact and sustainability reporting.",
    status: "Live beta",
    href: "/are-you-sorp-ready/",
    className: "is-ready",
  },
  {
    number: "02",
    slug: "ask-sorp",
    name: "Ask SORP",
    short: "Questions about the whole SORP, from accounting and disclosures to impact.",
    status: "Coming soon",
    href: "/ask-sorp/",
    className: "is-ask",
  },
];

export const excellenceProducts: PlatformProduct[] = [
  {
    number: "03",
    slug: "my-impact-director",
    name: "My Impact Director",
    short: "Ongoing senior impact expertise, made more accessible to charities.",
    status: "Explore",
    href: "/my-impact-director/",
    className: "is-director",
  },
  {
    number: "04",
    slug: "social-impact-excellence",
    name: "Social Impact Excellence",
    short: "Assess and improve how your charity understands, manages and delivers impact.",
    status: "Available",
    href: "/social-impact-excellence/",
    className: "is-excellence",
  },
  {
    number: "05",
    slug: "charity-impact-reports",
    name: "Charity Impact Reports",
    short: "Improve an existing report, or work with us to create a stronger one.",
    status: "Available",
    href: "/charity-impact-reports/",
    className: "is-reports",
  },
  {
    number: "06",
    slug: "purpose-works",
    name: "Purpose Works",
    short: "Turn purpose into meaningful action, credible claims and communications.",
    status: "Explore",
    href: "/purpose-works/",
    className: "is-purpose",
  },
];

export const allProducts = [...primaryProducts, ...excellenceProducts];

