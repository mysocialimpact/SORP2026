import type { NextConfig } from "next";
const live = process.env.SITE_LIVE === "true";
import { readFileSync } from "node:fs";
// Written by prepare-build exactly once, reused by every Next process.
const metadata = (() => {
  try { return JSON.parse(readFileSync(".sorp-build.json", "utf8")); }
  catch { return { number: null, deployedAt: null, environment: "development" }; }
})();
if (process.env.VERCEL === "1" && !metadata.number) throw new Error("Run npm run build to prepare deployment metadata first.");
const config: NextConfig = {
  env: {
    NEXT_PUBLIC_SITE_BUILD_NUMBER: String(metadata.number || ""),
    NEXT_PUBLIC_SITE_BUILT_AT: metadata.deployedAt || "",
    NEXT_PUBLIC_SITE_BUILD_ENVIRONMENT: metadata.environment,
    NEXT_PUBLIC_ISOLATED_PREVIEW: process.env.VERCEL_ENV === "preview" && process.env.SORP_ISOLATED_PREVIEW === "true" ? "true" : "false",
  },
  poweredByHeader: false,
  trailingSlash: true,
  ...(process.env.STATIC_EXPORT === "true"
    ? { output: "export" as const, images: { unoptimized: true } }
    : {}),
  async redirects() {
    const legacy = ["/signup", "/sign-up", "/register"].map(source => ({ source, destination: "/get-started/", permanent: false }));
    return live
      ? [...legacy,
          {
            source: "/:path*",
            has: [{ type: "host", value: "(www\\.)?sorp2026\\.com" }],
            destination: "https://sorp2026.org/:path*",
            permanent: true,
          },
          {
            source: "/:path*",
            has: [{ type: "host", value: "www\\.sorp2026\\.org" }],
            destination: "https://sorp2026.org/:path*",
            permanent: true,
          },
        ]
      : legacy;
  },
  async headers() {
    return [
      {
        source: "/build-info.json",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(!live
            ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
            : []),
        ],
      },
      {
        source: "/get-started/:path*",
        headers: [{ key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" }],
      },
    ];
  },
};
export default config;
