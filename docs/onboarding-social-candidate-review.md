# Independent review of candidate `dfc4014`

**Acceptance verdict: FAILED. Do not treat this candidate as conversationally approved.**

Reviewed on 16 October 2026 by the independent review agent. Evidence: `docs/onboarding-social-acceptance-run.json`, deployment `dpl_S8cG84Ddy4beFCYCPg5vbDgYopSQ`. The packet reports 26 complete journeys, 116 real model-processed user turns and 232 API calls. The conversations use synthetic personas and explicitly labelled official-record fixtures; this review does not certify real registry or account-provider operation.

All 26 visible conversations were read and scored before final-state inspection. Successful field assertions, reported source repairs and pending browser checks earned no conversational-quality credit. The scores below are locked to `dfc4014`; later changes do not alter this verdict.

## Result against the unchanged rubric

**23/26 journeys pass. Median: 84.25/100. Mean: 83.21/100.**

Acceptance requires every journey to score at least 80, a median of at least 85, at least 20 complete journeys, no hard-gate failures, and scores of at least 3/4 for listening, acknowledgement, social judgement, memory and ending. This candidate fails the per-journey requirement in C11, C14 and C22 and misses the median requirement. C14 and C22 also fail required individual dimensions.

The unchanged rubric and historical reviews are in [onboarding-independent-review.md](onboarding-independent-review.md). Its weights are listening 12, acknowledgement 12, naturalness 10, transitions 8, social judgement 14, curiosity 8, memory 12, objectives 10, efficiency 8 and ending 6. Ratings are 0–4; the weighted total is `sum(weight × rating / 4)`.

No conclusive original hard-gate violation was established from the visible transcripts and inspected final states. That does not override the failed acceptance criteria or make the three failing journeys acceptable.

| Journey | Score | Result | Main evidence |
|---|---:|---|---|
| C01 | 83 | Pass | Clarifies frogs without assuming a joke or professional concern; closes on the actual pond explanation. |
| C02 | 87.5 | Pass | Useful staffing follow-up reveals grant uncertainty; omits a redundant concern question. |
| C03 | 81 | Pass | Narrows audit anxiety to earlier preparation of disclosure evidence. Some unnecessary role-based commentary remains. |
| C04 | 87.5 | Pass | Explores an early concern after confirmation and identifies the information-gathering problem across clients. |
| C05 | 81 | Pass | Develops a terse deadline answer into a specific year-end and lone-preparer pressure. |
| C06 | 83.5 | Pass | Follows the disclosure concern to the evidential link behind reported outcomes; useful final recognition. |
| C07 | 82.5 | Pass | Gently clarifies the children answer and meets the toddler explanation with proportionate humour. |
| C08 | 88 | Pass | Explores the new trustee's uncertainty and answers the resulting practical question helpfully. |
| C09 | 87.5 | Pass | Follows the volunteered reserves concern after confirmation without re-asking supplied information. |
| C10 | 87.5 | Pass | Identifies inconsistent outcome measures behind unreliable impact data and reflects that distinction. |
| C11 | 74 | Fail | Repeated personal address, processing acknowledgements and intrusive framing undermine sparse-answer handling. |
| C12 | 83.5 | Pass | Accepts and retains the auditor correction; no false apology or repeated-answer drift; useful deadline follow-up. |
| C13 | 85 | Pass | Keeps historical work distinct, develops the impact concern and closes on meaningful outcomes. |
| C14 | 66 | Fail | Arbitrarily offers Blue Cross despite three equally presented clients; the fixture later selects Brainstrust. |
| C15 | 85.5 | Pass | Meets the spreadsheet humour and uncovers the real reconciliation difficulty without losing the tone. |
| C16 | 85 | Pass | Immediately accepts the refusal and ends without pressure. |
| C17 | 81.5 | Pass | Repairs the objection respectfully, although its earlier personal framing helped create the awkwardness. |
| C18 | 80.5 | Pass, narrow | Accepts no concern and ends naturally; repeated name use and stock framing remain weak. |
| C19 | 92.5 | Pass | Honours urgency immediately with a clear next action. |
| C20 | 92.5 | Pass | Retains the supplied responsibility and stops optional questioning on request. |
| C21 | 88.5 | Pass | Answers the accountant question directly, then understands the desired balance between insight and administration. |
| C22 | 64 | Fail | Apologises for asking again, then asks substantially the same permission question without explaining the distinction. |
| C23 | 85 | Pass | Switches the selected charity while preserving the user's original trusteeship; develops the accuracy concern. |
| C24 | 86 | Pass | Handles literal frogs seriously, explores available help and recognises uncertainty in funder communication. |
| C25 | 83 | Pass | Prioritises the early closure concern after confirmation; later registration-style transitions remain somewhat stiff. |
| C26 | 82 | Pass | Answers mobile access directly and develops the collection problem into inconsistent formats and late figures. |

## Blocking cases

### C11: sparse answers still receive a scripted social wrapper

The assistant repeatedly addresses David by name and tells him it can keep his finance responsibilities in mind. After "Dunno," it says:

> "No worries. Before we wrap up, I'd like to get a sense of what matters to you personally."

This shifts a brief professional introduction towards personal disclosure without a clear reason. The assistant correctly accepts "Nothing, actually," but that does not make the preceding conversation natural. The needed improvement is economical, proportionate handling of short answers, not an additional question or more elaborate warmth.

### C14: ungrounded narrowing of the user's choice

The user names Interim Spaces, Brainstrust and Blue Cross together. The assistant responds:

> "Would you like to start with Blue Cross?"

Nothing in the user's answer privileges Blue Cross. The next fixture action explicitly selects Brainstrust, and subsequent dialogue respects that choice. Consequently this is not premature confirmation or a falsely completed action. It is nevertheless a substantial agency, memory and objective failure: the assistant presents one candidate as the natural starting point without a grounded reason.

Final-state inspection retained all three client relationships but classified Interim Spaces and Brainstrust as `organisation`, and Blue Cross as `charity`. That is consistent with candidate construction narrowing the visible choice. The later fixture selection must not conceal the initial behavioural defect.

### C22: acknowledgement does not complete the repair

After "I already told you Interim Spaces," the response is:

> "You did — sorry for asking again. Shall I look up Interim Spaces?"

Knowing a charity's name and obtaining confirmation of the next action are different. The assistant does not explain that distinction; it accepts the premise that it repeated itself, then asks another similar question. A user who already feels unheard may reasonably experience another loop.

The later deadline follow-up is useful, but it does not erase this repair failure. This was not classified as a strict repeated-fact hard gate because the earlier selection question had not received an unambiguous answer.

## Meaningful improvements demonstrated by this candidate

- **Curiosity now changes the conversation.** Audit evidence, outcome measures, reconciliation, timing and staffing concerns receive useful questions that reveal new information.
- **Personal and surprising answers are interpreted in context.** C01 and C07 clarify frogs and children, rather than immediately dismissing them or inventing professional concerns.
- **Early concerns remain available after confirmation.** C04, C09, C10 and C25 demonstrate this in visible dialogue.
- **The tested role correction no longer causes drift.** C12 acknowledges the correction once, uses the auditor role and continues coherently.
- **Boundaries and requests to stop remain strong.** C16–C20 and C21 show refusal handling, appropriate endings and a direct answer about the accountant boundary.
- **Endings more often reflect what was actually learned.** They generally avoid pretending that registration or exploration will solve the concern.

These observations are direct transcript evidence, not credit for implementation changes.

## Remaining weaknesses across passing journeys

1. **The final-question framing unnecessarily excludes work or pushes personal disclosure.** Variants of "beyond your role," "beyond your work" and "personally" recur even when the natural topic is a professional concern. The broad question can permit a personal answer without requesting one.
2. **Short acknowledgements still often describe processing rather than meaning.** "That helps me understand your focus" and similar phrases are software narration. Some simple answers need only a brief reception and a clean transition.
3. **Names and generic thanks are used too frequently in some journeys.** C11 is the clearest failure; C18 passes narrowly despite the same tendency.
4. **Transitions remain the weakest dimension.** The mean transition rating is 2.31/4. Useful curiosity has improved more than the way topics are introduced.
5. **A productive follow-up must remain optional.** The strong C19/C20 scores reflect restraint, not the number of questions asked. Future changes should not turn the current improvement into obligatory probing.

## Hard-gate and final-state checks

Final-state inspection followed the locked transcript scoring and did not increase any scores.

- C01's personal frog answer and C07's toddler answer are not stored as professional concerns.
- Refusals and no-concern answers in C11 and C16–C18 do not become professional concerns.
- C12 retains `auditor`; C13 retains the corrected `Marcus Warry`; C26 retains the corrected email. The surname/email persistence cannot be established from later spoken text alone, but is present in the supplied final states.
- C23 retains the user's organisation as Interim Spaces while the explicitly selected charity is Brainstrust.
- C14 ends with Brainstrust after an explicit fixture confirmation. The failure is its unsupported earlier narrowing, not an unconfirmed final selection.
- C15 retains the figurative spreadsheet wording alongside the clarified reconciliation problem. The later user answer establishes a real professional difficulty; this is not evidence that the system verified a literal personality in a spreadsheet.

An additional memory-quality issue appears in the supplied states: C25 records the generic referral description `finance adviser` as an adviser entity, and C07 records `conference` as a mentioned organisation. These are not proper organisation names. They did not produce a visible false selection in this run, so they do not retrospectively change the locked language scores. They matter when candidate construction is broadened: generic referral descriptions must not become candidate charities or organisations.

## Full dimension ratings

Columns: L = listening, A = acknowledgement, N = naturalness, T = transitions, J = social judgement, C = curiosity, M = memory, O = objectives, E = efficiency, Z = ending. Ratings are recorded to make the locked totals reproducible.

| Journey | L | A | N | T | J | C | M | O | E | Z |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C01 | 4 | 3 | 3 | 2 | 4 | 4 | 3 | 3 | 3 | 4 |
| C02 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 4 | 4 | 3 |
| C03 | 4 | 3 | 3 | 2 | 3 | 4 | 4 | 3 | 3 | 3 |
| C04 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 4 | 4 | 3 |
| C05 | 4 | 3 | 3 | 2 | 3 | 4 | 4 | 3 | 3 | 3 |
| C06 | 4 | 3 | 3 | 2 | 3 | 4 | 4 | 4 | 3 | 3 |
| C07 | 4 | 3 | 3 | 2 | 3 | 4 | 4 | 3 | 3 | 4 |
| C08 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | 4 | 4 | 3 |
| C09 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 4 | 4 | 3 |
| C10 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 4 | 4 | 3 |
| C11 | 3 | 3 | 2 | 2 | 4 | 3 | 3 | 3 | 3 | 3 |
| C12 | 4 | 3 | 3 | 2 | 3 | 4 | 4 | 4 | 3 | 3 |
| C13 | 4 | 3 | 3 | 2 | 3 | 4 | 4 | 4 | 3 | 4 |
| C14 | 3 | 3 | 3 | 2 | 2 | 4 | 2 | 2 | 3 | 3 |
| C15 | 4 | 3 | 4 | 2 | 4 | 4 | 3 | 3 | 3 | 4 |
| C16 | 4 | 3 | 3 | 2 | 4 | 4 | 3 | 3 | 4 | 4 |
| C17 | 4 | 3 | 3 | 2 | 3 | 4 | 3 | 3 | 4 | 4 |
| C18 | 4 | 3 | 2 | 2 | 4 | 4 | 3 | 3 | 3 | 4 |
| C19 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 4 | 4 | 4 |
| C20 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 4 | 4 | 4 |
| C21 | 4 | 3 | 3 | 2 | 4 | 4 | 4 | 4 | 3 | 4 |
| C22 | 2 | 2 | 3 | 2 | 3 | 4 | 2 | 3 | 2 | 3 |
| C23 | 4 | 3 | 3 | 2 | 3 | 4 | 4 | 4 | 3 | 4 |
| C24 | 4 | 3 | 3 | 2 | 4 | 4 | 4 | 3 | 3 | 4 |
| C25 | 4 | 3 | 3 | 3 | 3 | 4 | 4 | 3 | 3 | 3 |
| C26 | 4 | 3 | 3 | 2 | 3 | 4 | 3 | 4 | 3 | 4 |

## Required acceptance evidence after repairs

Re-run the affected behavioural classes with fresh wording: sparse/minimal participation, reminder repair, and multiple equally plausible unverified organisations. Preserve pre-selection responses so an explicit fixture choice cannot hide arbitrary narrowing. A new full corpus must independently meet the same per-journey and median thresholds. Successful source edits, state assertions or browser checks cannot substitute for that review.
