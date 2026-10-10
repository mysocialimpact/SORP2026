import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return site.live
    ? {
        rules: { userAgent: "*", allow: "/", disallow: "/readiness/" },
        sitemap: `${site.origin}/sitemap.xml`,
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
