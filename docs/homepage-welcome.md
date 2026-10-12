# Homepage welcome preview

Branch: `feat/homepage-audience-hello`. Preview only; do not promote without approval.

## Implemented

- Continuous sage Home divider and hero; all other product themes unchanged.
- Optional, keyboard-operable charity/adviser choices, initially unselected. Session storage only, no network tracking; clicking the selected choice clears it.
- Hero → audience → SORP products → four impact products → retained vision, experience, people, support → Say hello → footer.
- Contact design preview with required email, optional message and separately unchecked newsletter control. Existing account email is recognised through the existing account API. No new authentication.

## Contact integration

The existing `/api/growth-event` remains an unsuitable destination because it strips contact details. The form instead reuses the established SORP message service already used for human support messages. `/api/hello` validates and forwards the submission server-side, and the interface confirms success only after that service returns `accepted`.

The separate `mysocialimpact/msi-growth-engine` implementation is on its `work` branch. Its `/api/v1/events` handler writes minimised `growth_events`; `lib/events.ts` strips email, message, audience and newsletter timestamps from event details. `docs/operations.md` explicitly says contacts and suppressions belong to SORP Leads, not Growth. There is no supported contact-and-consent endpoint in the inspected integration.

Email, optional message, audience and source are included. Newsletter consent is explicit, unchecked by default and accompanied by a server timestamp only when selected. A session-stable submission ID and honeypot provide duplicate/basic automated-spam protection. Existing account email recognition remains client-side through the established account API.

No backend, database, payment or MSI production changes are part of this branch.
