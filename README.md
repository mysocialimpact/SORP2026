# SORP 2026

The SORP 2026 marketing website and Are You SORP Ready product from My Social Impact, built by The Ideas Shed. It uses Next.js App Router, TypeScript and responsive CSS. Fonts and approved team photos are hosted locally.

## Develop

Use Node.js 24 and npm 11. From the checkout:

```sh
npm ci
npm run dev
```

In the managed cloud environment use `npm ci --cache /workspace/.npm-cache` if the default cache is not writable. Each cloud task is already isolated; use the existing checkout and do not create a worktree unless requested.

```sh
npm run build
npm run typecheck
npm run lint
npm run test:e2e
node tests/sorp-journey.browser.mjs
```

The browser suite uses `/usr/bin/chromium` by default. Set `CHROMIUM_PATH` to your local Chromium executable. It tests desktop and mobile navigation, product destinations, every supporting page, overflow, WCAG axe checks, preview indexing restrictions and 404 handling. Build before testing.

`npm run start` starts the production server. Environment settings are documented in `.env.example`. `SITE_LIVE` defaults to false: preview builds include noindex directives and no canonical tags or sitemap URLs. The public assessment and report depend on the readiness APIs. Accounts, payments and calendar booking remain unavailable until their destination-specific credentials are configured.

## Deployment

The complete product requires a Next.js server deployment because its account,
assessment, report, payment and booking endpoints run as server routes. Deploy it
to the existing `sorp2026` Vercel project with the environment settings listed
in `.env.example`.

The marketing-only pages can still be exported for archival or preview use, but
the static export does not include a working assessment product.

Preview export:

```sh
STATIC_EXPORT=true SITE_LIVE=false npm run build
cp deploy/ionos-preview.htaccess out/.htaccess
```

Upload the **contents** of `out/`, including `.htaccess`, through the authorised IONOS deployment route to an unused, assigned preview document root. Do not overwrite an existing website without confirming its exact directory and backup. Absolute asset URLs require serving at the domain root, not a nested path. The export requires no database, PHP or Node runtime.

The production template permanently redirects `.com` (and `www` variants) to `https://sorp2026.org`, preserving paths and query strings. Next.js servers use the host-based permanent redirect in `next.config.ts`.

Before announcing launch, verify homepage and every route on the real host, TLS, images/fonts, the local readiness CTA, privacy notice, canonical tags, sitemap, robots, account sign-in, a representative assessment and report, and the optional payment and booking flows. Keep the previous deployment available for rollback. A successful local build is not proof of publication or live domain readiness.

## Content and product architecture

- `/`: flagship products, SORP introduction, audience pathways, philosophy, framework and people.
- `/understanding-sorp/`: scope, dates, changes, accessible FAQs and sources.
- `/for-charities/`, `/for-advisers/`: practical audience guidance.
- `/ask-sorp/`: explicitly unavailable, coming-soon product route, ready for a future application.
- `/about/`: verified founders, portraits and attribution.
- `/are-you-sorp-ready/`: the product presentation and route into the local assessment.
- `/are-you-sorp-ready/review/`: the assessment, saved account journey and report.
- `/privacy/`: current website, assessment and connected-service behaviour.

See `docs/sources.md` for verification evidence and limitations. The official standard's availability and the live hosting destination remain external prerequisites, not application code defects.
