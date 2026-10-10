# SORP 2026

An independent, editorial website from My Social Impact, built by The Ideas Shed. Next.js App Router, TypeScript and responsive CSS. No accounts, database, tracking or backend service is required. Fonts and approved team photos are hosted locally.

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
```

The browser suite uses `/usr/bin/chromium` by default. Set `CHROMIUM_PATH` to your local Chromium executable. It tests desktop and mobile navigation, product destinations, every supporting page, overflow, WCAG axe checks, preview indexing restrictions and 404 handling. Build before testing.

`npm run start` starts the production server. Optional environment overrides are documented in `.env.example`. `SITE_LIVE` defaults to false: preview builds include noindex directives and no canonical tags or sitemap URLs. Verified outbound product URLs live in `src/lib/site.ts`; they are server-only configuration and do not require credentials.

## IONOS shared hosting

Version one is fully exportable; a Node server is optional. Confirm the existing hosting product, assigned directory, HTTPS certificate and any existing content before uploading. No DNS changes are included in this project.

Preview export:

```sh
STATIC_EXPORT=true SITE_LIVE=false npm run build
cp deploy/ionos-preview.htaccess out/.htaccess
```

Upload the **contents** of `out/`, including `.htaccess`, through the authorised IONOS deployment route to an unused, assigned preview document root. Do not overwrite an existing website without confirming its exact directory and backup. Absolute asset URLs require serving at the domain root, not a nested path. The export requires no database, PHP or Node runtime.

Approved production export, only after `.org` hosting/TLS and content are verified:

```sh
STATIC_EXPORT=true SITE_LIVE=true npm run build
cp deploy/ionos-live.htaccess out/.htaccess
```

The production template permanently redirects `.com` (and `www` variants) to `https://sorp2026.org`, preserving paths and query strings. Next.js servers use the host-based permanent redirect in `next.config.ts`. The Apache templates require the hosting service to support `.htaccess`, `mod_rewrite` and `mod_headers`; verify on the actual IONOS product. Next.js response headers/redirects are not applied by static hosting automatically.

Before announcing launch, verify homepage and every route on the real host, TLS, images/fonts, the external readiness CTA, privacy notice, canonical tags, sitemap, robots, and a `.com/path?query=value` redirect. Keep the previous deployed files for rollback. A successful local build is not proof of publication or live domain readiness.

## Content and product architecture

- `/`: flagship products, SORP introduction, audience pathways, philosophy, framework and people.
- `/understanding-sorp/`: scope, dates, changes, accessible FAQs and sources.
- `/for-charities/`, `/for-advisers/`: practical audience guidance.
- `/ask-sorp/`: explicitly unavailable, coming-soon product route, ready for a future application.
- `/about/`: verified founders, portraits and attribution.
- `/readiness/`: information and onward navigation to the existing service; no replacement assessment.
- `/privacy/`: current website behaviour and accessibility approach; confirm with final hosting configuration.

See `docs/sources.md` for verification evidence and limitations. The official standard's availability and the live hosting destination remain external prerequisites, not application code defects.
