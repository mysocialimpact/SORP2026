# Conversational intelligence evaluation

For complete social-quality acceptance, use the 26-journey suite and independent
rubric in [SOCIAL-REVIEW.md](SOCIAL-REVIEW.md). The narrower factual suite below
cannot establish that a conversation is natural or that its ending is appropriate.

`npm run test:onboarding` runs deterministic reducer, provenance, validation and
question-planning regressions without API charges. CI runs it on engine changes.
`npm run test:product-unit` runs the wider product checks.

`SORP_LIVE_EVAL=true npm run eval:onboarding:live` requires the existing
`OPENAI_API_KEY` or `OPEN_API_KEY`. It uses the production `processTurn` and model
request/decoder, never canned model answers. The 22 journeys check semantic state,
current/past relationships, authoritative edits, question suitability, non-repetition,
confirmation boundaries, resumption and completion. Registry confirmation fixtures
are synthetic: this suite does not certify a regulator match. Reports are written
to `test-results/onboarding-live-eval.json`; do not publish conversations from real users.

Runs are bounded to 40 answers (two model stages per answer) and $1.20, including
measured spend plus conservative admission reservations. Unknown failures retain
the full reservation.
Token-based estimated cost is recorded separately. Set `SORP_EVAL_IDS` to comma-separated
journey IDs for targeted investigation. Live evaluation is deliberately opt-in, so
ordinary PR builds do not silently incur model costs. A passing run is evidence for
these cases, not a guarantee of accuracy for every possible answer.

For production-equivalent browser evaluation on an authorized Vercel preview, set
the **deployment's** build command to `node tests/onboarding-evals/build-preview.mjs`.
Do not change the project's normal build command. This runs the live suite, builds
Next, then runs desktop and mobile Chromium against the actual application and API,
a fresh ephemeral PostgreSQL database and the existing model credential. It does
not connect to the production database or create real accounts. Account, charity
lookup and transcription providers are isolated HTTP fixtures. Desktop audio uses
actual MediaRecorder/AnalyserNode with generated input, followed by a fixture
transcript and genuine conversational generation. Mobile uses typed input.

The browser journey covers the Blue Cross historical client, name correction,
autosave/reload, current work, early referral/concerns, explicit official-record
confirmation and account handoff. Reports remain in private build output; summaries
contain only synthetic test data. Do not claim physical microphone, Safari,
regulator, email or payment-provider verification from this harness.

After an unchanged model pipeline has passed the full suite, `SORP_EVAL_BROWSER_ONLY=true`
can rerun the preview browser/build harness without repeating billable engine evaluations.
