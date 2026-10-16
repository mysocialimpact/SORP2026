"use client";
import { loadSharedContext } from "@/features/onboarding/shared-context";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AccountPortal } from "@/components/account-portal";
import {
  ANCHORS,
  AREAS,
  QUESTIONS,
  REFLECTIONS,
  buildReport,
  emptyDraft,
  reportText,
  validDraft,
  type Draft,
} from "./model";
import s from "./director.module.css";
type Owner = { id: string; name: string; organisation: string };
const GUEST = "msi-director-guest-v1";
function readDraft(key: string): Draft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    return validDraft(value) ? value : null;
  } catch {
    return null;
  }
}
function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function DirectorAssessment() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Checking for saved progress…");
  const [error, setError] = useState("");
  const [guest, setGuest] = useState<Draft | null>(null);
  const [recovery, setRecovery] = useState<Draft | null>(null);
  const [locked, setLocked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const revision = useRef(0),
    latest = useRef(draft),
    saved = useRef(""),
    saving = useRef(false),
    blocked = useRef(false),
    claiming = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!expanded || !ready) return;
    frame.current?.scrollIntoView({ block: "start", behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
  }, [draft.step, expanded, ready]);
  useEffect(() => {
    latest.current = draft;
  }, [draft]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/impact-director/", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (response.status === 401) {
          const local = readDraft(GUEST);
          if (local) setDraft(local);
          setStatus(
            "A free account keeps your answers, report and next steps together.",
          );
        } else {
          if (!response.ok || !data.account?.id)
            throw new Error(
              data.error || "Saved progress could not be checked.",
            );
          setOwner(data.account);
          revision.current = data.progress?.revision || 0;
          const remote = validDraft(data.progress?.data)
            ? data.progress.data
            : {
                ...emptyDraft(),
                step: window.location.hash === "#assessment" ? 0 : -1,
                organisation: data.account.organisation || "",
              };
          const shared = !remote.organisation ? await loadSharedContext(controller.signal).catch(() => null) : null;
          if (shared?.charity?.candidate.name) remote.organisation = shared.charity.candidate.name;
          saved.current = JSON.stringify(remote);
          setDraft(remote);
          try {
            const pending = JSON.parse(
              sessionStorage.getItem(
                `msi-director-account:${data.account.id}`,
              ) || "null",
            );
            if (
              validDraft(pending?.draft) &&
              JSON.stringify(pending.draft) !== JSON.stringify(remote)
            ) {
              if (pending.revision === revision.current)
                setDraft(pending.draft);
              else setRecovery(pending.draft);
            }
          } catch {
            /* A damaged browser cache must never replace the server record. */
          }
          setStatus(
            data.progress
              ? "Saved snapshot opened from your account."
              : "Signed in. Your progress will save to your account.",
          );
          const local = readDraft(GUEST);
          if (local && local.step >= 0) setGuest(local);
        }
        setReady(true);
        if (window.location.hash === "#assessment") setExpanded(true);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e.message || "Please reload to check your saved progress.");
          setLocked(true);
        }
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    function activate() {
      if (window.location.hash === "#assessment") setExpanded(true);
    }
    window.addEventListener("hashchange", activate);
    return () => window.removeEventListener("hashchange", activate);
  }, []);
  async function save() {
    if (
      !owner ||
      !ready ||
      saving.current ||
      blocked.current ||
      latest.current.step < 0
    )
      return;
    saving.current = true;
    try {
      while (saved.current !== JSON.stringify(latest.current)) {
        const snapshot = JSON.stringify(latest.current);
        setStatus("Saving to your account…");
        const response = await fetch("/api/impact-director/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            accountId: owner.id,
            revision: revision.current,
            data: JSON.parse(snapshot),
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 401 || response.status === 409) {
            blocked.current = true;
            setLocked(true);
          }
          throw new Error(
            data.error || "Your account save did not complete. Please retry.",
          );
        }
        revision.current = data.revision;
        saved.current = snapshot;
        try {
          sessionStorage.setItem(
            `msi-director-account:${owner.id}`,
            JSON.stringify({ revision: data.revision, draft: latest.current }),
          );
          if (claiming.current) {
            sessionStorage.removeItem(GUEST);
            claiming.current = false;
          }
        } catch {
          /* The account save is authoritative even if browser storage is full. */
        }
        setError("");
        setStatus("Saved to your account · available from My Dashboard.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your save did not complete.");
      setStatus("Not yet saved to your account.");
    } finally {
      saving.current = false;
    }
  }
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useLayoutEffect(() => {
    if (!ready || locked || draft.step < 0) return;
    if (!owner) {
      try {
        sessionStorage.setItem(GUEST, JSON.stringify(draft));
      } catch {
        queueMicrotask(() =>
          setError(
            "This browser cannot keep your draft. Keep this page open and download your answers before leaving.",
          ),
        );
      }
      return;
    }
    try {
      sessionStorage.setItem(
        `msi-director-account:${owner.id}`,
        JSON.stringify({ revision: revision.current, draft }),
      );
    } catch {
      /* Save directly to the account below. */
    }
    const timer = setTimeout(() => void saveRef.current(), 400);
    return () => clearTimeout(timer);
  }, [draft, owner, ready, locked]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (
        owner &&
        JSON.stringify(latest.current) !== saved.current &&
        latest.current.step >= 0
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [owner]);
  function move(step: number) {
    if (!owner || locked) return;
    setDraft((d) => ({
      ...d,
      step,
      completed: step === 25 ? true : d.completed,
    }));
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  }
  const answered = draft.ratings.filter(Boolean).length;
  const question = QUESTIONS[draft.step];
  const report = draft.completed ? buildReport(draft) : null;
  function download() {
    downloadText(
      report ? reportText(draft) : JSON.stringify(draft, null, 2),
      report
        ? "my-impact-director-report.txt"
        : "my-impact-director-draft.json",
    );
  }
  return (
    <section
      id="assessment"
      className={s.assessment}
      aria-label="My Impact Director technology readiness assessment"
    >
      <div className={s.invitation}>
        <div>
          <p className={s.kicker}>
            Free assessment · 21 star-rating questions · about 8 minutes
          </p>
          <h2>
            How tech-savvy is<br /> <em>your organisation?</em>
          </h2>
          <p>
            Discover how you’re already using technology, data and AI, and where
            you could do more. No technical knowledge required.
          </p>
        </div>
        <div>
          <span className={s.bigStar} aria-hidden="true">
            ✳
          </span>
          <button
            className={s.primary}
            disabled={!ready || locked}
            onClick={() => {
              setExpanded(true);
              if (owner && draft.completed) move(25);
              else if (owner && draft.step < 0) move(0);
            }}
          >
            {owner && draft.completed
              ? "Open my snapshot ↗"
              : owner && answered
                ? "Continue my snapshot ↗"
                : "Start your free assessment ↗"}
          </button>
          <p className={s.small}>
            {owner ? "Your report, practical recommendations and conversation agenda are free." : "Simply register for free or log in to begin. Your account opens the door to our wider tools and assessments."}
          </p>
        </div>
      </div>
      <p className={s.saveStatus} role="status">
        {owner ? `Hello, ${owner.name.split(" ")[0]}. ` : ""}
        {status}
      </p>
      {guest && owner && (
        <aside className={s.notice}>
          <p>
            There are guest answers in this tab. Would you like to save them to{" "}
            <strong>{owner.name}’s account</strong>? This replaces only this
            account’s My Impact Director snapshot, if one exists. SORP and SIE
            are unchanged.
          </p>
          <button
            className={s.secondary}
            onClick={() => {
              claiming.current = true;
              setDraft(guest);
              setGuest(null);
              setExpanded(true);
            }}
          >
            Use my guest answers
          </button>
          <button
            className={s.textButton}
            onClick={() => {
              setGuest(null);
              sessionStorage.removeItem(GUEST);
            }}
          >
            Keep my account version
          </button>
        </aside>
      )}
      {recovery && (
        <aside className={s.notice}>
          <p>
            This account has unsaved answers in this tab and a newer version on
            the server. Choose which version to keep; nothing will be silently
            overwritten.
          </p>
          <button
            className={s.secondary}
            onClick={() => {
              setDraft(recovery);
              setRecovery(null);
              setExpanded(true);
            }}
          >
            Replace with my tab’s answers
          </button>
          <button className={s.textButton} onClick={() => setRecovery(null)}>
            Keep the saved version
          </button>
        </aside>
      )}
      {error && (
        <div className={s.notice} role="alert">
          <p>{error}</p>
          {!locked && owner && (
            <button className={s.secondary} onClick={() => void save()}>
              Retry saving
            </button>
          )}
          <button className={s.textButton} onClick={download}>
            Download my current answers
          </button>
          {locked && (
            <button
              className={s.textButton}
              onClick={() => window.location.reload()}
            >
              Reload saved version
            </button>
          )}
        </div>
      )}
      {expanded && ready && !owner && !locked && (
        <div className={s.authPanel} ref={frame}>
          <div>
            <p className={s.kicker}>Your own space to explore</p>
            <h3 ref={heading} tabIndex={-1}>A free account.<br />A smarter starting point.</h3>
            <p>Keep your progress and return whenever you like. This is your technology snapshot, not another Social Impact Excellence assessment.</p>
          </div>
          <Suspense fallback={<p role="status">Opening your account options…</p>}>
            <AccountPortal embedded returnTo="/my-impact-director/#assessment" />
          </Suspense>
        </div>
      )}
      {expanded && ready && owner && (
        <div
          className={s.frame}
          ref={frame}
          data-mode={
            draft.step >= 0 && draft.step < 25 ? "questions" : "report"
          }
        >
          <header className={s.frameHeader}>
            <span>YOUR READINESS SNAPSHOT</span>
            <span>
              {draft.step === 25 ? "Your results" : `${answered} of 21 rated`}
            </span>
            <button className={s.textButton} onClick={() => setExpanded(false)}>
              Close assessment ↑
            </button>
          </header>
          <progress
            className={s.progress}
            max={21}
            value={answered}
            aria-label="Rating questions answered"
          />
          {draft.step < 0 ? (
            <div className={s.question}>
              <h3 ref={heading} tabIndex={-1}>
                Your perspective.
                <br />
                Your starting point.
              </h3>
              <p>
                Rate how true each statement feels today. One star means “not
                yet true”; five means “consistently true”. You can change any
                answer. Four optional reflections follow.
              </p>
              <p>
                Please don’t include names or sensitive details about
                beneficiaries, staff or clients.
              </p>
              <button
                className={s.primary}
                onClick={() => move(0)}
                disabled={locked}
              >
                Start my snapshot →
              </button>
            </div>
          ) : draft.step < 25 ? (
            <>
              <div
                className={s.chapterRail}
                role="region"
                tabIndex={0}
                aria-label="Assessment areas"
              >
                {AREAS.map((a, i) => (
                  <span key={a.name} data-active={question?.[0] === i}>
                    {a.name}
                  </span>
                ))}
              </div>
              <div key={draft.step} className={s.question}>
                <p className={s.kicker}>
                  {question
                    ? `${AREAS[question[0]].name} · Question ${draft.step + 1} of 21`
                    : `The bigger picture · ${draft.step - 20} of 4 · Optional`}
                </p>
                <h3 ref={heading} tabIndex={-1}>
                  {question ? question[1] : REFLECTIONS[draft.step - 21]}
                </h3>
                {question ? (
                  <>
                    <fieldset className={s.rating} disabled={locked}>
                      <legend>
                        How true is this for your organisation today?
                      </legend>
                      <div className={s.stars}>
                        {ANCHORS.map((label, i) => (
                          <label key={label} title={label}>
                            <input
                              type="radio"
                              name={`rating-${draft.step}`}
                              aria-label={`${i + 1} ${i ? "stars" : "star"}: ${label}`}
                              value={i + 1}
                              checked={draft.ratings[draft.step] === i + 1}
                              onChange={() =>
                                setDraft((d) => ({
                                  ...d,
                                  ratings: d.ratings.map((v, n) =>
                                    n === d.step ? i + 1 : v,
                                  ),
                                }))
                              }
                            />
                            <span
                              aria-hidden="true"
                              data-filled={draft.ratings[draft.step] >= i + 1}
                            >
                              ★
                            </span>
                            <small aria-hidden="true">{i + 1}</small>
                          </label>
                        ))}
                      </div>
                      <div className={s.scale}>
                        <span>Not yet true</span>
                        <span>Consistently true</span>
                      </div>
                    </fieldset>
                    <p className={s.ratingDescription} aria-live="polite">
                      {ANCHORS[draft.ratings[draft.step] - 1] ||
                        "There’s no perfect answer. Just your experience today."}
                    </p>
                    <details>
                      <summary>What do the stars mean?</summary>
                      <ol>
                        {ANCHORS.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ol>
                      <p>
                        If you’re unsure, rate what you know and mention the
                        uncertainty in the reflections.
                      </p>
                    </details>
                  </>
                ) : (
                  <>
                    <p>
                      Completely optional. A few honest thoughts can make your
                      first conversation much more useful. Please leave out
                      sensitive personal information.
                    </p>
                    <label className={s.srOnly} htmlFor="director-reflection">
                      Your response
                    </label>
                    <textarea
                      id="director-reflection"
                      rows={6}
                      maxLength={10000}
                      disabled={locked}
                      value={draft.reflections[draft.step - 21]}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          reflections: d.reflections.map((v, i) =>
                            i === d.step - 21 ? e.target.value : v,
                          ),
                        }))
                      }
                    />
                  </>
                )}
              </div>
              <footer className={s.frameFooter}>
                <button
                  className={s.secondary}
                  onClick={() => move(draft.step - 1)}
                >
                  ← Back
                </button>
                <span>
                  {question
                    ? "Small steps. Useful insights."
                    : "Your words. Your priorities."}
                </span>
                <button
                  className={s.primary}
                  disabled={
                    locked ||
                    (Boolean(question) && !draft.ratings[draft.step]) ||
                    (draft.step === 24 && answered < 21)
                  }
                  onClick={() => move(draft.step + 1)}
                >
                  {draft.step === 24
                    ? "See my snapshot ↗"
                    : !question && !draft.reflections[draft.step - 21]
                      ? "Skip →"
                      : "Next →"}
                </button>
              </footer>
            </>
          ) : (
            report && (
              <div className={s.results}>
                <p className={s.kicker}>Your starting point. Not a verdict.</p>
                <h3 ref={heading} tabIndex={-1}>
                  {report.summary}
                </h3>
                <p>
                  This is based on your answers, not independently verified
                  findings. It is not a professional audit or a Social Impact
                  Excellence maturity assessment.
                </p>
                <label className={s.orgLabel}>
                  Organisation <span>(optional, for your report)</span>
                  <input
                    value={draft.organisation}
                    maxLength={200}
                    disabled={locked}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, organisation: e.target.value }))
                    }
                  />
                </label>
                <div className={s.resultGrid}>
                  <div className={s.overall}>
                    <strong>
                      {report.overall}
                      <small>/5</small>
                    </strong>
                    <span>Overall readiness picture</span>
                  </div>
                  <div className={s.bars}>
                    {report.areas.map((a) => (
                      <div key={a.name}>
                        <p>
                          <strong>{a.name}</strong>
                          <span>{a.score}/5</span>
                        </p>
                        <meter
                          min={1}
                          max={5}
                          value={a.score}
                          aria-label={`${a.name}: ${a.score} of 5`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <details>
                  <summary>How we calculate your scores</summary>
                  <p>
                    Each area is the mean of its star ratings. The overall score
                    gives each of the five areas equal weight, rounded to one
                    decimal place. These are discussion prompts, not benchmarks
                    against other organisations.
                  </p>
                </details>
                <div className={s.resultGrid}>
                  <section>
                    <h4>Build on what’s there.</h4>
                    {report.strengths.length ? (
                      <>
                        <p>
                          You rated these practices mostly or consistently true:
                        </p>
                        <ul>
                          {report.strengths.map((a) => (
                            <li key={a.name}>
                              {a.name} · {a.score}/5
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p>
                        No area averaged four stars yet. Your willingness to
                        examine how things work is a useful starting point;
                        begin with a small, achievable improvement.
                      </p>
                    )}
                  </section>
                  <section>
                    <h4>Give these some attention.</h4>
                    {report.barriers.length ? (
                      <>
                        <p>
                          Your lower ratings suggest these areas need a closer
                          conversation:
                        </p>
                        <ul>
                          {report.barriers.map((a) => (
                            <li key={a.name}>
                              {a.name} · {a.score}/5
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p>
                        You reported no area below three stars. That doesn’t
                        rule out barriers: test these impressions with
                        colleagues and real examples.
                      </p>
                    )}
                  </section>
                </div>
                <h4>Three practical next moves.</h4>
                <ol className={s.actions}>
                  {report.priorities.map((a) => (
                    <li key={a.name}>
                      <strong>{a.name}</strong>
                      <p>{a.next}</p>
                      <p className={s.small}>{a.opportunity}</p>
                    </li>
                  ))}
                </ol>
                <section className={s.agenda}>
                  <p className={s.kicker}>Made from your answers</p>
                  <h4>
                    Your first conversation,
                    <br />
                    <em>already taking shape.</em>
                  </h4>
                  <ol>
                    {report.agenda.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ol>
                  <p>
                    For a 10-minute introduction, start with your top priority.
                    The rest can guide a fuller review.
                  </p>
                </section>
                <details>
                  <summary>Review all my answers</summary>
                  {QUESTIONS.map((q, i) => (
                    <p key={i}>
                      <strong>
                        {i + 1}. {q[1]}
                      </strong>
                      <br />
                      {draft.ratings[i]}/5 · {ANCHORS[draft.ratings[i] - 1]}
                    </p>
                  ))}
                  {REFLECTIONS.map((q, i) => (
                    <p key={q}>
                      <strong>{q}</strong>
                      <br />
                      {draft.reflections[i] || "Not provided"}
                    </p>
                  ))}
                </details>
                <div className={s.resultActions}>
                  <button className={s.secondary} onClick={download}>
                    Download my report & agenda ↓
                  </button>
                  <button className={s.textButton} onClick={() => move(0)}>
                    Review / change answers
                  </button>
                  <a className={s.primary} href="#director-conversation">
                    Talk to an Impact Director ↗
                  </a>
                </div>
                {!owner ? (
                  <aside className={s.notice}>
                    <h4>Keep your next chapter in one place.</h4>
                    <p>
                      Your answers are still in this browser tab. Log in or
                      create your existing SORP2026 account to save them
                      alongside your other products. After signing in, confirm
                      “Use my guest answers”.
                    </p>
                    <a
                      className={s.secondary}
                      href="/login/?return=%2Fmy-impact-director%2F%23assessment"
                    >
                      Save to my account ↗
                    </a>
                  </aside>
                ) : (
                  <p>
                    <a href="/dashboard/">Back to My Dashboard ↗</a> · Your
                    completed snapshot starts your My Impact Director journey;
                    it doesn’t mean the service is complete.
                  </p>
                )}
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}
