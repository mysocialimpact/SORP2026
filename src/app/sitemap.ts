import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { firms, firmPath, directoryPath } from "@/lib/accountants";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return site.live
    ? [
        "",
        "/understanding-sorp/",
        "/for-charities/",
        "/for-advisers/",
        "/about/",
        "/ask-sorp/",
        "/my-impact-director/",
        "/social-impact-excellence/",
        "/charity-impact-reports/",
        "/purpose-works/",
        "/our-mission/",
        "/contact/",
        "/are-you-sorp-ready/",
        "/privacy/",
        directoryPath,
        `${directoryPath}partners/`,
        ...firms.map(firmPath),
      ].map((path) => ({
        url: `${site.origin}${path}`,
        changeFrequency: "monthly",
        priority: path === "" ? 1 : 0.7,
      }))
    : [];
}
