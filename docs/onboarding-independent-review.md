# Independent conversational-quality review

**Status: FAILED historical runs. This document does not approve the onboarding experience for release.**

Reviewed on 16 October 2026 by a separate review agent. Application code was not edited and no model calls were made by the reviewer. Scores assess complete visible conversations, not extraction accuracy or the implementation's assertion results. The full-run scores were locked before inspecting the subsequent orchestration changes.

The repaired implementation and its forthcoming full run have not been independently assessed in this document. Engineering reports of improvements do not change these historical verdicts.

## Rubric and acceptance threshold

Each dimension is scored from 0 to 4: 4 means consistently thoughtful and natural; 3 means good with a small isolated awkwardness; 2 means functional but conspicuously form-like or generic; 1 means a substantial failure; 0 means direct contradiction, serious misjudgement or consequentially false behaviour. Accurate extraction does not earn social-intelligence points.

| Dimension | Weight |
|---|---:|
| Listening | 12 |
| Acknowledgement | 12 |
| Naturalness | 10 |
| Transitions | 8 |
| Social judgement | 14 |
| Curiosity | 8 |
| Memory | 12 |
| Objectives | 10 |
| Efficiency | 8 |
| Ending | 6 |

Weighted score is the sum of `weight × rating / 4`.

Acceptance requires at least 20 complete live conversations, every journey scoring at least 80, a median of at least 85, and no hard-gate failures. Listening, acknowledgement, social judgement, memory and ending must each score at least 3. A competent extraction form should not receive a high conversational score merely for collecting the right fields.

Hard gates include cheerful approval after a serious concern; treating an apparent joke as a verified professional concern without contextual justification; ignoring a direct question; persisting after refusal or a stop request; claiming actions or verification that have not happened; losing an explicit correction; repeatedly requesting supplied information; and materially misleading completion or charity status.

A narrow clarification or an unanswered selection-confirmation request is not automatically a repeated-fact failure. Neither acknowledgement nor a follow-up is required after every answer. Respecting a user's wish to finish can warrant the highest curiosity and efficiency scores.

## Full 26-journey run: commit `1d78a92` — FAILED

Evidence: `docs/onboarding-social-second-full-run.json`, deployment `dpl_J3BwvsNLS5aE5PLkWSHWCy92n237`.

**8/26 journeys pass. Median: 76.25/100. Mean: 75.81/100.** All 26 reach a visible ending; completion is no longer the main problem. The reported technical result of 26/26 does not establish conversational acceptance.

No original hard-gate violation is conclusively established from the visible transcripts alone. C12 nevertheless contains a major memory/repair defect and requires correction.

| Journey | Score | Result | Decisive observation |
|---|---:|---|---|
| C01 | 66 | Fail | Overexplained transition; frog response centres the assistant's surprise. |
| C02 | 71 | Fail | Recognises money worries but moves immediately to account creation. |
| C03 | 71 | Fail | Audit concern receives a generic acknowledgement without useful exploration. |
| C04 | 83 | Pass | Uses rich opening information, avoids repetition and finishes efficiently. |
| C05 | 73 | Fail | Functional conversation; deadline response remains generic. |
| C06 | 71 | Fail | Specific evidence concern is restated rather than understood more deeply. |
| C07 | 73 | Fail | Personal answer receives reasonable lightness; surrounding dialogue is procedural. |
| C08 | 71 | Fail | Kind reassurance, but little engagement with the new trustee's uncertainty. |
| C09 | 81 | Pass | Acknowledges an early serious concern and avoids redundant collection. |
| C10 | 75 | Fail | Reliable impact data is labelled a challenge, then followed by a product handoff. |
| C11 | 76.5 | Fail | Accepts uncertainty and absence of worries; otherwise conspicuously scripted. |
| C12 | 47 | Fail | False apology about an already-acknowledged correction; unnecessary detours. |
| C13 | 67.5 | Fail | Preserves history but replaces productive impact curiosity with a general statement. |
| C14 | 76 | Fail | Handles multiple charities correctly; later concern receives routine treatment. |
| C15 | 78 | Fail | Appropriate humour at the ending; mechanical transition prevents a stronger score. |
| C16 | 85 | Pass | Accepts refusal immediately and ends respectfully. |
| C17 | 85 | Pass | Acknowledges the objection and releases the user from answering. |
| C18 | 79 | Fail | Respects "nothing"; repeated name use and stock acknowledgements feel automated. |
| C19 | 92.5 | Pass | Immediately honours urgency with a clear next action. |
| C20 | 92.5 | Pass | Stops optional questioning exactly when requested. |
| C21 | 82 | Pass | Answers the accountant question directly and sets an appropriate boundary. |
| C22 | 62 | Fail | Reminder repair does not explain why another confirmation is being requested. |
| C23 | 79.5 | Fail | Correctly switches charity; later interaction remains largely administrative. |
| C24 | 74 | Fail | Distinguishes literal frogs correctly, but the substantial disclosure changes little. |
| C25 | 81 | Pass | Useful follow-up establishes the actual funding gap; transitions remain awkward. |
| C26 | 78.5 | Fail | Answers the phone question and retains context; concern handling is still generic. |

These scores do not require every short answer to produce a follow-up. C19/C20 score highest precisely because further curiosity would be inappropriate.

### Blocking behavioural classes

- **Acknowledgement substitutes for understanding.** "A serious worry," "a real challenge," and similar phrases often precede an unchanged administrative next step. C03, C06, C10, C13 and C24 particularly expose this.
- **Useful curiosity is rarely exercised.** C25 provides the clear productive example: its follow-up reveals an ending grant without a replacement. C12 adds questions, but they do not produce comparable understanding.
- **Transitions narrate the interview.** "Before we wrap up, a slightly different question" repeatedly introduces the concern stage. Each instance sounds procedural; the issue is not merely repetition across separate users.
- **The broad question creates obligations the ending does not meet.** Inviting answers "in any direction," including outside work, then offering only a short reaction and checkout risks making the invitation feel insincere.
- **Repairs lack reliable conversational history.** C12 says "apologies for not acknowledging your correction to auditor" after explicitly acknowledging it earlier. C22 acknowledges the reminder but does not clarify the distinction between knowing a charity's name and confirming the next action.
- **Product relevance is sometimes used as filler.** Several replies infer that SORP guidance will be particularly relevant from a broad role description. These statements add little and can displace a more useful reaction.

C12 deserves a precise distinction: asking which audit activities the user personally handles could be a legitimate clarification after "Charity audits." Repeating the charity-choice question after a role correction can also be legitimate because the choice remained unanswered. The strongest demonstrated defects are the false recollection of its own acknowledgement, excessive detouring and poor response to the subsequent non-answer.

### Source findings, inspected after scores were locked

The inspected conditional `permittedMoves` design addressed the earlier competing main-task instructions. Three further limitations remained at inspection:

1. **Assistant replies followed by UI actions could disappear from history.** `advance` populated `dialogue.recent` when a subsequent typed answer arrived. `confirmCharity` replaced the current reply with its continuation. C12's correction acknowledgement could therefore be omitted when confirmation immediately followed it. The model could see the correction without seeing that it had acknowledged it.
2. **Rich early disclosures could lose their opportunity for exploration.** `canFollowUp` permitted follow-ups only after responsibilities, discovery or concerns. The speculative confirmation continuation had a fixed `afterConfirmationTask`, without an alternative move. An opening supplying everything could therefore lead directly from confirmation to completion, even when its concern warranted attention.
3. **Repair turns consumed follow-up eligibility differently from ordinary progression.** `canFollowUp` checked total turns against the optional cap; `nextObjective` subtracted repair turns when deciding ordinary completion. Corrections could remove opportunities for curiosity earlier than the information-turn allowance suggested.

These findings concern the inspected implementation, not proof that any later change resolves the observed behaviour. A fresh full run and independent transcript review are required.

## Earlier blind model comparison — FAILED acceptance

Evidence: `docs/onboarding-review-packet-r.json` and `docs/onboarding-review-packets-st.json`. Runtime model identities were deliberately omitted from the review packets. This section preserves the blind judgement; it does not assign identities retrospectively.

All packets used the same five personas and the same architecture, with alternative dialogue models. The conversations varied where an assistant chose a follow-up. Scores assess the supplied conversations rather than assuming identical wording or paths.

| Persona | R | S | T |
|---|---:|---:|---:|
| Sparse answers; "Frogs" | 75 — below target | 71 — below target | 63 — below target |
| CEO; grant uncertainty | 87.5 — pass | 88 — pass | 85 — pass |
| Adviser; "My children" | 70.5 — below target | 75 — below target | Incomplete |
| Former client; impact reporting | 83 — pass | 83 — pass | 59 — below target |
| Current/past work; literal frogs | 81 — pass | 81 — pass | 83 — pass |

S/T scores above are rounded, as in the original comparison. R and S each passed three of five journeys and had a median of 81. T passed two of its four complete journeys; T3 ended immediately after the charity-confirmation action and cannot count as complete. No packet met the per-journey and median requirements, and five personas were insufficient to meet the required corpus size. No clear hard-gate failure was observed in the completed transcripts.

### R: meaningful decision improvements, weaker sparse-answer handling

R2 explored the service/team answer with "Where would a bigger team make the most difference to the work you're doing?" The user supplied a funding constraint instead of directly answering. The assistant accepted that useful information and omitted a redundant concern question. Its ending did not claim the platform would solve grant uncertainty.

R4 asked about the gap between impact information boards receive and what they need for decisions. That elicited the useful distinction between activity counts and meaningful outcomes. Its closing observation responded to the distinction without promising a solution.

R5 explored present responsibilities while retaining the distinction between the current charity and historical work. It recognised the literal-frog concern seriously without a joke or invented interpretation.

R1 remained procedural: "Before we finish, one last optional question, turning to any concerns you might have." R3's "Fair enough" after "My children," immediately followed by account creation, felt dismissive. The remedy was better timing and proportionate recognition, not obligatory additional questioning.

### S: broadly comparable with R

S2 preserved the useful staffing/funding decisions. S4 asked an effective, relatively unassuming question: "Where do the boards you advise tend to get stuck when trying to understand their impact?" It obtained useful detail and reflected it without claiming to solve the problem.

S1 was weaker at the ending: "I wasn't expecting frogs. You can now create your account..." commented on the assistant's surprise and moved directly to administration.

S3 showed useful curiosity about advisory work, although the user supplied a general description rather than the requested strategic question. "Then I'll keep this brief" after "My children" was more responsive than R3's "Fair enough," but lightly assumed the user needed a quick exit.

S retained interview-style transitions such as "A broader question," "Turning to your work," and "One last, optional question." There was no reliable evidence that S was an overall upgrade from R.

### T: less consistent

T1's "Good to have a personal recommendation. Let's turn to something more personal" assumed that a pal's mention was a recommendation and unnecessarily framed onboarding as personal disclosure. Its frog response labelled the answer an "unexpected worry" and added a constructed pond joke.

T2 made useful staffing/funding decisions and passed. Its suggestion that SORP guidance might be useful while awaiting the grant decision was a weak connection; the straightforward handoff would have been stronger.

T4 replaced curiosity with praise: "That's a thoughtful challenge: helping boards make sense of impact is important work." It then promoted guidance and impact reporting. R4/S4 obtained useful information through a focused question; T4 settled for agreeable language.

T5 made a valuable different decision: it left the sufficient responsibilities answer alone and spent its follow-up on the literal-frog concern. "Do you have any sense yet of what's behind the outbreak?" elicited the need to understand the disease and communicate honestly with funders. The assistant then recognised that uncertainty accurately. This was the strongest handling of that case in the blind comparison, although the question initially explored the outbreak more than the user's professional need.

### Comparison implications

- Preserve useful follow-ups and the ability to omit questions whose purpose is already satisfied.
- Do not equate frequent acknowledgements with listening. T supplied more without consistently showing better understanding.
- Retain discretion over when to spend a follow-up. A concrete concern may be more useful to explore than an already-sufficient responsibilities answer.
- Improve sparse-answer handling through proportionate recognition, not repeated thanks, elaborate jokes or forced questions.
- Keep optionality clear without narrating an interview schedule.
- Prefer an accurate handoff over an improvised claim connecting every concern to product usefulness.

The small comparison did not reliably distinguish R from S. T's strong literal-frog case did not offset its weak sparse-answer and impact-reporting cases or its incomplete journey.
