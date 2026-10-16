# Complete-conversation quality gate

Field accuracy is necessary but does not establish conversational quality. Review
whole transcripts, including actual UI confirmation/edit actions and the ending.
Use synthetic personas; never commit real users' private introductions.

## Reproducible execution

`SORP_LIVE_EVAL=true npm run eval:onboarding:social` uses the same `processTurn`,
structured extraction, state reducer and dialogue generation as the production API.
It requires the existing `OPENAI_API_KEY` or `OPEN_API_KEY`. Twenty-six adaptive
persona scripts respond to actual objectives until completion. No assistant replies
are mocked. Official-record confirmations are explicitly labelled service fixtures.

The runner bounds the evaluation to 160 submitted answers and $8 estimated spend,
including outstanding worst-case reservations. It records actual token usage and
conservatively ignores cached-token discounts. Three journeys may run concurrently.
`SORP_SOCIAL_IDS=C01,C07` selects a diagnostic subset; a subset cannot establish a
release pass. The JSON report is `test-results/onboarding-social-eval.json`.

For the authorised Vercel preview, override only that deployment's build command:

```
SORP_SOCIAL_BROWSER=true node tests/onboarding-evals/build-social-preview.mjs
```

The browser harness uses the built application, genuine model calls and a fresh,
isolated PostgreSQL database. It runs historical-client/manual-correction and
finance-trustee/referral/surprising-answer journeys on desktop and touch-mobile.
MediaRecorder and audio analysis receive generated audio; the transcript, account
and regulator services are fixtures. It does not send real emails, charge payments
or write production account data. It does not verify physical microphones or Safari.

A READY preview does **not** mean the conversational evaluation passed: failed
evaluation artefacts remain available for investigation. Check `SOCIAL_SUMMARY`,
`SOCIAL_BUILD_STATUS`, the browser summary, and the independent review explicitly.

## Independent rubric

Score each dimension 0–4: 0 harmful/broken, 1 poor, 2 functional but conspicuous,
3 good professional conversation, 4 perceptive and natural. Weight as follows:

| Dimension | Weight |
| --- | ---: |
| Listening | 12 |
| Appropriate acknowledgement | 12 |
| Naturalness | 10 |
| Topic transitions | 8 |
| Social judgement | 14 |
| Useful curiosity | 8 |
| Memory and corrections | 12 |
| Objective achievement | 10 |
| Efficiency | 8 |
| Ending quality | 6 |

Require every complete journey to reach 80/100, a median of at least 85, and at
least 3 in listening, acknowledgement, social judgement, memory and ending.
Do not award social points merely because fields were populated. Do not replace a
failed full run with selected passing examples. Document shortcomings and rerun the
affected class of cases after a general fix; final acceptance requires the full run.

Hard failures override averages: inappropriate cheerfulness about serious distress;
an unverified joke recorded as a professional fact; ignoring a direct question;
repeating a declined optional question or disregarding a stop request; invented
verification, downloads or account actions; lost explicit corrections; asking for
already-known essential information; or an ending that materially misrepresents
what happened. Incomplete journeys cannot receive a complete-conversation pass.

The reviewer should not have implemented the engine. Blind runtime-model identity
when comparing alternatives. Record scores, evidence and failures, not only a global
impression. Keep the model choice tied to observed quality and measured cost.

Deterministic regressions run automatically in `.github/workflows/onboarding-engine.yml`.
Billable live evaluation remains explicit. Any engine/prompt/runtime change needs a
new full evaluation and independent review before production promotion; old evidence
must be labelled with its commit and deployment rather than silently reused.
