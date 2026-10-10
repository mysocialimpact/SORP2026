"use client";
/* The assessment restore effect intentionally runs only when its route view changes. */
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SorpReadinessConversation, type ReadinessState } from "./sorp-readiness-conversation";
import { SorpJourneyProgress, SorpBasisDrawer, SorpKnownContext, type ReadinessWorkflow } from "./sorp-journey";
import sourceParagraphs from "./sorp-basis.json";
import {
  answerOptions,
  classificationFor,
  coreQuestions,
  eligibilityFor,
  relevantAdditionalChecks,
  readinessStages,
  scoreForAnswer,
  sectionLabels,
  stageForQuestion,
  tierFromSetup,
  tierLabel,
  type AdditionalAnswerValue,
  type AdditionalCheck,
  type AnswerValue,
  type AssessmentSetup,
  type Classification,
  type CoreQuestion,
} from "./sorp-questionnaire";

const STORAGE_KEY = "msi-sorp-readiness-v2";
const RESULT_KEY = "msi-sorp-readiness-result-v2";

type Mode = "loading" | "missing_result" | "welcome" | "role" | "location" | "period" | "accounts" | "eligibility" | "income" | "activities" | "context" | "core" | "extras_intro" | "extra" | "result";

type Setup = AssessmentSetup;

type SavedAssessment = {
  mode: Mode;
  setupWorkflow?: ReadinessWorkflow;
  setupState?: ReadinessState;
  coreIndex: number;
  extraIndex: number;
  setup: Setup;
  coreAnswers: Record<number, AnswerValue>;
  coreContext: Record<number, string>;
  extraAnswers: Record<string, AdditionalAnswerValue>;
};

const emptySetup: Setup = {
  role: "",
  jurisdiction: "",
  startDate: "",
  endDate: "",
  accounts: "",
  income: "",
  nearBoundary: false,
  activities: [],
};

function stageFor(mode: Mode, coreIndex: number) {
  if (["welcome", "role", "location", "period", "accounts", "eligibility"].includes(mode)) return 1;
  if (["income", "activities", "context"].includes(mode)) return 2;
  if (mode === "core") return stageForQuestion(coreQuestions[coreIndex] ?? coreQuestions[0]);
  if (["extras_intro", "extra"].includes(mode)) return 7;
  return mode === "result" ? 8 : 1;
}

function classLabel(classification: Classification) {
  return classification === "MSI_READINESS" || classification === "JUDGEMENT" ? "MSI JUDGEMENT" : classification;
}

function formatDate(value: string) {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function reviewPrice(setup: Setup) {
  if (setup.income === "tier2") return "Tier 2 · £100";
  if (setup.income === "tier3") return "Tier 3 · £200";
  if (setup.income === "tier1_low" || setup.income === "tier1_high") return "Tier 1 · £50";
  return "Tiered review pricing";
}

function SnapshotBasis({ references, explanation, classification = "MSI JUDGEMENT" }: { references: string[]; explanation: string; classification?: string }) {
  return <SorpBasisDrawer basis={{ classification, explanation, interpretation: classification === "MSI_READINESS" || classification === "JUDGEMENT" ? "MSI judgement interprets the relevant guidance. It is not an official fourth SORP category." : undefined, citations: sourceParagraphs.filter(p => references.includes(p.reference)).map(p => ({...p, extract: p.text.length > 420 ? `${p.text.slice(0,420)}…` : p.text})) }} />;
}

function AnswerButtons({ value, onChange, additional = false }: { value?: AdditionalAnswerValue; onChange: (value: AdditionalAnswerValue) => void; additional?: boolean }) {
  const options: { value: AdditionalAnswerValue; label: string }[] = [...answerOptions.map(({ value: optionValue, label }) => ({ value: optionValue, label }))];
  if (additional) options.push({ value: "not_applicable", label: "Not applicable" });
  return (
    <div className="sorp-answer-grid" role="group" aria-label="Choose your answer">
      {options.map((option) => <button type="button" key={option.value} className={value === option.value ? "is-selected" : ""} aria-pressed={value === option.value} onClick={() => onChange(option.value)}><span>{option.label}</span><b aria-hidden="true">{value === option.value ? "●" : "○"}</b></button>)}
    </div>
  );
}

function Controls({ onBack, onExit, onNext, nextDisabled = false, nextLabel = "Next question" }: { onBack: () => void; onExit: () => void; onNext: () => void; nextDisabled?: boolean; nextLabel?: string }) {
  return <div className="sorp-tool-controls" aria-label="Assessment actions"><button type="button" className="is-back" onClick={onBack}>← Back</button><button type="button" className="is-exit" onClick={onExit}>Save &amp; exit</button><button type="button" className="is-next" onClick={onNext} disabled={nextDisabled}>{nextLabel} <span>→</span></button></div>;
}

export function SorpAssessment({ view = "snapshot" }: { view?: "snapshot" | "results" }) {
  const router = useRouter();
  const [setupWorkflow, setSetupWorkflow] = useState<ReadinessWorkflow>();
  const [setupState, setSetupState] = useState<ReadinessState>();
  const [mode, setMode] = useState<Mode>(view === "results" ? "loading" : "welcome");
  const [coreIndex, setCoreIndex] = useState(0);
  const [extraIndex, setExtraIndex] = useState(0);
  const [setup, setSetup] = useState<Setup>(emptySetup);
  const [coreAnswers, setCoreAnswers] = useState<Record<number, AnswerValue>>({});
  const [coreContext, setCoreContext] = useState<Record<number, string>>({});
  const [extraAnswers, setExtraAnswers] = useState<Record<string, AdditionalAnswerValue>>({});
  const [hydrated, setHydrated] = useState(false);
  const [saveNote, setSaveNote] = useState("");

  const extras = useMemo(() => relevantAdditionalChecks(setup), [setup]);
  const stage = stageFor(mode, coreIndex);
  const tier = tierFromSetup(setup);
  const eligibility = eligibilityFor(setup);
  const contextComplete = Boolean(setupWorkflow?.completedStages.includes(2) || view === "results" && mode === "result");
  const completionConditions = [contextComplete, contextComplete, ...[3, 4, 5, 6].map(number => coreQuestions.filter(question => stageForQuestion(question) === number).every(question => Boolean(coreAnswers[question.id]))), extras.every(check => Boolean(extraAnswers[check.id]))];
  const firstIncomplete = completionConditions.findIndex(complete => !complete);
  const completedStages = Array.from({ length: firstIncomplete < 0 ? 7 : firstIncomplete }, (_, index) => index + 1);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as SavedAssessment;
          if (view === "results") setMode(saved.mode === "result" ? "result" : "missing_result");
          else setMode(!saved.setupWorkflow ? "welcome" : saved.mode === "result" ? "extras_intro" : (saved.mode ?? "welcome"));
          setSetupWorkflow(saved.setupWorkflow);
          setSetupState(saved.setupState);
          setCoreIndex(Math.min(saved.coreIndex ?? 0, coreQuestions.length - 1));
          setExtraIndex(Math.max(saved.extraIndex ?? 0, 0));
          setSetup({ ...emptySetup, ...saved.setup });
          setCoreAnswers(saved.coreAnswers ?? {});
          setCoreContext(saved.coreContext ?? {});
          setExtraAnswers(saved.extraAnswers ?? {});
        } else if (view === "results") setMode("missing_result");
      } catch {
        setSaveNote("We could not restore the previous local copy, so this assessment has started cleanly.");
        if (view === "results") setMode("missing_result");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, [view]);

  useEffect(() => {
    if (!hydrated) return;
    if (mode === "loading" || mode === "missing_result") return;
    const saved: SavedAssessment = { setupWorkflow, setupState, mode, coreIndex, extraIndex, setup, coreAnswers, coreContext, extraAnswers };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [mode, coreIndex, extraIndex, setup, coreAnswers, coreContext, extraAnswers, hydrated, setupWorkflow, setupState]);

  const go = (nextMode: Mode) => { setSaveNote(""); setMode(nextMode); };
  const saveAssessment = (savedMode: Mode = mode, savedExtraIndex = extraIndex) => {
    if (savedMode === "loading" || savedMode === "missing_result") return;
    const saved: SavedAssessment = { setupWorkflow, setupState, mode: savedMode, coreIndex, extraIndex: savedExtraIndex, setup, coreAnswers, coreContext, extraAnswers };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  };
  const saveAndExit = () => {
    saveAssessment();
    router.push("/are-you-sorp-ready");
  };
  const finishAssessment = () => {
    saveAssessment("result");
    setMode("result");
    router.push("/are-you-sorp-ready/results");
  };
  const returnToLastQuestion = () => {
    const returnMode: Mode = extras.length ? "extra" : "extras_intro";
    const returnExtraIndex = extras.length ? Math.max(extras.length - 1, 0) : 0;
    saveAssessment(returnMode, returnExtraIndex);
    router.push("/are-you-sorp-ready/snapshot");
  };
  const backFromCore = () => {
    if (coreIndex > 0) setCoreIndex((index) => index - 1);
    else go("context");
  };

  const nextFromCore = () => {
    if (!currentQuestion || !coreAnswers[currentQuestion.id]) return;
    if (coreIndex < coreQuestions.length - 1) setCoreIndex((index) => index + 1);
    else { setExtraIndex(0); go("extras_intro"); }
  };

  const backFromExtra = () => {
    if (extraIndex > 0) setExtraIndex((index) => index - 1);
    else go("extras_intro");
  };

  const nextFromExtra = () => {
    if (!currentExtra || !extraAnswers[currentExtra.id]) return;
    if (extraIndex < extras.length - 1) setExtraIndex((index) => index + 1);
    else finishAssessment();
  };

  const score = Math.round(coreQuestions.reduce((total, question) => total + scoreForAnswer(coreAnswers[question.id]), 0) / 60 * 100);
  const band = score < 40 ? "Not ready yet" : score < 60 ? "Important gaps" : score < 80 ? "Getting ready" : "Well prepared";

  const sectionScores = useMemo(() => Object.entries(sectionLabels).map(([section, label]) => {
    const questions = coreQuestions.filter((question) => question.section === section);
    const points = questions.reduce((total, question) => total + scoreForAnswer(coreAnswers[question.id]), 0);
    return { section, label, score: Math.round(points / (questions.length * 4) * 100) };
  }), [coreAnswers]);

  const weakQuestions = [...coreQuestions].sort((a, b) => scoreForAnswer(coreAnswers[a.id]) - scoreForAnswer(coreAnswers[b.id])).slice(0, 3);
  const strongSections = [...sectionScores].sort((a, b) => b.score - a.score).slice(0, 2);
  const { mustFlags, shouldFlags, mayFlags, judgementFlags } = useMemo(() => {
    const flaggedCore = coreQuestions.filter((question) => scoreForAnswer(coreAnswers[question.id]) <= 2);
    const flaggedExtras = extras.filter((check) => {
      const answer = extraAnswers[check.id];
      return answer && ["partly", "not_yet", "not_sure", "not_applicable"].includes(answer);
    });
    const flagsFor = (classification: Classification) => [
      ...flaggedCore.filter((question) => classificationFor(question, setup) === classification).map((question) => question.question),
      ...flaggedExtras.filter((check) => classificationFor(check, setup) === classification).map((check) => check.question),
    ];
    return {
      mustFlags: flagsFor("MUST"),
      shouldFlags: flagsFor("SHOULD"),
      mayFlags: flagsFor("MAY"),
      judgementFlags: [
        ...coreQuestions.filter((question) => classificationFor(question, setup) === "JUDGEMENT").map((question) => question.question),
        ...extras.filter((check) => classificationFor(check, setup) === "JUDGEMENT").map((check) => check.question),
      ],
    };
  }, [coreAnswers, extraAnswers, extras, setup]);

  useEffect(() => {
    if (!hydrated || mode !== "result") return;
    window.localStorage.setItem(RESULT_KEY, JSON.stringify({
      version: 2,
      completedAt: new Date().toISOString(),
      scope: "SORP 2026 impact and narrative reporting readiness",
      setup,
      setupState,
      context: { tier: tierLabel(setup), eligibility: eligibility.status },
      coreQuestions: coreQuestions.map((question) => ({ id: question.id, answer: coreAnswers[question.id], context: coreContext[question.id] ?? "", sources: question.sources, classification: classificationFor(question, setup) })),
      additionalChecks: extras.map((check) => ({ id: check.id, answer: extraAnswers[check.id], sources: check.sources, classification: classificationFor(check, setup) })),
      result: { score, band, sectionScores, flags: { must: mustFlags, should: shouldFlags, may: mayFlags, judgement: judgementFlags } },
    }));
  }, [mode, hydrated, setup, coreAnswers, coreContext, extraAnswers, extras, score, band, sectionScores, mustFlags, shouldFlags, mayFlags, judgementFlags, eligibility.status]);

  const contextLine = (question: CoreQuestion | AdditionalCheck) => {
    if (setup.accounts === "not_sure") return "We have not yet confirmed whether the charity prepares accruals accounts, so your result remains provisional.";
    if (setup.jurisdiction === "roi") return "In the Republic of Ireland, SORP 2026 sets out recommended good practice rather than having exactly the same status as in the UK. We are still showing how this item is classified within the SORP framework.";
    if (setup.jurisdiction === "elsewhere") return "This assessment may not be the appropriate reporting framework for the charity’s jurisdiction, so treat this as information rather than a conclusion about what applies.";
    if (!tier) return "Your expected income may place you close to a SORP tier boundary, so we are showing you where the interpretation may change rather than pretending certainty.";
    const classification = classificationFor(question, setup);
    if (classification === "MUST") return `Because you appear to be ${tierLabel(setup)}, this is a MUST reporting area for your charity.`;
    if (tier === "tier1" && question.classification.tier2 === "MUST") return "This is not an additional Tier 2 MUST for you, but it remains useful for readiness and SORP encourages Tier 1 charities to include additional relevant information where helpful.";
    if (classification === "JUDGEMENT") return "This depends on evidence, materiality, proportionality or the charity’s circumstances. JUDGEMENT is an MSI explanatory category, not an official fourth SORP term.";
    if (classification === "MSI_READINESS") return "This is an MSI readiness question rather than a direct SORP disclosure requirement.";
    return `For your current context, this is best understood as ${classLabel(classification)}.`;
  };

  const currentQuestion = coreQuestions[coreIndex];
  const currentExtra = extras[Math.min(extraIndex, Math.max(extras.length - 1, 0))];
  const persistentStatus = mode === "core" && currentQuestion
    ? `${readinessStages[stage - 1]} · Question ${currentQuestion.id} of 15`
    : mode === "extra" && currentExtra
      ? `${readinessStages[6]} · Check ${extraIndex + 1} of ${extras.length}`
      : mode === "result" ? readinessStages[7] : mode === "welcome" ? "SORP readiness" : readinessStages[Math.min(stage, 8) - 1];

  const setupModes = ["welcome", "role", "location", "period", "accounts", "eligibility", "income", "activities", "context"];
  if (view !== "results" && setupModes.includes(mode)) return <div className="sorp-conversation-page sorp-snapshot-setup"><SorpReadinessConversation setupOnly onSetupComplete={(nextState, nextWorkflow) => { setSetup(nextState.setup); setSetupState(nextState); setSetupWorkflow(nextWorkflow); setCoreIndex(0); go("core"); }} /></div>;

  return (
    <div className="sorp-tool" id="snapshot-tool">
      <div className="sorp-tool-shell">
        <SorpJourneyProgress current={Math.min(stage,8)} completed={completedStages} result={mode === "result"} />
        {mode === "core" && <p className="sorp-snapshot-position">{persistentStatus}</p>}
        {saveNote && <p className="sorp-save-note" role="status">{saveNote}</p>}

        {mode === "loading" && <section className="sorp-tool-loading" aria-live="polite"><p className="sorp-tool-kicker">Your SORP 2026 snapshot</p><h3>Loading your result…</h3></section>}

        {mode === "missing_result" && <section className="sorp-tool-panel"><p className="sorp-tool-kicker">No completed snapshot found</p><h3>Complete the snapshot to see your result.</h3><p className="sorp-tool-help">Your answers are saved only in this browser. If you completed the snapshot on another device, it will not be available here.</p><Controls onBack={saveAndExit} onExit={saveAndExit} onNext={() => router.push("/are-you-sorp-ready/snapshot")} nextLabel="Go to snapshot" /></section>}

        {setupWorkflow && mode !== "result" && <div className="sorp-snapshot-known"><SorpKnownContext workflow={setupWorkflow} defaultOpen={false} /></div>}

        {mode === "core" && currentQuestion && <section className="sorp-question-panel">
          <header><div><span>{sectionLabels[currentQuestion.section]}</span><strong>Question {String(currentQuestion.id).padStart(2, "0")} of 15</strong></div><i aria-label={`${Math.round(currentQuestion.id / 15 * 100)}% through the core questions`}><b style={{ width: `${currentQuestion.id / 15 * 100}%` }} /></i></header>
          <div className="sorp-question-copy"><p className={`sorp-classification is-${classificationFor(currentQuestion, setup).toLowerCase()}`}>{classLabel(classificationFor(currentQuestion, setup))}</p><h3>{currentQuestion.question}</h3>{currentQuestion.helper && <p className="sorp-question-helper">{currentQuestion.helper}</p>}</div>
          <section className="sorp-question-purpose"><strong>Why we’re asking</strong><p>{currentQuestion.explanation}</p></section>
          <AnswerButtons value={coreAnswers[currentQuestion.id]} onChange={(answer) => setCoreAnswers((current) => ({ ...current, [currentQuestion.id]: answer as AnswerValue }))} />
          <SnapshotBasis references={currentQuestion.sources} classification={classificationFor(currentQuestion,setup)} explanation={contextLine(currentQuestion)} />
          <details className="sorp-question-context"><summary>+ Add some context <small>Optional</small></summary><label><span>Anything that would help explain your answer</span><textarea rows={4} value={coreContext[currentQuestion.id] ?? ""} onChange={(event) => setCoreContext((current) => ({ ...current, [currentQuestion.id]: event.target.value }))} /></label></details>
          <Controls onBack={backFromCore} onExit={saveAndExit} onNext={nextFromCore} nextDisabled={!coreAnswers[currentQuestion.id]} nextLabel={currentQuestion.id === 15 ? "Review extra checks" : "Next question"} />
        </section>}

        {mode === "extras_intro" && <section className="sorp-extras-intro">
          <p className="sorp-tool-kicker">A few additional checks</p>
          {extras.length ? <><h3>We found {extras.length} additional SORP {extras.length === 1 ? "area" : "areas"} that may be relevant.</h3><p>Based on what you told us about the charity, we’ll ask about {extras.map((check) => check.title).join(", ")}. We’ll explain why each one is being shown.</p></> : <><h3>No additional impact-reporting checks appear necessary.</h3><p>That is based on what you told us about the charity. Your result will still show relevant MAY opportunities and any areas where judgement is needed.</p></>}
          <p className="sorp-context-note">These checks create separate SORP flags. They do not change the main 0–100 score, which always comes from the same 15 core questions.</p>
          <Controls onBack={() => { setCoreIndex(14); go("core"); }} onExit={saveAndExit} onNext={() => extras.length ? go("extra") : finishAssessment()} nextLabel={extras.length ? "Start extra checks" : "See my result"} />
        </section>}

        {mode === "extra" && currentExtra && <section className="sorp-question-panel is-extra">
          <header><div><span>Additional SORP checks</span><strong>Check {String(extraIndex + 1).padStart(2, "0")} of {String(extras.length).padStart(2, "0")}</strong></div><i aria-label={`${Math.round((extraIndex + 1) / extras.length * 100)}% through additional checks`}><b style={{ width: `${(extraIndex + 1) / extras.length * 100}%` }} /></i></header>
          <div className="sorp-question-copy"><p className={`sorp-classification is-${classificationFor(currentExtra, setup).toLowerCase()}`}>{classLabel(classificationFor(currentExtra, setup))}</p><span className="sorp-extra-title">{currentExtra.title}</span><h3>{currentExtra.question}</h3></div>
          <section className="sorp-question-purpose"><strong>Why we’re asking</strong><p>{currentExtra.explanation}</p></section>
          <SnapshotBasis references={currentExtra.sources} classification={classificationFor(currentExtra,setup)} explanation={contextLine(currentExtra)} />
          <AnswerButtons additional value={extraAnswers[currentExtra.id]} onChange={(answer) => setExtraAnswers((current) => ({ ...current, [currentExtra.id]: answer }))} />
          <details className="sorp-question-why"><summary>Why am I seeing this?</summary><div><p>{currentExtra.explanation}</p><p><strong>Your context:</strong> {currentExtra.id === "sustainability" ? "You appear to be a Tier 3 charity, so this check is included automatically." : setup.activities.includes("not_sure") && ["volunteers", "grant_making", "social_investment"].includes(currentExtra.id) ? "You were not sure whether this activity is significant, so we included it rather than assuming it does not apply." : `You told us ${currentExtra.title.toLowerCase()} is significant or material to the charity.`}</p><p>{contextLine(currentExtra)}</p><span>Source: SORP 2026 · {currentExtra.sources.map((source) => `paragraph ${source}`).join(" · ")}</span></div></details>
          <Controls onBack={backFromExtra} onExit={saveAndExit} onNext={nextFromExtra} nextDisabled={!extraAnswers[currentExtra.id]} nextLabel={extraIndex === extras.length - 1 ? "See my result" : "Next check"} />
        </section>}

        {mode === "result" && <section className="sorp-live-result">
          <header className="sorp-live-result-hero"><div><p>Are You SORP Ready?</p><h3>Your SORP readiness result</h3><span>Based on what you’ve told us, this initial snapshot suggests:</span></div><div><strong>{score}</strong><span>/ 100</span><b>{band}</b></div></header>
          <p className="sorp-tool-disclaimer">This score assesses readiness for SORP 2026 narrative and impact reporting. It is not a declaration of full SORP compliance.</p>
          <div className="sorp-result-context"><h4>Your SORP context</h4><dl><div><dt>Likely tier</dt><dd>{tierLabel(setup)}</dd></div><div><dt>Registered</dt><dd>{{ ew: "England & Wales", scotland: "Scotland", ni: "Northern Ireland", roi: "Republic of Ireland", elsewhere: "Somewhere else", not_sure: "Not confirmed" }[setup.jurisdiction]}</dd></div><div><dt>Accounts</dt><dd>{{ accruals: "Accruals", receipts: "Receipts & payments", not_sure: "Not confirmed" }[setup.accounts]}</dd></div><div><dt>Period begins</dt><dd>{formatDate(setup.startDate)}</dd></div></dl><p>{eligibility.status}</p></div>
          <div className="sorp-live-section-scores">{sectionScores.map((section) => <div key={section.section}><span>{section.label}</span><i><b style={{ width: `${section.score}%` }} /></i><strong>{section.score}</strong></div>)}</div>
          <div className="sorp-result-insights"><article><span>What looks strong</span><h4>{strongSections.map((section) => section.label).join(" · ")}</h4><p>Your strongest section scores are {strongSections.map((section) => `${section.label} ${section.score}`).join(" and ")}.</p></article><article><span>What needs attention</span><h4>{weakQuestions.map((question) => `Question ${question.id}`).join(" · ")}</h4><ul>{weakQuestions.map((question) => <li key={question.id}>{question.question}</li>)}</ul></article></div>
          <div className="sorp-flag-summary"><article className="is-must"><strong>{mustFlags.length}</strong><span>MUST {mustFlags.length === 1 ? "area needs" : "areas need"} attention</span></article><article><strong>{shouldFlags.length}</strong><span>SHOULD opportunities</span></article><article><strong>{mayFlags.length + (tier !== "tier3" ? 1 : 0)}</strong><span>MAY options</span></article><article className="is-judgement"><strong>{judgementFlags.length}</strong><span>JUDGEMENT areas</span></article></div>
          <div className="sorp-result-detail">
            <article><h4>MUST areas</h4>{mustFlags.length ? <ul>{mustFlags.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No applicable MUST areas were flagged by your answers. This does not amount to a compliance conclusion.</p>}</article>
            <article><h4>SHOULD opportunities</h4>{shouldFlags.length ? <ul>{shouldFlags.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No weaker SHOULD areas were identified in this initial snapshot.</p>}</article>
            <article><h4>MAY options</h4><ul>{mayFlags.map((item) => <li key={item}>{item}</li>)}{tier !== "tier3" && <li>Trustees MAY choose to explain how the charity is responding to environmental, governance and social matters (paragraph 1.60).</li>}</ul></article>
            <article><h4>JUDGEMENT areas</h4>{judgementFlags.length ? <ul>{judgementFlags.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No specific judgement flags were generated. Materiality, proportionality and evidence quality may still require human judgement.</p>}</article>
            <article><h4>Additional checks</h4>{extras.length ? <ul>{extras.map((check) => <li key={check.id}><strong>{check.title}:</strong> {answerOptions.find((option) => option.value === extraAnswers[check.id])?.label ?? (extraAnswers[check.id] === "not_applicable" ? "Not applicable" : "Not answered")}</li>)}</ul> : <p>No additional checks were triggered by the setup answers.</p>}</article>
          </div>
          <div className="sorp-result-handoff"><div><span>Want to explore your result?</span><h4>Talk it through with our SORP assistant.</h4><p>It can help explore weaker answers, uncertainty, relevant MUST / SHOULD / MAY requirements and areas requiring judgement.</p><small>Your Snapshot will be carried into the conversation on this device, so you will not need to answer all 15 questions again.</small></div><a href="/are-you-sorp-ready/conversation?from=snapshot">Talk through my result <span>→</span></a></div>
          <Controls onBack={returnToLastQuestion} onExit={saveAndExit} onNext={() => router.push("/are-you-sorp-ready#review")} nextLabel={`Explore ${reviewPrice(setup)}`} />
        </section>}
      </div>
    </div>
  );
}
