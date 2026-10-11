import type { NextConfig } from "next";
const live = process.env.SITE_LIVE === "true";
// Next inlines these values into the compiled application. They identify the
// build, not the visitor's clock or the time a server renders the footer.
const builtAt = new Date(
  process.env.SORP_BUILD_TIMESTAMP || Date.now(),
).toISOString();
// Keep this as a simple release counter. Increment it for each approved
// website release; SORP_BUILD_NUMBER can override it in a release pipeline.
const buildNumber = process.env.SORP_BUILD_NUMBER || "9";
const config: NextConfig = {
  env: {
    NEXT_PUBLIC_SITE_BUILD_NUMBER: buildNumber,
    NEXT_PUBLIC_SITE_BUILT_AT: builtAt,
  },
  poweredByHeader: false,
  trailingSlash: true,
  ...(process.env.STATIC_EXPORT === "true"
    ? { output: "export" as const, images: { unoptimized: true } }
    : {}),
  async redirects() {
    return live
      ? [
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
      : [];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(!live
            ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
            : []),
        ],
      },
    ];
  },
};
export default config;
