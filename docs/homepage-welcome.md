# Homepage welcome preview

Branch: `feat/homepage-audience-hello`. Preview only; do not promote without approval.

## Implemented

- Continuous sage Home divider and hero; all other product themes unchanged.
- Optional, keyboard-operable charity/adviser choices, initially unselected. Session storage only, no network tracking; clicking the selected choice clears it.
- Hero → audience → SORP products → four impact products → retained vision, experience, people, support → Say hello → footer.
- Contact design preview with required email, optional message and separately unchecked newsletter control. Existing account email is recognised through the existing account API. No new authentication.

## Blocking contact integration (verified against repository sources)

The existing `/api/growth-event` proxy forwards to MSI, then Cow's assessment-event ingestion. This is not a contact-submission API. Cow drops free-text details for these events.

The separate `mysocialimpact/msi-growth-engine` implementation is on its `work` branch. Its `/api/v1/events` handler writes minimised `growth_events`; `lib/events.ts` strips email, message, audience and newsletter timestamps from event details. `docs/operations.md` explicitly says contacts and suppressions belong to SORP Leads, not Growth. There is no supported contact-and-consent endpoint in the inspected integration.

**No real hello submission or marketing consent has been persisted or delivered.** The form is explicitly labelled as a preview and sending is disabled; its direct email alternative remains usable. Form drafts are not saved. No speculative endpoint, disconnected database or false success response was added. Do not enable this form by routing it through `email_captured` analytics events.

To finish, the existing MSI contact owner needs a supported server-side contact/hello endpoint that durably records email, optional message, optional audience, source, server timestamp and separate explicit consent/version/timestamp, with an idempotency receipt, spam protection and authenticated account association where available. Confirm that contact ownership with the user before changing the other production application. Then connect it through a same-origin SORP handler, enable the form, and verify actual persistence, retries and failures in staging. Checkbox changes in this preview are not consent records.

No backend, database, payment or MSI production changes are part of this branch.
