import type { NextConfig } from "next";
const live = process.env.SITE_LIVE === "true";
// Next inlines these values into the compiled application. They identify the
// build, not the visitor's clock or the time a server renders the footer.
const builtAt = new Date(
  process.env.SORP_BUILD_TIMESTAMP || Date.now(),
).toISOString();
const buildDigits = builtAt.replace(/\D/g, "").slice(0, 14);
const config: NextConfig = {
  env: {
    NEXT_PUBLIC_SITE_BUILD_NUMBER: `${buildDigits.slice(0, 8)}.${buildDigits.slice(8)}`,
    NEXT_PUBLIC_SITE_BUILT_AT: builtAt,
    NEXT_PUBLIC_SITE_BUILD_ENVIRONMENT:
      process.env.VERCEL_ENV === "production" && live
        ? "Production"
        : live
          ? "Live build"
          : "Preview",
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
