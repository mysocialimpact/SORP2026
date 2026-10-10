# SORP 2026

The SORP 2026 gateway and existing Are You SORP Ready product from My Social Impact, built by The Ideas Shed. Next.js App Router, TypeScript and scoped CSS. The four main pages are Home, Are You SORP Ready?, Ask SORP and Contact. Fonts, official logos and approved team photos are hosted locally.

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
npm run test:product-unit
node tests/sorp-journey.browser.mjs
```

The browser suite uses `/usr/bin/chromium` by default. Set `CHROMIUM_PATH` to your local Chromium executable. It tests desktop and mobile navigation, product destinations, every supporting page, overflow, WCAG axe checks, preview indexing restrictions and 404 handling. Build before testing.

`npm run start` starts the production server. Environment settings are documented in `.env.example`. `SITE_LIVE` defaults to false: preview builds include noindex directives and no canonical tags or sitemap URLs. Set `SORP_BACKEND_ORIGIN=https://mysocialimpact.org` in authorised integration previews to use the existing account, booking, payment and tracking proxies. Secrets stay on MSI; do not copy them here. Assessment and report generation use the existing readiness service.

The browser journey script uses intercepted fixtures to exercise all 19 questions, report generation and restoration. Payment, booking and email simulations make no real external writes. `tests/live-services.mjs` and `tests/live-readiness.mjs` are separate, explicit opt-in diagnostics and are never run in CI: they create labelled QA accounts. The latter blocks email, booking, payment and tracking writes in its browser. See `docs/redesign-verification.md` for actual observed results and remaining integration limits.

## Deployment

The complete product requires a Next.js server deployment because its account,
assessment, report, payment and booking endpoints run as server routes. Deploy it
to the existing `sorp2026` Vercel project with the environment settings listed
in `.env.example`.

Use a feature-branch Vercel **Preview** deployment with `SITE_LIVE=false`; keep production unchanged until approved. IONOS is the DNS registrar, not the application host. The old static-export files are historical and are not a deployment path for this server-backed product. Next.js redirects `.com` and `www` variants permanently to `https://sorp2026.org` when live mode is enabled.

Before announcing launch, verify homepage and every route on the real host, TLS, images/fonts, the local readiness CTA, privacy notice, canonical tags, sitemap, robots, account sign-in, a representative assessment and report, and the optional payment and booking flows. Keep the previous deployment available for rollback. A successful local build is not proof of publication or live domain readiness.

## Content and product architecture

- `/`: two products, prominent MSI attribution, people and a brief wider vision.
- `/understanding-sorp/`: scope, dates, changes, accessible FAQs and sources.
- `/for-charities/`, `/for-advisers/`: practical audience guidance.
- `/ask-sorp/`: four-slide, keyboard and touch accessible coming-soon presentation; no chatbot.
- `/contact/`: Marcus’s email, portrait and official organisation identities.
- `/about/`: verified founders, portraits and attribution.
- `/are-you-sorp-ready/`: the product presentation and route into the local assessment.
- `/are-you-sorp-ready/review/`: the assessment, saved account journey and report.
- `/privacy/`: current website, assessment and connected-service behaviour.

See `docs/sources.md` for verification evidence and limitations. The official standard's availability and the live hosting destination remain external prerequisites, not application code defects.
