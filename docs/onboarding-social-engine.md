# Social dialogue engine — release evidence

Status: candidate under evaluation. Production remains Build 19 until the complete
conversation review and browser checks are accepted. Earlier failed runs are retained
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
- Two sequential Responses API calls per submitted answer, `store:false`, no tools,
  35-second timeout per stage. Last eight dialogue messages plus bounded structured
  facts, rather than an unbounded transcript. Existing credentials are reused.
- PostgreSQL reserves $0.10 before either call. Successful metered calls settle to
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

Final counts, quality verdict, measured cost and deployment identity will be recorded
after this candidate's acceptance run; earlier successful unit tests alone do not
establish production readiness.
