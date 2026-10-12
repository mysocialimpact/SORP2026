# Accountants & Advisers release

The user explicitly requested production deployment after the stage-one preview,
then reported that the preview's illustrative map was a regression.

## Implementation

- The new editorial presentation wraps the original DirectoryExplorer and real
  Leaflet/OSM map; no replacement map, geocodes or database were introduced.
- All 111 original records and profile routes remain intact. Default ordering is
  now alphabetical; postcode searches still sort by distance.
- One search field handles listing names/locations and full postcodes through the
  existing postcode API. A village search matches recorded locations; it is not
  a new nationwide place-geocoding service.
- The compact map stays visible on mobile by default, with the list beneath it.
  List/Map controls, pin selection, map-area search, shortlist and compare remain.
- Five editorial spotlights use the verified public websites recorded in the
  design brief. The four firms not in the original dataset link directly to their
  websites: they have not been assigned invented coordinates or directory records.
- £39/month remains a proposed membership, linked to the existing real enquiry
  form, not a fabricated payment or professional-tools service.
- ICAEW is identified in text. The official logo is withheld from production
  pending confirmation of publication permission. No endorsement is implied.

## Verification

- Production build and lint (one pre-existing static-prototype warning).
- 28 desktop/mobile directory tests passed: real Leaflet initialization, pins,
  list/map synchronization, search-by-area, saved shortlist, postcode response
  fixtures and error handling, all 111 profile routes, enquiry response handling,
  no serious/critical accessibility findings, one search and five features.
- 10 homepage/product regression tests passed.
- External OSM tiles are blocked in the local test environment. Tests deliberately
  abort tile requests while testing the real map library and its fallback. This
  does not constitute an end-to-end verification of public tile delivery.

The earlier static design preview is retained as an historical design artifact;
the release destination is `/accountants-advisers/`, not the prototype URL.
