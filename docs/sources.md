# Editorial sources — checked 10 October 2026

This file records the initial website build. For current production observations, the simplified redesign, official brand assets and integration results, see [redesign-verification.md](redesign-verification.md). The historical hosting observations below are not the current deployment status.

## Verified live sources

- https://mysocialimpact.org — HTTP 200, published organisation, team biographies, images, platform and studio links.
- https://mysocialimpact.org/animation — HTTP 200, design reference, Marcus Warry ACA attribution and assessment scope.
- https://mysocialimpact.org/are-you-sorp-ready — HTTP 200, impact/sustainability focus, free assessment/report, exclusions, effective date and tier descriptions.
- https://mysocialimpact.org/are-you-sorp-ready/review — HTTP 200, live beta review entry. The product page's Start CTA points to `/are-you-sorp-ready/review?entry=intro`; used unchanged on this site. The existing assessment's report-generation backend was not tested with real charity data.
- https://platform.mysocialimpact.org/snapshot — HTTP 200, linked from the organisation homepage.
- https://www.theideasshed.com/ — HTTP 200, linked from the organisation homepage.

Team profiles are paraphrases of the published My Social Impact biographies. Original image URLs: `/assets/marcus-final.jpg` and `/assets/chris-final.jpg` on mysocialimpact.org. Locally resized WebP copies reduce page weight. Do not imply these are stock portraits or invent additional credentials.

## Authoritative source limitation

https://charitysorp.org and https://www.charitysorp.org returned 502 from Microsoft Azure Application Gateway during verification. The exact PDF URL `https://www.charitysorp.org/documents/d/guest/charities-sorp-2026-1` was found on the live My Social Impact product page, but also returned 502. This is recorded transparently in the source section. Do not describe the full official standard as independently verified in this session.

Effective date/scope are corroborated by the existing My Social Impact assessment introduction. Revenue and lease overview reflects the revised FRS 102 framework and should receive accounting editorial review against the official text before publication. No numerical threshold advice or exhaustive disclosure checklist is offered here.

The five Social Impact Excellence areas come from the user brief and the live My Social Impact page. The brief's plural “Communications” is retained. They are organisational good practice, not claimed as accounting rules.

## Hosting observations

Both sorp2026.org and sorp2026.com returned HTTP 503 through the environment during inspection. GitHub reported no deployments for the empty SORP2026 repository. The user's IONOS screenshot showed only the product overview, not a hosting product, document root or deployment credentials. No DNS or hosting settings were changed.
