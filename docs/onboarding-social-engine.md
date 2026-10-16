# Social dialogue engine — release evidence

Status: Build 20 deployed and production HTTP checks verified on 16 October 2026.
All 26 conversations and four browser journeys passed
the required checks and independent review. Earlier failed runs are retained
in [the independent review](onboarding-independent-review.md); technical field-test
success is not a conversational-quality pass.

## Diagnosed causes and implementation

The previous production extraction prompt explicitly forbade greetings,
acknowledgements and entity summaries. It required empty language for concerns,
charity selection, clarification and completion; the controller supplied fixed text
for those objectives. The model saw structured facts and the current question, but
not the actual exchange. Correct extraction therefore led to the next questionnaire
item and a generic ending irrespective of the final answer.

The API and evaluations now share this processing cycle:

1. Interpret the latest user message in bounded, role-delimited dialogue context.
2. Validate evidence, entity identity, corrections and historical relationships;
   update the authoritative state using the deterministic reducer.
3. Evaluate required information, optional participation and remaining turn budget.
4. Generate the whole reply: interpret its social significance, choose an allowed
   conversational move, then react and progress, briefly explore, or conclude.
5. Validate the reply against application permissions and render both form and
   conversation from the same revised snapshot.

The dialogue model can choose a short professional follow-up and one final
clarification. Neither is compulsory. The six-information-answer budget and ten-answer
hard cap remain; repairs do not consume the optional allowance. Declines and explicit
finish requests take precedence. Optional topic participation is separate from a
professional fact: a personal answer, joke or refusal can satisfy the conversation
without becoming a professional concern.

The current answer is a distinct user message, rather than one string among older
answers in a JSON payload. Explicit charity confirmation records the preceding
assistant reply and a labelled UI action in conversational memory. This prevents
acknowledgements disappearing when a button replaces the current question. Rich
early disclosures can also receive a bounded follow-up after confirmation. The
future confirmation reply is generated in the existing dialogue call, then validated
against the actual confirmed state; it does not require another model call.

Model-generated private interpretation is not stored as a profile fact. Manual edits
remain authoritative and name placeholders render against live state. Historical
clients remain historical, and mentioned charities remain unverified until explicit
confirmation of a server-returned official record. Auth, billing, subscription rules,
voice components, public charity preparation and shared product context are retained.
The only visual copy change is the completion eyebrow, “READY WHEN YOU ARE”.

## Runtime and cost controls

- Extraction: `gpt-5.4-mini-2026-03-17`, low reasoning, 4,000 output-token cap.
- Dialogue: `gpt-6.1-sol`, medium reasoning, 3,000 output-token cap.
- Normally two sequential Responses API calls per submitted answer, `store:false`, no tools,
  35-second timeout per call. A draft rejected by language validation receives at most
  one revision, capped at 2,000 output tokens; provider failures are not retried.
  Neither draft can reach the UI without passing the same validation. Last eight dialogue messages plus bounded structured
  facts, rather than an unbounded transcript. Existing credentials are reused.
- PostgreSQL reserves $0.15 before extraction, including the possible revision. Successful metered calls settle to
  estimated standard-rate cost; uncertain failures retain the full reservation.
  Existing $1/day and $10/month defaults and hard ceilings remain unchanged.
- Official standard rates checked on 16 October 2026: mini $0.75/$4.50 and Sol
  $2/$10 per million input/output tokens. Cached-input discounts are ignored in
  estimates. See [OpenAI pricing](https://developers.openai.com/api/docs/pricing).

Blind five-persona comparisons found no clear quality gain from GPT-6 Astra at
medium reasoning, while its measured cost was higher. GPT-6 Luna was less consistent
and one journey failed to complete. The preview-only comparison switch cannot be
selected by an onboarding user or enabled in the production environment.

No database migration, paid service or storage change is required. Public PDF
downloads retain their existing production configuration; this dialogue release
does not claim to enable or independently verify them.

## Evaluation and limits

The reusable [26-journey suite and rubric](../tests/onboarding-evals/SOCIAL-REVIEW.md)
assess full conversations separately from factual correctness. Every runtime/prompt
change requires fresh live evidence and an independent transcript review. CI also
runs deterministic onboarding regressions automatically when the engine changes.

Browser evaluation uses the actual built Next application and API, real model calls
and isolated PostgreSQL. Account, regulator and transcription services are fixtures;
no real email, payment or production account is created. Desktop and touch-mobile
exercise historical context, authoritative edits, reload, explicit confirmation,
voice transcript review, surprising final answers and account handoff. MediaRecorder
and audio analysis use generated audio. Physical microphones, Safari and real
transcription-provider delivery are not certified by this harness.

## Candidate evidence (`ea52a28`)

- [Complete live-model corpus](onboarding-social-final-run.json): 26/26 journeys
  completed, 112 submitted answers, 224 API calls, no fallback wording and no
  revision calls. Mean length: 4.31 answers. The billable estimate was $1.0474405
  in total, or $0.0403 per conversation; five answers at the observed mean cost
  would be about $0.047. These figures exclude transcription, hosting and storage.
- [Built-application browser evidence](onboarding-browser-final.json): four passed
  journeys, 16 submitted answers. Desktop and touch-mobile each cover historical
  work/manual corrections and the exact trustee/finance/friend/frogs flow, through
  account handoff. The service-fixture and microphone limitations above apply.
- 230 product unit tests and nine isolated PostgreSQL integration tests passed.
  TypeScript and production build passed. Repository lint has zero errors and two
  pre-existing warnings outside onboarding.
- [Independent GPT-6 Astra review](onboarding-social-final-review.md): 26/26 pass,
  minimum 83/100, median 87/100, mean 86.94/100, every critical dimension at least
  3/4, no hard-gate failure. Browser reply sets were inspected separately with no
  additional blocker. Occasional formulaic acknowledgements and a self-focused
  browser ending remain non-blocking quality limitations; these are not perfect or
  human-reviewed conversations.
- Evaluation deployment: `dpl_CfLQQFSjbBhb1r65zf2sa6fv9Y91`, READY.
  `https://sorp2026-r6urg0nvi-marcuswarry.vercel.app/get-started/` returns HTTP 200,
  but the public preview's onboarding session feature is disabled (HTTP 503).
  Interactive acceptance used its built Next application with the feature enabled
  and isolated services during the preview build. This is not a claim that an
  unauthenticated visitor can run onboarding on the hosted preview.

## Release

Build 20 packages the accepted `ea52a28` engine; subsequent release edits are
documentation, a server comment and the visible build number. The initial production
release was commit `f2e39024507c4285bba67a2deb510d8e8b26462e`, deployment
`dpl_AeCPRZ3DLQHksecZT86gJavUyZC3`, READY on 16 October 2026. Production checks at
13:09 UTC verified:

- `https://sorp2026.org/get-started/`: HTTP 200 and visible Build 20 in the page shell.
- `/api/onboarding/session/`: HTTP 200, `available:true`.
- `/api/readiness-account/`: HTTP 200, `signedIn:false` for the anonymous check.

These are deployment/availability checks, not a fresh production sign-up. Real-model
interactive verification is the isolated acceptance evidence above. No real customer
account, verification email or payment was created during release verification.
Later documentation commits do not change the accepted engine.

The previous working deployment, Build 19,
`dpl_9cvsQzdiJwTWwy2U8HGv3tmUNtuq`, is retained as a rollback candidate. No
authentication, payment, subscription or database migration accompanies this release.
