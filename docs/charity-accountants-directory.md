# Charity accountants directory

## Scope and sources

The directory is part of the existing Next.js site at `/accountants-advisers/`. Existing accounts, products, payments, Growth Engine endpoints and the original MSI website are unchanged. Leaflet and its marker-clustering plugin are the only added runtime dependencies. No subscription, database or new login service is introduced.

`src/data/accountants.json` preserves all 110 rows from the supplied `ICAEW_UK_charity_accountancy_firms.xlsx`, including row numbers, original evidence, source URLs and empty fields. The workbook describes 26 as Verified and 84 as Probable. These are source-research classifications, not professional endorsements. The site deliberately translates them into “website evidence recorded” versus “further checks pending”. Distinct regulated firms with similar names remain separate.

Burton Sweet was absent from the workbook. It is added separately in `accountants-research.json`, giving 111 listings. Its editorial launch placement is explicitly unpaid and unclaimed. Published charity services, four named team members and five office locations were checked against its own website on 12 October 2026. Source links accompany each fact. One primary office is mapped; the five offices do not become five businesses.

The original import is reproducible with Python/openpyxl:

```
python scripts/import-accountants.py workbook.xlsx ukpostcodes.csv.zip
```

The script emits JSON to stdout. It does not overwrite files or invent missing values. Use the `dwyl/uk-postcodes-latitude-longitude-complete-csv` dataset at commit `c23112faee9262d56682d7f90530c6989aacc367`. Its archive is October 2017 data. 109 supplied postcodes matched exactly; Tittensor's CM23 2YU centroid is separately sourced to Doogal, and Burton Sweet's BS48 1UR centroid is also sourced to Doogal. All 111 have postcode-centroid locations within UK bounds, not verified building entrances. Historic postcode coordinates do not establish current office occupancy. Those qualifications appear in the directory and profiles. The historical import is retained for provenance, but every published location is now overridden by a live Postcodes.io result in `accountants-geocodes.json`: all 108 unique postcodes covering all 111 firms returned HTTP 200 on 12 October 2026 through the deployed directory postcode endpoint. These current postcode centroids still do not establish current office occupancy.

25 original rows have no website. They retain their ICAEW contact link and an honest unavailable-information notice. 84 original listings still need independent charity-service checks. The imported 26 website-evidence rows are preserved research, not represented as newly re-audited. External firms may move, merge or change their services; source and review dates are retained so future corrections can be verified.

## Behaviour

- Default: ten results, Burton Sweet first, then alphabetical; Show 10 more reveals additional results.
- Full postcode lookup: server-side Postcodes.io, eight-second timeout, one-day response cache. No API key, browser geolocation, private data or paid geocoder is needed. Search sorts all matching firms strictly by straight-line miles from postcode centres, never by paid priority.
- Name/town/postcode search, evidence-supported AND service filters, optional website-evidence filter and map bounds use one shared selector for pins and results.
- OpenStreetMap standard raster tiles with visible attribution. Requests come directly from the visitor's browser. No offline tile download or prefetch. For a larger audience, review OSM's tile usage policy and move to a suitable provider if needed; no guaranteed tile SLA is claimed.
- Map/list selection is linked; overlapping offices can be expanded by clusters/spiderfying. Zoom and pan work without hijacking desktop page scrolling. A list remains available if maps fail.
- Shortlist holds up to three firms in sessionStorage for this browser tab. No account is required. Compare is a native accessible dialog. No invented client activity is recorded.
- Every firm has a statically generated profile, canonical URL, AccountingService structured data and sitemap entry.
- `?near=<firm-slug>` finds firms near that practice's supplied office postcode; `?firm=<firm-slug>` selects its map location; `?service=<service-id>` applies an evidenced service filter.
- Ask SORP links to its existing coming-soon page. There is no new chatbot.

## Claims and partner enquiries

The form reuses `/api/hello` and the existing SORP message backend, with a clear directory subject, firm/name/role and message. It uses existing origin validation, validation limits, honeypot and submission ID handling. It does not grant listing ownership, change data or create newsletter consent. Messages distinguish email-sent, queued and accepted responses; failures offer the existing direct email contact. No test messages should be sent to third-party firms.

The public directory leads with charity needs, research evidence and human judgement. The former £39/month proposition has been removed from the directory and enquiry page. Claims and introductions use the existing enquiry form and require manual relationship verification and editorial review; submitting a form does not grant ownership or verification.

## Verification

Run `npm run build`, `npm run lint`, `npm run test:product-unit` and `npx playwright test tests/directory.spec.ts`. Run browser tests against `next start`, not a differently named development host: Next 16.4 blocks cross-origin development resources.

The directory suite checks dataset counts/uniqueness/coordinates/evidence, postcode validation and server response/error handling, distance order, filters, all 111 profile responses, the real Leaflet map and selection, area search, mobile toggle, shortlist limits and persistence, profile enquiry payloads, and serious/critical accessibility issues. UK postcode UI tests use explicitly labelled fixtures for Bristol, Cardiff, Edinburgh and Belfast; they are not evidence of live geocoder availability. Tile requests are blocked in that local suite so network availability cannot masquerade as a library regression. Live deployment postcode checks must be recorded separately.

The cloud environment's enforced egress policy blocks direct firm websites, Postcodes.io and map tiles. Public web research was available through the web connector; deployed API responses can be checked with the Vercel fetch tool. A failed local tile request must not be described as a successfully tested live basemap. Existing account/message backend environment configuration is reused; no secret is embedded in client code.

### Live checks, 12 October 2026

The Vercel preview returned live postcode locations for BS1 4DJ (Bristol), CF10 1EP (Cardiff), EH1 1YZ (Edinburgh) and BT1 5GS (Belfast), plus HTTP 400 for an invalid input. The same endpoint successfully resolved all 108 unique directory postcodes, now persisted as current location evidence. Burton Sweet's deployed profile returned HTTP 200 with its named team, claim action and structured data. These checks made no enquiry submissions and sent no emails.

Map selection was repeated five times on each of desktop and mobile (10 passes). Cluster animation was disabled to avoid stale layers after the mobile map is hidden/revealed, while retaining ordinary map panning and zoom controls. Accessible region roles were added after the browser audit caught labels on generic containers. Existing authentication and Growth Engine behaviour remain unchanged.

## MSI human verification — October 2026

The public `Verified by My Social Impact` designation is separate from imported `classification: Verified`, research approval (`approved_at` / Human Reviewed), and featured placement. None of those automatically awards the designation.

In Founder → Accountants & Advisers, open a firm, select **Verified by My Social Impact**, enter the human-assessment reason under **MSI verification decision**, then save. To withdraw, clear the checkbox and record a reason. The existing protected directory endpoint stores approval, actor, decision time and note in `credentials.directory.msiVerification`, with the existing audit trail. No table migration, authentication or payment changes are required. Public pages receive only designation/decision booleans, never the private note or actor. Independent scores and placement priority are not changed by verification.

Burton Sweet shows a dashed **Design preview · not awarded** example until its first explicit verification decision. An approved decision replaces it with the genuine badge; withdrawal removes it rather than restoring the demonstration. No firm was awarded the designation by this release. Badge display is consistent across cards, shortlist and profile; the compact map popup links to the full profile without repeating the longer preview.

The spotlight receives the same visible directory data, so a hidden or unfeatured Burton Sweet is not silently retained as a spotlight. Its placement label follows the founder setting. Any paid placement must be explicitly labelled as paid promotion. There is no payment-to-score or payment-to-verification connection.

Verification: production build and lint (two pre-existing warnings), 142 unit tests, desktop/mobile directory browser checks including all 111 profiles, source/coordinate preservation, shortlist, postcode distance order, map controls, enquiry payload interception and accessibility. Enquiry tests intercept delivery; no external email is sent. Map tiles and postcode UI responses in the browser suite are fixtures/blocked network, not claims of live provider availability.
