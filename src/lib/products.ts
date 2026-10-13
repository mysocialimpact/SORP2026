export type ProductStatus = "Live beta" | "Available" | "Explore";

export type PlatformProduct = {
  number: string;
  slug: string;
  name: string;
  short: string;
  status: ProductStatus;
  href: string;
  external?: boolean;
  className: string;
  tabLabel: string;
  tabColour: string;
  tabInk: string;
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
    tabLabel: "Are You SORP Ready?",
    tabColour: "#ff633b",
    tabInk: "#242329",
  },
  {
    number: "02",
    slug: "ask-sorp",
    name: "Ask SORP",
    short: "Questions about the whole SORP, from accounting and disclosures to impact.",
    status: "Live beta",
    href: "/ask-sorp/",
    className: "is-ask",
    tabLabel: "Ask SORP",
    tabColour: "#d9e4f2",
    tabInk: "#242329",
  },
];

export const excellenceProducts: PlatformProduct[] = [
  {
    number: "03",
    slug: "charity-impact-reports",
    name: "Charity Impact Reports",
    short: "Improve an existing report, or work with us to create a stronger one.",
    status: "Available",
    href: "/charity-impact-reports/",
    className: "is-reports",
    tabLabel: "Charity Impact Reports",
    tabColour: "#ffd567",
    tabInk: "#242329",
  },
  {
    number: "04",
    slug: "social-impact-excellence",
    name: "Social Impact Excellence",
    short: "Assess and improve how your charity understands, manages and delivers impact.",
    status: "Available",
    href: "/social-impact-excellence/",
    className: "is-excellence",
    tabLabel: "Social Impact Excellence",
    tabColour: "#f0a7c1",
    tabInk: "#242329",
  },
  {
    number: "05",
    slug: "my-impact-director",
    name: "My Impact Director",
    short: "Ongoing senior impact expertise, made more accessible to charities.",
    status: "Explore",
    href: "/my-impact-director/",
    className: "is-director",
    tabLabel: "My Impact Director",
    tabColour: "#d8ff52",
    tabInk: "#242329",
  },
];

export const allProducts = [...primaryProducts, ...excellenceProducts];

export const homeFolder = {
  number: "Index", slug: "home", tabLabel: "Home", status: "Platform index",
  href: "/", className: "is-home", tabColour: "#cfddcf", tabInk: "#1b3931",
};

export const folderTabs = [homeFolder, ...allProducts];

export function folderForPath(pathname: string) {
  const path = `${pathname.replace(/\/$/, "")}/`;
  return allProducts.find(product => path.startsWith(product.href)) || homeFolder;
}

