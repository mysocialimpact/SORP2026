import { answers, assessmentProtocol, groups, reportingStrengthBands, sorpSource, tests, type Test } from "./sorp-methodology-v1";
export function SorpMethodologyGuide() {
  return <div className="scr-public-method-guide">
    <p className="scr-kicker">OUR METHODOLOGY</p>
    <h2>One source.<br />Clear distinctions.</h2>
    <div className="scr-public-method-guide-rule" aria-hidden="true" />
    <p>Module 1 tells us what to assess. MSI labels its own evidence judgements separately.</p>
  </div>;
}

function Question({ test }: { test: Test }) {
  return <article className="scr-public-method-v1-question" id={`method-${test.id.toLowerCase()}`}>
    <header><span>{test.id}</span><h4>{test.title}</h4></header>
    <p className="scr-public-method-v1-question-text">{test.question}</p>
    <p><strong>WHY ARE WE ASKING?</strong> {test.why}</p>
    <p><strong>SORP BASIS</strong> Paragraph {test.sorp}</p>
    <div className="scr-public-method-v1-tier-table" role="table" aria-label={`${test.id} tier status and Reporting Strength weight`}>
      {test.tiers.map((tier, index) => <div role="row" key={index}><strong role="cell">TIER {index + 1}</strong><span role="cell">{tier.status}</span><span role="cell">WEIGHT {tier.weight}</span></div>)}
    </div>
    {test.note && <p className="scr-public-method-v1-scope"><strong>SCOPE NOTE</strong> {test.note}</p>}
    {test.na && <p className="scr-public-method-v1-scope"><strong>NOT APPLICABLE</strong> {test.na}</p>}
    <details className="scr-public-method-v1-rubric"><summary>SEE THE FULL EVIDENCE RUBRIC <span aria-hidden="true">+</span></summary>
      <ol>{test.rubric.map((description, index) => <li key={index}><strong>{4 - index} — {answers[index]}</strong><span>{description}</span></li>)}</ol>
      <p><strong>{test.id === "S2" ? "NOT SURE — 0 FOR SCORING" : "NOT SURE"}</strong> {test.notSure}</p>
      {test.na && <p><strong>NOT APPLICABLE</strong> {test.na}</p>}
    </details>
  </article>;
}

export function SorpPublicMethodology({ expanded = false }: { expanded?: boolean } = {}) {
  return <div className="scr-public-method scr-public-method-v1">
    <header>
      <p className="scr-kicker">OUR METHODOLOGY · QUICK READ</p>
      <h1>SORP 2026 IS OUR SOURCE OF TRUTH.</h1>
      <p className="scr-public-method-lead">ARE YOU SORP READY? assesses Impact &amp; Sustainability Reporting Readiness for SORP 2026.</p>
      <p>This review is built directly from the impact and sustainability reporting requirements in <strong>Module 1 — Trustees’ Annual Report</strong> of Charities SORP 2026. We use SORP’s terminology, tiers and MUST / SHOULD / MAY distinctions wherever possible. MSI’s own evidence and quality judgements are labelled <strong>MSI methodology</strong>, not SORP requirements.</p>
    </header>

    <section className="scr-public-method-v1-definitions" aria-label="SORP 2026 definitions">
      <div className="scr-public-method-impact"><span>SORP 2026 DEFINITION</span><h2>WHAT DOES SORP MEAN BY IMPACT?</h2><blockquote>“Impact is the effect or influence that a charity has on its beneficiaries and wider society.”</blockquote><p>In plain English, impact reporting describes the difference the charity’s work has made to beneficiaries and, where practicable, wider society.</p></div>
      <div className="scr-public-method-impact"><span>SORP 2026 DEFINITION</span><h2>WHAT DOES SORP MEAN BY SUSTAINABILITY REPORTING?</h2><blockquote>“Sustainability Reporting is the practice of disclosing performance across environmental, social and governance areas, sometimes referred to as ESG.”</blockquote></div>
    </section>

    <section className="scr-public-method-focus" aria-labelledby="v1-focus"><h2 id="v1-focus">WHAT WE ASSESS</h2>
      <ol>{groups.map((group, index) => <li key={group.prefix}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{group.title}</h3><p>{group.subtitle}</p></div></li>)}</ol>
    </section>

    <section className="scr-public-method-crosscut" aria-labelledby="v1-crosscut"><h2 id="v1-crosscut">CROSS-CUTTING PRINCIPLES</h2><p>MSI applies four SORP-grounded principles across the substantive questions: fair and balanced reporting, outputs → outcomes → impact, learning and reflection, and coherence between the narrative and use of resources. They add no separate question, points or hidden penalties.</p></section>

    <section className="scr-public-method-framework" aria-labelledby="v1-framework"><h2 id="v1-framework">ONE FRAMEWORK. DIFFERENT REQUIREMENTS.</h2>
      <p>The canonical framework contains 19 atomic questions: 7 Objectives and activities, 7 Achievements and performance, 3 Learning and future direction, and 2 Sustainability.</p>
      <p>Every charity will ultimately see and answer all 19. A charity’s tier determines what SORP requires of it. It does <strong>not</strong> determine which questions are visible.</p>
      <p className="scr-public-method-framework-rule">YOUR TIER DETERMINES THE REQUIREMENT.<br />IT DOES NOT HIDE THE QUESTION.</p>
      <p>A Tier 1 charity can therefore see requirements that become mandatory or recommended at Tier 2 or Tier 3. This is deliberate. SORP encourages Tier 1 charities to include additional higher-tier information where trustees consider it particularly relevant.</p>
      <p>A charity must not be treated as failing a SORP requirement merely because it has not met a requirement that does not apply to its tier.</p>
    </section>

    <section className="scr-public-method-tiers" aria-labelledby="v1-tiers"><h2 id="v1-tiers">THREE REPORTING TIERS</h2>
      <div className="scr-public-method-tier-grid"><div><strong>TIER 1</strong><span>Gross income up to £500,000</span></div><div><strong>TIER 2</strong><span>Above £500,000 to £15 million</span></div><div><strong>TIER 3</strong><span>Above £15 million</span></div></div>
      <p>Higher tiers inherit lower-tier requirements.</p>
    </section>

    <section className="scr-public-method-language" aria-labelledby="v1-language"><h2 id="v1-language">THE LANGUAGE WE USE</h2><dl>
      <div><dt>MUST</dt><dd>Required for SORP compliance.</dd></div><div><dt>SHOULD</dt><dd>SORP good practice. Not following a SHOULD is not itself a departure from SORP.</dd></div><div><dt>MAY</dt><dd>Optional.</dd></div><div><dt>GUIDANCE</dt><dd>Explanation or illustration, not automatically a MUST / SHOULD / MAY requirement.</dd></div><div><dt>NOT SPECIFICALLY REQUIRED AT THIS TIER</dt><dd>Not a formal requirement at that tier; this is not the same as MAY. The charity may still choose stronger or higher-tier practice.</dd></div><div><dt>MSI METHODOLOGY</dt><dd>MSI’s separately labelled organisation, scoring, evidence and quality methodology.</dd></div>
    </dl></section>

    <details className="scr-public-method-detail" open={expanded}><summary><span><small>WANT TO SEE EXACTLY HOW THE REVIEW IS BUILT?</small><strong>READ THE DETAILED METHODOLOGY</strong></span><span className="scr-public-method-detail-mark" aria-hidden="true">+</span></summary>
      <div className="scr-public-method-detail-body"><p className="scr-kicker">THE DETAIL · CANONICAL MSI METHODOLOGY V1.0</p>
        <section className="scr-public-method-detail-group"><h2>A. SOURCE, SCOPE AND STRUCTURE</h2>
          <h3>WHY MODULE 1?</h3><p>Module 1 — Trustees’ Annual Report — contains the narrative requirements relevant to purposes, aims, activities, achievements, performance, impact, future plans and sustainability. Other SORP material is used only where needed to interpret Module 1, including tiering, MUST / SHOULD / MAY, glossary definitions and relevant terminology.</p>
          <h3>HOW THE 19-QUESTION FRAMEWORK WORKS</h3><p>The canonical MSI methodology contains 19 atomic questions: 7 Objectives and activities, 7 Achievements and performance, 3 Learning and future direction, and 2 Sustainability. The number 19 was not chosen as a target. It emerged from mapping the agreed in-scope provisions into distinct tests while avoiding duplication and double-counting.</p>
          <p>Every charity will ultimately answer all 19. Tiering changes <strong>requirement status</strong>, not visibility.</p>
          <h3>TWO DIFFERENT RESULTS</h3><p><strong>SORP REQUIREMENT STATUS</strong> asks whether applicable mandatory impact and sustainability reporting requirements are demonstrated. Applicable MUSTs drive this status. SHOULDs, MAYs and higher-tier practice cannot compensate for an unmet MUST.</p>
          <p><strong>IMPACT &amp; SUSTAINABILITY REPORTING STRENGTH</strong> asks how strong the charity is across the wider 19-question framework, including SHOULD, MAY and beyond-minimum practice. These results are related but are not the same thing.</p>
        </section>

        <section className="scr-public-method-detail-group"><h2>B. MSI CROSS-CUTTING PRINCIPLES</h2><p>“Cross-cutting principles” is MSI methodology terminology, not a formal SORP category. They influence how evidence across the 19 substantive questions is interpreted. They never create a twentieth question, extra points or hidden penalties.</p>
          <h3>FAIR, BALANCED AND UNDERSTANDABLE</h3><p>SORP 1.5, supported by 1.9, asks for a fair, balanced and understandable review. Credible reporting acknowledges material limitations, challenges and things that did not go as planned, rather than presenting only the best possible picture.</p>
          <h3>OUTPUTS → OUTCOMES → IMPACT</h3><p>SORP 1.8 distinguishes what the charity has done (outputs), what it has achieved (outcomes) and what difference it has made (impact). One does not automatically prove the next.</p>
          <h3>LEARNING AND REFLECTION</h3><p>SORP 1.9 describes an opportunity to reflect on successes, failures and learnings and to help users understand future plans. Reporting should show what the charity learns from experience, not only evidence of success.</p>
          <h3>NARRATIVE–RESOURCE COHERENCE</h3><p>SORP 1.8 and 1.22 connect activities and achievements with income and expenditure. The account of what the charity did and achieved should make sense alongside the resources used; this is not a financial-statement audit.</p>
        </section>

        <section className="scr-public-method-detail-group"><h2>C. THE 19 ASSESSMENT QUESTIONS</h2>
          {groups.map((group) => <div className="scr-public-method-v1-group" key={group.prefix}><h3>{group.title}</h3><p>{group.subtitle}</p>{tests.filter((test) => test.id.startsWith(group.prefix)).map((test) => <Question key={test.id} test={test} />)}</div>)}
        </section>

        <section className="scr-public-method-detail-group"><h2>D. ANSWERS, WEIGHTING AND RESULTS</h2>
          <h3>COMMON ANSWER SCALE</h3><div className="scr-public-method-v1-scale">{answers.map((answer, index) => <div key={answer}><strong>{4 - index}</strong><span>{answer}</span></div>)}</div>
          <p><strong>NOT YET</strong> means we have enough information to conclude that the requirement or practice is not currently demonstrated. <strong>NOT SURE</strong> means we do not yet have enough evidence or confirmation to conclude that it is demonstrated. Both contribute 0 points to Reporting Strength, but NOT YET means not demonstrated while NOT SURE means not confirmed and needs human confirmation. NOT SURE must never be described as failure or non-compliance.</p>
          <p><strong>NOT SURE = 0 FOR SCORING.</strong> Every non-N/A question remains in the denominator. Only genuine NOT APPLICABLE answers are excluded. A user cannot improve the percentage by answering NOT SURE: without confirmation, that question remains in the maximum available score and contributes zero until confirmed.</p>
          <h3>REPORTING STRENGTH WEIGHTING</h3><p>This is MSI methodology: MUST = 4; SHOULD = 2; MAY = 1; not specifically required / higher-tier practice = 1; genuine N/A = excluded.</p>
          <p><strong>Question points = answer score × question weight.</strong> Reporting Strength % = total weighted points earned ÷ total maximum weighted points available × 100.</p>
          <h3>EXACT WEIGHT MATRIX</h3><div className="scr-public-method-v1-matrix-wrap"><table className="scr-public-method-v1-matrix"><thead><tr><th>QUESTION</th><th>TIER 1</th><th>TIER 2</th><th>TIER 3</th></tr></thead><tbody>{tests.map((test) => <tr key={test.id}><th>{test.id}</th>{test.tiers.map((tier, index) => <td key={index}>{tier.weight}</td>)}</tr>)}</tbody></table></div>
          <p>OA2 uses weight 4 only where its jurisdictional MUST applies; otherwise weight 1. S2 is N/A and excluded where there is no separate sustainability reporting to signpost to.</p>
          <h3>MANDATORY SORP STATUS IS NOT THE SAME AS THE PERCENTAGE</h3><p>The weighted Reporting Strength percentage never determines whether a mandatory requirement is demonstrated. For an applicable MUST:</p>
          <dl className="scr-public-method-v1-status"><div><dt>YES, CLEARLY</dt><dd>Mandatory requirement demonstrated.</dd></div><div><dt>MOSTLY</dt><dd>Not demonstrated as fully met; gap remains.</dd></div><div><dt>PARTLY</dt><dd>Mandatory gap.</dd></div><div><dt>LIMITED</dt><dd>Significant mandatory gap.</dd></div><div><dt>NOT YET</dt><dd>Mandatory requirement not demonstrated.</dd></div><div><dt>NOT SURE</dt><dd>Unable to conclude; confirmation required.</dd></div></dl>
          <p>A charity cannot offset an unmet MUST by performing strongly on SHOULDs, MAYs or higher-tier questions.</p>
          <h3>MSI REPORTING STRENGTH BANDS</h3><p>These labels are MSI methodology, not SORP definitions or compliance categories.</p>
          <dl className="scr-public-method-v1-status">{reportingStrengthBands.map(item => <div key={item.min}><dt>{item.min}–{item.max}%</dt><dd>{item.label}</dd></div>)}</dl>
          <p>A charity may have a strong or very strong Reporting Strength score while still having one or more mandatory SORP requirements needing attention. The percentage never overrides mandatory requirement status.</p>
          <p>This is an automated readiness assessment based on MSI’s published methodology. It is not an audit or professional assurance opinion. A human should review the underlying evidence and conclusions before relying on them.</p>
          <h3>METHODOLOGY LINK</h3><p>Wherever a headline Reporting Strength score is ultimately displayed in the product, users should have an obvious link such as “SEE HOW THIS SCORE WAS CALCULATED” that returns to this public methodology page.</p>
        </section>

        <section className="scr-public-method-detail-group"><h2>E. HISTORICAL EVIDENCE AND CURRENT POSITION</h2>
          <h3>{assessmentProtocol.title}</h3>
          <p>{assessmentProtocol.historicalAssessment.pipeline.join(" → ")}</p>
          <ol className="scr-public-method-v1-rules">{assessmentProtocol.historicalAssessment.steps.map(step => <li key={step.title}><strong>{step.title}</strong> — {step.rule}</li>)}</ol>
          <h3>APPLICABILITY BEFORE SCORING</h3><p>{assessmentProtocol.applicability.requiredFacts.join(", ")}. {assessmentProtocol.applicability.unknownFact} {assessmentProtocol.applicability.oa2} {assessmentProtocol.applicability.s2}</p>
          <h3>LAYER 1 — HISTORICAL TAR</h3><p>This assesses what the latest validated published Trustees’ Annual Report actually demonstrates: <strong>HISTORICAL TAR REPORTING STRENGTH %</strong> and <strong>HISTORICAL MANDATORY SORP STATUS</strong>. Each historical finding should retain the question ID, answer, exact source excerpt, page or section, SORP paragraph, reasoning and confidence. Later user input must not rewrite this historical result.</p>
          <p>If a complete readable TAR has been properly assessed and relevant reporting is materially absent, NOT YET can be appropriate. If the document cannot reliably be assessed, use NOT SURE / NOT ASSESSABLE rather than inventing failure. A website or separate Impact Report cannot retrospectively make the historic TAR compliant.</p>
          <h3>CORRECTING A HISTORICAL FINDING</h3><p>{assessmentProtocol.historicalCorrection.distinction} {assessmentProtocol.historicalCorrection.rule}</p>
          <h3>LAYER 2 — CURRENT POSITION</h3><p>This combines the historical assessment with explicit current information supplied or confirmed by the charity. Every one of the 19 questions must be explicitly reviewed or updated by the user. It can explain what has changed since the TAR, evidence now collected, new measures, new systems and improvements in progress. The results are <strong>CURRENT REPORTING STRENGTH %</strong> and <strong>CURRENT SORP READINESS STATUS</strong>.</p>
          <p>The current position may include information supplied by the charity that MSI has not independently verified. It is therefore a readiness assessment, not an audit or assurance opinion.</p>
          <p>An old historical answer must not silently become the current answer because the user clicked through. The user should explicitly confirm or update the current position. Comments form part of the current evidence trail.</p>
          <h3>LAYER 3 — WIDER EVIDENCE POSITION</h3><p>This is not a third percentage. It records where relevant evidence already exists outside the historical TAR: an Impact Report, website, another published report, internal measurement or evidence, or other relevant current material.</p>
          <p>Wider evidence may help establish current readiness and identify material that should inform the next TAR. It does not retrospectively change the historical TAR. It does not automatically satisfy a SORP requirement simply because the material exists elsewhere.</p>
          <h3>THE FOUR-STAGE EVIDENCE JOURNEY</h3><p><strong>YOUR LAST TAR</strong> — What did the published report demonstrate? → <strong>YOUR POSITION NOW</strong> — What is true today? → <strong>EVIDENCE ELSEWHERE</strong> — Do you already evidence this in an Impact Report, website, another report or internally? → <strong>FOR YOUR NEXT TAR</strong> — What should be brought through, strengthened or appropriately referenced?</p>
          <p>A charity may already be doing strong impact work that was not adequately reflected in its last TAR. Asking about wider evidence identifies what already exists and what may need to be incorporated, strengthened or appropriately referenced in the next reporting cycle. Having an Impact Report or website does not automatically satisfy SORP.</p>
        </section>

        <section className="scr-public-method-detail-group"><h2>F. CONFIDENCE AND MSI JUDGEMENT</h2>
          <h3>CONFIDENCE</h3><p>Confidence does not change numeric points. It answers: how confident are we in this finding? Keep answer and confidence separate.</p>
          <p>{assessmentProtocol.confidenceEscalation.mustRule} {assessmentProtocol.confidenceEscalation.presentation}</p>
          <dl className="scr-public-method-v1-status"><div><dt>HIGH</dt><dd>Clear, directly relevant evidence in a fully validated source.</dd></div><div><dt>MEDIUM</dt><dd>Relevant evidence exists but interpretation or completeness is less certain.</dd></div><div><dt>LOW</dt><dd>Evidence is ambiguous, incomplete or weak.</dd></div><div><dt>NOT ASSESSABLE</dt><dd>The source itself does not permit a reliable judgement.</dd></div></dl>
          <h3>CONFLICTING EVIDENCE</h3><p>{assessmentProtocol.evidenceConflict}</p>
          <h3>CALCULATION AND REPRODUCIBILITY</h3><p>{assessmentProtocol.calculation.formula} {assessmentProtocol.calculation.precision}</p><p>{assessmentProtocol.reproducibility}</p>
          <h3>MSI JUDGEMENT</h3><p>MSI may provide insight around evidence strength, attribution versus contribution, proportionality of claims, limitations, overclaiming and confidence. These are not secret extra SORP requirements.</p>
          <p><strong>SORP determines WHAT is required. MSI helps judge and explain HOW convincingly the available information demonstrates it.</strong> Where MSI goes beyond the literal SORP test, label it MSI INSIGHT / IMPROVEMENT OPPORTUNITY. Do not change a formal SORP result because of an unrelated MSI preference.</p>
        </section>

        <section className="scr-public-method-detail-group"><h2>G. ANTI-DOUBLE-COUNTING RULES</h2><ol className="scr-public-method-v1-rules">
          <li>The performance-against-aims element in 1.24 is assessed under AP3 / 1.28, not again under OA3.</li><li>Measures and indicators in 1.31 support OA7 rather than generating another question.</li><li>Activities → outputs → outcomes → impact in 1.31 reinforces the cross-cutting principle rather than creating a duplicate question.</li><li>Paragraph 1.9 supports Learning and reflection but creates no scored question.</li><li>The future-planning element of 1.32 is captured through AP7 and is not scored again under LF3.</li><li>Paragraph 1.22 supports Narrative–resource coherence and does not create a twentieth question.</li>
        </ol></section>

        <section className="scr-public-method-detail-group"><h2>H. WHAT IS OUTSIDE THIS REVIEW</h2><p>This is not a full SORP 2026 compliance review. It does not separately score volunteer reporting, grant-making disclosures, social-investment disclosures, investment performance, fundraising performance, reserves, general financial review, general governance disclosures, trustee/reference information, accounting treatments, financial-statement requirements, specialist transactions, other SORP modules or wider narrative requirements outside this agreed scope.</p><p>These may be important SORP requirements. They are outside this Impact &amp; Sustainability Reporting review.</p></section>
        <p className="scr-public-method-source"><a href={sorpSource} target="_blank" rel="noreferrer">READ CHARITIES SORP 2026 ↗</a></p>
      </div>
    </details>
  </div>;
}
