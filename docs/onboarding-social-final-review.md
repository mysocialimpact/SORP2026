# Independent conversational review of `ea52a28`

**Acceptance verdict: PASS for this candidate and the submitted evidence.**

Reviewed on 16 October 2026. The primary evidence is [onboarding-social-final-run.json](onboarding-social-final-run.json), containing 26 complete live-model conversations for commit `ea52a28`, deployment `dpl_CfLQQFSjbBhb1r65zf2sa6fv9Y91`. The run reports 112 model-processed user answers, 224 API calls and no wording revisions. The conversations use synthetic personas and explicitly labelled official-record fixtures.

All 26 visible conversations were read before inspecting final states. The language scores were locked before checking states and browser evidence. Implementation changes, technical assertion passes and the desire to release earned no scoring credit. The reviewer made no model calls and changed no application code.

## Locked result

**26/26 journeys pass. Minimum: 83/100. Median: 87.0/100. Mean: 86.94/100. Every critical dimension is at least 3/4. No hard-gate failure was found.**

The unchanged standard in [onboarding-independent-review.md](onboarding-independent-review.md) requires at least 20 complete live journeys, every journey at least 80, a median at least 85, and no hard-gate failure. Listening, acknowledgement, social judgement, memory and ending must each be at least 3. This candidate meets those requirements.

The four supplementary browser journeys also report successful handoff. Their displayed replies and relevant scripted user context were inspected for social failures; none adds a blocker. These browser journeys do not increase the primary corpus's scores or median.

The earlier reviews remain **FAILED** and unchanged. This verdict applies to the new evidence, not retrospectively to the earlier runs.

| Journey | Score | Result | Decisive visible evidence |
|---|---:|---|---|
| C01 | 83.5 | Pass | Receives the pal referral, clarifies Frogs without inventing a professional meaning, and closes on the actual pond explanation. |
| C02 | 87.5 | Pass | Explores team capacity, accepts the grant uncertainty that the answer reveals, and avoids a redundant concern question. |
| C03 | 85 | Pass | Develops audit anxiety into the need to prepare disclosure evidence earlier and reflects that actual concern. |
| C04 | 87.5 | Pass | Uses the rich opening, explores the portfolio concern after confirmation and recognises the information-coordination problem. |
| C05 | 83 | Pass | Treats the terse deadline answer as engagement; the follow-up reveals sole responsibility and a tight year-end timetable. |
| C06 | 87.5 | Pass | Narrows an evidence concern to the connection between reported outcomes and supporting evidence, without inventing a presentation problem. |
| C07 | 87 | Pass | Clarifies the children answer without deciding its meaning in advance, then responds lightly to the toddler explanation. |
| C08 | 86 | Pass | Delivers practical finance-team topics in response to the new trustee's request and reaches a visible ending. |
| C09 | 87.5 | Pass | Receives the winter-reserves worry and reflects uncertainty about four months without assessing financial adequacy. |
| C10 | 87.5 | Pass | Identifies the gap between activity counts and consistent outcome measures and closes on that distinction. |
| C11 | 83.5 | Pass | Asks only for missing registration details, accepts uncertainty and no concern, and avoids repeated personal address. |
| C12 | 87.5 | Pass | Keeps the auditor correction and develops the deadline concern without false apologies or repeated-answer drift. |
| C13 | 84 | Pass | Preserves the historical-client context and develops the impact concern; an unnecessary contrast about prior work limits the score. |
| C14 | 85.5 | Pass | Offers all three unresolved charity choices, follows the Brainstrust selection and explores the reconciliation burden. |
| C15 | 85 | Pass | Meets the spreadsheet humour, asks a useful question and receives the real difficulty reconciling three sets of figures. |
| C16 | 87 | Pass | Accepts refusal immediately and ends without pressure. |
| C17 | 85.5 | Pass | Acknowledges that the broad question felt out of the blue, accepts the objection and stops. |
| C18 | 83.5 | Pass | Accepts that nothing is keeping the user awake and proceeds without further probing. |
| C19 | 92.5 | Pass | Honours urgency immediately and gives a clear next action. |
| C20 | 92.5 | Pass | Stops optional questioning exactly when asked. |
| C21 | 90.5 | Pass | Answers the accountant-replacement question directly and explores the desired balance between useful reporting and administration. |
| C22 | 94 | Pass | Accepts the reminder, explains the actual official-record step without defending intent, and later develops the deadline concern. |
| C23 | 87 | Pass | Distinguishes the original trusteeship from the newly selected charity and explores uncertainty in the figures. |
| C24 | 90 | Pass | Receives the literal conservation concern seriously and recognises the need to explain uncertainty honestly to funders. |
| C25 | 86.5 | Pass | Takes the closure concern seriously, establishes the ending grant and avoids repeatedly intensifying the emotional acknowledgement. |
| C26 | 84 | Pass | Answers the mobile-access question and identifies both inconsistent formats and information arriving after board papers are due. |

## Cases requiring particular scrutiny

### Marcus, his pal and Frogs: C01

The actual sequence includes:

> User: "My pal told me."
>
> Assistant: "Good to hear your pal pointed you our way. I’d like to understand what’s on your mind, too."
>
> "What keeps you up at night?"
>
> User: "Frogs."
>
> Assistant: "Frogs are an unexpected one—how are they keeping you awake?"
>
> User: "Actual frogs in the pond next door. The charity finances are fine, thankfully."

The assistant then closes with the neighbours' frogs and the explicitly stated absence of a finance worry. Its mention of noise is an ordinary contextual inference from frogs keeping the user awake, not an invented professional concern. The follow-up actually changes the understanding of the answer. The conversation is still somewhat formulaic around the referral transition and account handoff; it earns 83.5, not an exceptional naturalness score.

The final state leaves professional concerns empty. This supports the absence of a consequential misinterpretation; it does not add points to the locked language score.

### A brief real concern: C05

After "Deadlines," the assistant asks:

> "Deadlines are the main worry, then. Which one is most on your mind at the moment?"

The user explains that the year-end timetable is tight and they are the only person preparing the accounts. The ending responds to that specific burden. This is meaningful engagement rather than treating brevity as a wish to stop. The surrounding acknowledgements remain ordinary, so this is the lowest passing score at 83.

This finding does not impose a follow-up after every short answer. C16–C20 demonstrate why stopping can be the socially stronger choice.

### A practical request answered visibly: C08

The new trustee asks which questions they should put to the finance team. The delivered response is:

> "Useful starting questions for the finance team cover significant differences from budget, restrictions on funds and anything needing the board’s attention. When you’re ready, create your account to explore Interim Spaces and the SORP guidance."

This supplies useful starting topics and then ends. It is concise rather than a full trustee briefing, but the direct request is answered. The reply is visible in this run; no credit is being assigned to the rejected and unseen draft from the preceding candidate. The earlier path remains slightly indirect, which limits efficiency.

### Financial uncertainty without an unsupported assessment: C09

After the user says the budget shows four months of unrestricted reserves, the assistant responds:

> "Your concern is whether those four months will be enough to get through winter."

It reflects the person's stated uncertainty. It does not declare that four months is adequate or inadequate, and does not imply that SORP guidance will resolve the financial problem. This passes the social-judgement minimum that the previous candidate failed.

### Reminder repair: C22

After "I already told you Interim Spaces," the response is:

> "You’re right — you already said Interim Spaces. Use the Find button to look up its official charity record so you can check it’s the right one."

The reply accepts the reminder and gives the next concrete action. It does not defend what the assistant meant, ask for the name again, or ask the same permission again. The later explicit confirmation action makes the subsequent confirmation statement grounded. A later deadline follow-up also reveals the actual problem: several reporting dates falling in the same week. This is the strongest demonstrated repair in the corpus.

### Minimal participation and multiple charities: C11/C14

C11 accepts "Dunno" about referral and "Nothing actually" about concerns. It does not infer that a minimal answer is hostile or that there must be something more personal to disclose. Its tone remains simple and the ending is prompt.

C14 visibly offers Interim Spaces, Brainstrust and Blue Cross before the selection action. It does not arbitrarily narrow the available clients to one charity. The subsequent conversation follows the selected Brainstrust and explores why client information requires extensive reconciliation. The selection fixture is therefore not hiding an incorrect pre-selection assumption.

## Hard-gate and state checks

No submitted primary conversation showed cheerful approval after a serious concern, persistence after refusal, a direct question being ignored, an explicit correction being lost, repeated requests for already supplied facts, a false claim of completed account creation, or a materially misleading charity handoff.

Narrow clarifications and an unanswered charity-selection question were not counted as repeated-fact violations. Asking how frogs or children keep someone awake was justified by the ambiguity and received a relevant answer. C15 retains the user's humorous spreadsheet expression alongside the subsequently clarified reconciliation difficulty; it does not establish a literal belief that a spreadsheet has a personality.

After the language scores were locked, all 26 final states were inspected. The tested role correction in C12, profile-name correction in C13 and email correction in C26 persist. C14 retains all three client relationships. C23 preserves the original Interim Spaces trusteeship while Brainstrust is the selected exploration charity. Historical Blue Cross relationships remain historical in C13/C24. The personal frog and toddler answers, refusals, objections and no-concern answers do not become professional concerns. The generic conference and finance-adviser referral descriptions are not promoted into named professional organisations.

These checks support state fidelity in the supplied cases. They do not independently establish real regulator verification, real account creation or behaviour in all possible conversations.

## Supplementary browser evidence

[onboarding-browser-final.json](onboarding-browser-final.json) identifies the same commit and deployment and reports four successful journeys, covering historical-client and social/Frogs paths at desktop and touch-mobile viewport sizes. The artifact contains displayed reply sets rather than a second fully interleaved user/assistant corpus. The relevant scripted user inputs were also inspected to interpret these replies fairly.

The historical paths distinguish the past Blue Cross client from the current independent consultancy, receive the funding concern, and close on the user's distinction between meaningful impact and counting activity. The mobile mention of funding being tight is grounded in the scripted user answer.

Both social paths acknowledge the friend referral, ask a relevant frog clarification and then accept that the answer concerns real frogs next door. The desktop ending says:

> "Ah, literal frogs next door — I was looking for a work connection where there wasn’t one!"

That clause is unnecessarily about the assistant's own thinking. It is a minor naturalness weakness, not a blocker: the preceding question was an open clarification, the actual answer is accepted, and the assistant neither assigns a professional problem nor continues probing. The mobile "we’ll leave work out of that one" is similarly a little performative but respects the user's clarification.

The artifact reports a real built Next application, API and model pipeline with isolated PostgreSQL, account, regulator and transcription services. Microphone input used generated audio in Chromium. This review does not claim verification of a physical microphone, real speech recognition, Safari, or the external account and registry providers. The browser evidence supports the tested UI handoffs within that scope.

## Remaining weaknesses and practical limits

- **Naturalness and transitions are good, not outstanding.** Short paraphrases such as "So finance is your focus" and the recurring invitation to explain "what matters" still expose the interview structure. All naturalness and transition ratings remain 3/4.
- **Some endings remain an abrupt product handoff.** They now usually respond to the actual answer, but a relevant reflection followed immediately by account creation can still feel conventional.
- **C13 contains a loose contrast.** "Rather than working within one charity" is not warranted by the earlier statement about a historical charity client. The assistant had correctly identified the client relationship, and the final state does not turn it into employment; this isolated imprecision limits memory to 3 rather than establishing a lost correction or consequential false claim.
- **The broad concern question remains a stylistic risk.** Here it is handled adequately when challenged, declined or answered personally. This corpus does not establish that every user will welcome that framing.
- **A passing run is bounded evidence.** These are 26 synthetic personas with one sampled completion each, supplemented by four browser journeys. They establish that the tested candidate meets the agreed release threshold, not that future generated conversations cannot regress.

These weaknesses are reflected in the scores. They do not justify waiving a gate, and no gate has been waived. The evidence supports release of the tested candidate from the conversational-quality perspective, with the browser scope above kept explicit.

## Full dimension ratings

L = listening; A = acknowledgement; N = naturalness; T = transitions; J = social judgement; C = curiosity; M = memory; O = objectives; E = efficiency; Z = ending. Ratings are integers from 0 to 4. The unchanged weights are respectively 12, 12, 10, 8, 14, 8, 12, 10, 8 and 6; the total is `sum(weight × rating / 4)`.

| Journey | L | A | N | T | J | C | M | O | E | Z |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C01 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 3 | 3 | 3 |
| C02 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 4 | 4 | 3 |
| C03 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 3 | 4 | 3 |
| C04 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 4 | 4 | 3 |
| C05 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 3 | 3 | 3 |
| C06 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 4 | 4 | 3 |
| C07 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 4 |
| C08 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 4 | 3 | 3 |
| C09 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 4 | 4 | 3 |
| C10 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 4 | 4 | 3 |
| C11 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 3 | 3 | 3 |
| C12 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 4 | 4 | 3 |
| C13 | 4 | 3 | 3 | 3 | 3 | 4 | 3 | 4 | 3 | 4 |
| C14 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 4 | 3 | 3 |
| C15 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 3 | 3 | 4 |
| C16 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 4 |
| C17 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 3 | 4 | 3 |
| C18 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 3 | 3 | 3 |
| C19 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 4 | 4 | 4 |
| C20 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 4 | 4 | 4 |
| C21 | 4 | 3 | 3 | 3 | 4 | 4 | 4 | 4 | 3 | 4 |
| C22 | 4 | 4 | 3 | 3 | 4 | 4 | 4 | 4 | 4 | 3 |
| C23 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 4 | 3 | 4 |
| C24 | 4 | 3 | 3 | 3 | 4 | 4 | 4 | 3 | 4 | 4 |
| C25 | 4 | 3 | 3 | 3 | 4 | 4 | 4 | 3 | 3 | 3 |
| C26 | 4 | 3 | 3 | 3 | 3 | 4 | 3 | 4 | 3 | 4 |

Curiosity includes choosing not to probe after a refusal, objection or stop request. A 4 in that dimension does not mean that the assistant asked many questions. Memory receives a 4 where the visible conversation demonstrates stronger continuity; correctly stored facts alone do not raise the language rating.
