"use client";
import Link from "next/link";
import { Arrow } from "@/components/ui";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { VoiceInput, type VoiceState } from "./voice-input";
import {
  advance,
  charityOptions,
  applyFacts,
  normaliseConversation,
  extractImmediate,
  fieldKeys,
  initialConversation,
  nextObjective,
  nextQuestion,
  registrationReady,
  validEmail,
  validEntity,
  safeDestination,
  TOTAL_TURN_CAP,
  type Conversation,
  type FieldKey,
} from "@/lib/onboarding/state";
const labels: Record<FieldKey, string> = {
  name: "Your name",
  email: "Email address",
  role: "Professional role",
  organisation: "Organisation or firm",
};
const autocomplete: Record<FieldKey, string> = {
  name: "name",
  email: "email",
  role: "organization-title",
  organisation: "organization",
};
async function post(action: string, body: unknown) {
  const response = await fetch(`/api/onboarding/${action}/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(
        data.error || "We couldn’t complete that yet. Please try again.",
      ),
      { snapshot: data.state ? data : undefined },
    );
  return data;
}
function publicLink(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password ? u.href : "";
  } catch {
    return "";
  }
}
export function Onboarding() {
  const params = useSearchParams(),
    destination = safeDestination(params.get("next") || params.get("return"));
  const [state, setState] = useState<Conversation>(initialConversation),
    [mode, setMode] = useState<"intro" | "conversation" | "form">("intro");
  const [draft, setDraft] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [changed, setChanged] = useState<FieldKey[]>([]),
    [reward, setReward] = useState("");
  const [history, setHistory] = useState<{ role: string; text: string }[]>([]),
    [service, setService] = useState(false),
    [voice, setVoice] = useState<VoiceState>("ready");
  const [query, setQuery] = useState(""),
    [searched, setSearched] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [verification, setVerification] = useState(false),
    [accountCreated, setAccountCreated] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [editVersion, setEditVersion] = useState(0),
    [editingComplete, setEditingComplete] = useState(false);
  const draftRef = useRef<HTMLTextAreaElement>(null),
    dialogRef = useRef<HTMLDialogElement>(null),
    dirty = useRef<Partial<Record<FieldKey, string>>>({}),
    currentState = useRef(state),
    saving = useRef<Promise<void> | null>(null),
    interacted = useRef(false),
    lock = useRef(false);
  const questionRef = useRef<HTMLDivElement>(null),
    profileRef = useRef<HTMLElement>(null),
    attributionRef = useRef<Record<string, string>>({});
  const selected = state.charity.confirmed,
    candidates = state.charity.candidates;
  const objective = nextObjective(state),
    ready = registrationReady(state.facts),
    completed = objective === "complete";
  const fieldComplete = (key: FieldKey) =>
    key === "email"
      ? validEmail(state.facts.email)
      : validEntity(state.facts[key], key);
  const count = fieldKeys.filter(fieldComplete).length;
  const product = destination.startsWith("/ask-sorp")
    ? "Ask SORP"
    : destination.startsWith("/are-you-sorp-ready")
      ? "Are You SORP Ready?"
      : destination.startsWith("/charity-impact-reports")
        ? "Charity Impact Reporting"
        : destination.startsWith("/social-impact-excellence")
          ? "Social Impact Excellence"
          : destination.startsWith("/my-impact-director")
            ? "My Impact Director"
            : "your dashboard";
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/readiness-account/", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const account = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok || !account.signedIn) {
          const response = await fetch("/api/onboarding/session/", {
            cache: "no-store",
            signal: controller.signal,
          });
          const saved = await response.json();
          if (
            !controller.signal.aborted &&
            !interacted.current &&
            response.ok &&
            saved.state &&
            (saved.state.turns ||
              Object.values(saved.state.facts).some(
                (v) => typeof v === "string" && v && v !== "unknown",
              ))
          ) {
            accept(saved);
            setService(true);
            setMode(saved.state.turns ? "conversation" : "form");
          }
          return;
        }
        // Resume a verified registration in the same browser without forcing an existing user to repeat onboarding.
        await post("complete", { fields: {} }).catch(() => undefined);
        if (!controller.signal.aborted) window.location.replace(destination);
      })
      .catch(() => undefined);
    return () => controller.abort();
    // Load once per destination. accept reads refs, not a captured state snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination]);
  useEffect(() => {
    if (
      mode !== "conversation" ||
      !window.matchMedia("(max-width:760px)").matches
    )
      return;
    const frame = requestAnimationFrame(() => {
      const question = questionRef.current,
        profile = profileRef.current;
      if (!question || !profile) return;
      window.scrollTo({
        top: Math.max(
          0,
          window.scrollY +
            question.getBoundingClientRect().top -
            profile.getBoundingClientRect().height -
            16,
        ),
        behavior: window.matchMedia("(prefers-reduced-motion:reduce)").matches
          ? "instant"
          : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [mode, state.turns, state.charity.confirmed, candidates.length]);
  useEffect(() => {
    if (accountOpen) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [accountOpen]);
  useEffect(() => {
    if (!changed.length) return;
    const timer = setTimeout(() => setChanged([]), 2200);
    return () => clearTimeout(timer);
  }, [changed]);
  function replace(next: Conversation) {
    currentState.current = next;
    setState(next);
  }
  function accept(data: {
    state: Conversation;
    messages?: { role: string; text: string }[];
  }) {
    const next = applyFacts(
      normaliseConversation(data.state),
      dirty.current,
      "form",
    );
    replace(next);
    if (data.messages) setHistory(data.messages);
  }
  function recover(error: unknown) {
    const data = (
      error as {
        snapshot?: {
          state: Conversation;
          messages?: { role: string; text: string }[];
        };
      }
    )?.snapshot;
    if (data) accept(data);
    setNotice(
      error instanceof Error
        ? error.message
        : "Please retry; your details are still here.",
    );
  }
  async function persistEdits() {
    if (saving.current) {
      await saving.current;
    }
    if (!service || !Object.keys(dirty.current).length) return;
    const fields = { ...dirty.current };
    const pending = (async () => {
      try {
        const data = await post("edit", {
          fields,
          revision: currentState.current.revision,
        });
        for (const key of fieldKeys)
          if (dirty.current[key] === fields[key]) delete dirty.current[key];
        accept(data);
      } catch (e) {
        recover(e);
        throw e;
      }
    })();
    saving.current = pending;
    try {
      await pending;
    } finally {
      if (saving.current === pending) saving.current = null;
    }
  }
  useEffect(() => {
    if (!editVersion || !service) return;
    const timer = setTimeout(() => {
      if (!lock.current) void persistEdits().catch(() => undefined);
    }, 450);
    return () => clearTimeout(timer);
    // The timer tracks field revisions; the promise reads the current canonical snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editVersion, service]);
  async function start(next: "conversation" | "form") {
    interacted.current = true;
    setMode(next);
    setNotice("");
    setBusy(true);
    lock.current = true;
    const attribution: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
      const value = params.get(key);
      if (value) attribution[key] = value.slice(0, 200);
    }
    try {
      if (document.referrer)
        attribution.referrer = new URL(document.referrer).origin;
    } catch {}
    attributionRef.current = attribution;
    try {
      const data = await post("start", { attribution });
      setService(true);
      if (data.state) {
        accept(data);
      }
    } catch {
      setService(false);
      if (next === "conversation")
        setNotice(
          "Conversation assistance is unavailable here. Clear details can still fill your profile; please check them or edit directly.",
        );
    }
    setBusy(false);
    lock.current = false;
    draftRef.current?.focus({ preventScroll: true });
  }
  function update(next: Conversation, previous: Conversation) {
    const keys = fieldKeys.filter(
      (k) => next.facts[k] && next.facts[k] !== previous.facts[k],
    );
    replace(next);
    if (keys.length) {
      setChanged(keys);
      setReward(
        `${keys.length === 1 ? labels[keys[0]] : `${keys.length} details`} added to your profile`,
      );
    }
  }
  async function send(event?: FormEvent, skip = false) {
    event?.preventDefault();
    if (
      lock.current ||
      (!draft.trim() && !skip) ||
      state.turns >= TOTAL_TURN_CAP
    )
      return;
    const message = skip ? "Skip this for now" : draft.trim();
    skip =
      skip ||
      (nextObjective(state) !== "registration" &&
        /^(skip(?: this(?: question)?)?|no thanks|not now|I[’']d rather skip(?: that)?)[.!]?$/i.test(
          message,
        ));
    if (/\b(?:my )?password\s*(?:is|:|=)/i.test(message)) {
      setNotice(
        "Please keep passwords out of the conversation. You’ll set yours in a secure password field when you create your account.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setReward("");
    try {
      await persistEdits();
      const before = currentState.current;
      const local = advance(
        before,
        skip ? {} : extractImmediate(message, before),
        skip,
      );
      if (!service) update(local, before);
      setDraft("");
      if (service) {
        const data = await post("turn", {
          message,
          skip,
          revision: before.revision,
        });
        update(
          applyFacts(normaliseConversation(data.state), dirty.current, "form"),
          before,
        );
        setHistory(data.messages);
        setNotice(data.notice || "");
        if (data.lookup) {
          setQuery(data.lookup);
          const found = await post("search", {
            query: data.lookup,
            revision: currentState.current.revision,
          });
          accept(found);
          setSearched(true);
        }
      } else
        setHistory((h) => [
          ...h,
          { role: "user", text: message },
          { role: "assistant", text: nextQuestion(local) },
        ]);
    } catch (e) {
      recover(e);
    } finally {
      lock.current = false;
      setBusy(false);
      void persistEdits().catch(() => undefined);
      draftRef.current?.focus({ preventScroll: true });
    }
  }
  async function search(value = query) {
    if (lock.current || !value.trim()) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    setSearched(false);
    try {
      await persistEdits();
      if (!service)
        throw new Error(
          "Charity lookup is not connected here. You can choose your charity later.",
        );
      const data = await post("search", {
        query: value,
        revision: currentState.current.revision,
      });
      accept(data);
      setSearched(true);
    } catch (e) {
      recover(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function confirm(index: number) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      await persistEdits();
      const data = await post("confirm", {
        index,
        revision: currentState.current.revision,
      });
      accept(data);
      setReward(`${data.state.charity.confirmed.name} confirmed`);
      setEditingComplete(false);
    } catch (e) {
      recover(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function createAccount(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (password !== confirmPassword) {
      setAccountError("Those passwords do not match.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setAccountError("");
    try {
      await persistEdits();
      const response = await fetch("/api/readiness-account/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "signup",
          name: state.facts.name.trim(),
          email: state.facts.email.trim().toLowerCase(),
          position: state.facts.role.trim(),
          organisation: state.facts.organisation.trim(),
          password,
          progress: {
            sessionId: crypto.randomUUID(),
            step: "scope",
            onboarding: {
              facts: currentState.current.facts,
              professionalContext: {
                relationships: currentState.current.professional,
                corrections: currentState.current.corrections,
                knowledge: currentState.current.knowledge,
              },
              selected,
              completedAt: new Date().toISOString(),
              messages: history,
              attribution: attributionRef.current,
            },
          },
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Your account could not be created. Please try again.",
        );
      setPassword("");
      setConfirmPassword("");
      if (data.verificationRequired) {
        setVerification(true);
        return;
      }
      setAccountCreated(true);
      if (service) {
        try {
          await post("complete", { fields: state.facts });
        } catch {
          setAccountError(
            "Your account was created, but your introduction could not be linked yet. Retry saving, or continue to your product.",
          );
          return;
        }
      }
      window.location.assign(destination);
    } catch (e) {
      setAccountError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const question = busy
    ? "I’m updating your introduction…"
    : nextQuestion(state);
  return (
    <main id="main" className="onboarding-page">
      <header className="onboarding-header">
        <Link
          href="/"
          className="onboarding-wordmark"
          aria-label="SORP 2026 home"
        >
          SORP<span>2026</span>
          <i />
        </Link>
        <span className="onboarding-header-note">
          ONE ACCOUNT. GREATER IMPACT.
        </span>
        <Link href={`/login/?next=${encodeURIComponent(destination)}`}>
          Sign in <Arrow diagonal />
        </Link>
      </header>
      <div className="onboarding-shell">
        <div className="onboarding-heading">
          <p className="onboarding-eyebrow">
            <span /> A MORE PERSONAL BEGINNING
          </p>
          <h1>
            Let’s get you <em>started.</em>
          </h1>
          <p>
            To make signing up easier, you can have a conversation with us
            instead.
            <br className="desktop-break" /> Just talk or type, and we’ll fill
            in the form as we go.
          </p>
        </div>
        <div className={`onboarding-workspace mode-${mode}`}>
          <section
            className="onboarding-conversation"
            aria-label="Your introduction"
          >
            <div className="conversation-topline">
              <span>
                <i /> YOUR CONVERSATION
              </span>
              <span>At your pace</span>
            </div>
            {mode === "intro" ? (
              <div className="onboarding-invitation">
                <div className="conversation-symbol" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <p className="onboarding-eyebrow">
                  TALK NATURALLY. WATCH IT TAKE SHAPE.
                </p>
                <h2>
                  A few words.
                  <br />A head start.
                </h2>
                <p>
                  Tell us a little about you and a charity you care about. We’ll
                  turn it into a useful starting point for your work.
                </p>
                <button
                  className="onboarding-primary"
                  onClick={() => void start("conversation")}
                >
                  Start a conversation <Arrow diagonal />
                </button>
                <button
                  className="onboarding-text-button"
                  onClick={() => void start("form")}
                >
                  Fill in the form yourself <span aria-hidden="true">→</span>
                </button>
                <small>About two minutes · No card needed</small>
              </div>
            ) : mode === "form" ? (
              <div className="onboarding-invitation manual-intro">
                <p className="onboarding-eyebrow">MAKE YOURSELF AT HOME</p>
                <h2>
                  Your details.
                  <br />
                  <em>Your way.</em>
                </h2>
                <p>
                  Complete your profile, then create your account. You can
                  choose a charity and personalise your experience later.
                </p>
                <button
                  className="onboarding-text-button"
                  onClick={() => setMode("conversation")}
                >
                  Switch to a conversation →
                </button>
              </div>
            ) : (
              <div className="conversation-body">
                {history.length > 0 && (
                  <details className="conversation-history">
                    <summary>
                      Our conversation so far{" "}
                      <span>
                        {history.filter((h) => h.role === "user").length}{" "}
                        replies
                      </span>
                    </summary>
                    <div>
                      {history.map((h, i) => (
                        <p key={i} className={`history-${h.role}`}>
                          <small>
                            {h.role === "user" ? "YOU" : "SORP 2026"}
                          </small>
                          {h.text}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
                <div
                  ref={questionRef}
                  className="conversation-question"
                  aria-live="polite"
                >
                  <span
                    className={`assistant-mark${busy ? " is-thinking" : ""}`}
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="19"
                      height="19"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" />
                    </svg>
                  </span>
                  <div>
                    <p className="onboarding-eyebrow">
                      {completed
                        ? "YOUR NEXT CHAPTER"
                        : "LET’S MAKE THIS YOURS"}
                    </p>
                    <h2>{question}</h2>
                  </div>
                </div>
                {selected && (
                  <div className="confirmed-charity">
                    <span aria-hidden="true">✓</span>
                    <div>
                      <strong>{selected.name}</strong>
                      <p>
                        Confirmed. Public information preparation has been
                        queued.
                      </p>
                    </div>
                  </div>
                )}
                {objective === "charity" && !selected && (
                  <div className="charity-discovery">
                    <p>
                      We’ll start with one charity to personalise your
                      experience. You can add others later.
                    </p>
                    {charityOptions(state).length > 0 && (
                      <div className="charity-mentions">
                        {charityOptions(state).map((c) => (
                          <button
                            type="button"
                            key={c}
                            disabled={busy}
                            onClick={() => {
                              setQuery(c);
                              void search(c);
                            }}
                          >
                            Find {c} <Arrow diagonal />
                          </button>
                        ))}
                      </div>
                    )}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void search();
                      }}
                    >
                      <label htmlFor="charity-lookup">
                        Charity name or registration number
                      </label>
                      <div>
                        <input
                          id="charity-lookup"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          maxLength={160}
                          placeholder="Find your starting charity"
                        />
                        <button disabled={busy || !query.trim()}>Find →</button>
                      </div>
                    </form>
                    {searched && !candidates.length && (
                      <p>
                        No reliable registry match yet. Try the charity number
                        or choose it later.
                      </p>
                    )}
                    {candidates.map((c, i) => (
                      <article className="charity-match" key={c.officialUrl}>
                        <p className="onboarding-eyebrow">
                          A REGISTRY MATCH TO CHECK
                        </p>
                        <h3>{c.name}</h3>
                        <p>
                          Charity {c.registrationNumber} ·{" "}
                          {c.jurisdiction || "Public register"}
                        </p>
                        <div className="charity-source-links">
                          {publicLink(c.officialUrl) && (
                            <a
                              href={publicLink(c.officialUrl)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Official register ↗
                            </a>
                          )}
                          {publicLink(c.website) ? (
                            <a
                              href={publicLink(c.website)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Charity website ↗
                            </a>
                          ) : (
                            <span>Website not established</span>
                          )}
                        </div>
                        <p className="charity-source-note">
                          Details returned by our charity research service.
                          Please check this is the right organisation.
                        </p>
                        <button
                          className="onboarding-primary"
                          disabled={busy}
                          onClick={() => void confirm(i)}
                        >
                          Yes, this is the charity <span>✓</span>
                        </button>
                      </article>
                    ))}
                  </div>
                )}
                {(!completed || editingComplete) && (
                  <form
                    onSubmit={(e) => void send(e)}
                    className="onboarding-composer"
                  >
                    <VoiceInput
                      disabled={busy}
                      onState={setVoice}
                      onTranscript={(text) => {
                        setDraft((current) =>
                          [current, text]
                            .filter(Boolean)
                            .join(" ")
                            .slice(0, 3000),
                        );
                        draftRef.current?.focus({ preventScroll: true });
                      }}
                    />
                    <label htmlFor="introduction-answer">Your answer</label>
                    <textarea
                      ref={draftRef}
                      id="introduction-answer"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={3}
                      maxLength={3000}
                      placeholder="Tell us in your own words…"
                      disabled={
                        busy ||
                        voice === "recording" ||
                        voice === "transcribing"
                      }
                    />
                    <div className="composer-bottom">
                      <span>
                        {voice === "transcript"
                          ? "Review your words, then send."
                          : "Talk or type. You’re in control."}
                      </span>
                      <button
                        className="onboarding-send"
                        disabled={
                          busy ||
                          !draft.trim() ||
                          ["recording", "transcribing", "permission"].includes(
                            voice,
                          )
                        }
                      >
                        {busy ? "Understanding…" : "Send"}{" "}
                        <span aria-hidden="true">↑</span>
                      </button>
                    </div>
                  </form>
                )}
                {notice && (
                  <p className="onboarding-notice" role="status">
                    {notice}
                  </p>
                )}
                {ready && !completed && (
                  <button
                    className="mobile-early-exit onboarding-text-button"
                    disabled={busy}
                    onClick={() => setAccountOpen(true)}
                  >
                    Continue with these details →
                  </button>
                )}
                {!completed && objective !== "registration" && (
                  <button
                    className="onboarding-skip"
                    disabled={busy}
                    onClick={() => void send(undefined, true)}
                  >
                    Skip this question
                  </button>
                )}
                {completed && (
                  <div className="onboarding-finish">
                    {state.turns < TOTAL_TURN_CAP && (
                      <button
                        type="button"
                        className="onboarding-text-button"
                        onClick={() => setEditingComplete(true)}
                      >
                        Correct a detail
                      </button>
                    )}
                    <p>
                      {selected
                        ? `Your profile and ${selected.name} will give us a useful place to begin.`
                        : "Your introduction is ready. You can add a charity later."}
                    </p>
                    <button
                      className="onboarding-primary"
                      disabled={!ready}
                      onClick={() => setAccountOpen(true)}
                    >
                      Create my account <Arrow diagonal />
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="conversation-footnote">
              <span aria-hidden="true">◇</span>
              <p>
                Your introduction will be saved with your account, so if you
                speak with our team, we can pick up where you left off.{" "}
                <Link href="/privacy/">Privacy</Link>
              </p>
            </div>
          </section>
          <aside
            ref={profileRef}
            className="onboarding-profile"
            aria-label="Your live editable profile"
          >
            <div className="profile-heading">
              <div>
                <p className="onboarding-eyebrow">TAKING SHAPE</p>
                <h2>Your introduction</h2>
              </div>
              <span
                className="profile-count"
                aria-label={`${count} of 4 profile details filled`}
              >
                {count}
                <small>/4</small>
              </span>
            </div>
            <p className="onboarding-eyebrow">
              Profile details
              {ready && !selected && !state.skipped.includes("charity")
                ? " · charity not confirmed"
                : ""}
            </p>
            <div className="profile-progress" aria-hidden="true">
              <span style={{ width: `${count * 25}%` }} />
            </div>
            <p className="profile-hint">
              {mode === "form"
                ? "A few details to make this yours."
                : "As you talk, your details appear here."}
              <span>You can edit anything.</span>
            </p>
            <form
              id="onboarding-profile-form"
              onSubmit={(e) => {
                e.preventDefault();
                setAccountOpen(true);
              }}
            >
              <div className="profile-fields">
                {fieldKeys.map((key) => (
                  <label
                    className={`profile-field${changed.includes(key) ? " field-arrived" : ""}${state.facts[key] ? " has-value" : ""}`}
                    key={key}
                  >
                    <span>
                      {labels[key]}
                      {key === "organisation" && <small>optional</small>}
                      {fieldComplete(key) && <i aria-hidden="true">✓</i>}
                    </span>
                    <input
                      name={key}
                      type={key === "email" ? "email" : "text"}
                      aria-invalid={
                        key === "email" &&
                        !!state.facts.email &&
                        !validEmail(state.facts.email)
                      }
                      autoComplete={autocomplete[key]}
                      required={key !== "organisation"}
                      minLength={key === "email" ? undefined : 2}
                      maxLength={key === "email" ? 254 : 120}
                      value={state.facts[key]}
                      placeholder={
                        mode === "form"
                          ? `Enter ${labels[key].toLowerCase()}`
                          : "—"
                      }
                      onChange={(e) => {
                        dirty.current[key] = e.target.value;
                        replace(
                          applyFacts(
                            currentState.current,
                            { [key]: e.target.value },
                            "form",
                          ),
                        );
                        setEditVersion((v) => v + 1);
                      }}
                    />
                  </label>
                ))}
              </div>
              <div
                className={`profile-reward${reward ? " is-rewarded" : ""}`}
                role="status"
                aria-live="polite"
                key={reward}
              >
                {reward ? (
                  <>
                    <span>✓</span> {reward}
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">→</span> A conversation that does
                    something useful.
                  </>
                )}
              </div>
              <div className="profile-next">
                <button
                  type="submit"
                  className={
                    mode === "form" || completed
                      ? "onboarding-primary"
                      : "onboarding-secondary"
                  }
                  disabled={!ready || busy}
                >
                  {completed || mode === "form"
                    ? "Create my account"
                    : "Continue with these details"}{" "}
                  <span>→</span>
                </button>
                <p>
                  {ready
                    ? "You can keep talking, or start exploring."
                    : state.facts.email && !validEmail(state.facts.email)
                      ? "Check your email address to continue."
                      : "Your name, email and role are all we need to begin."}
                </p>
              </div>
            </form>
            <div className="profile-destination">
              <span>YOUR NEXT STOP</span>
              <strong>
                {product} <Arrow diagonal />
              </strong>
              <p>One account for all five SORP 2026 tools.</p>
            </div>
          </aside>
        </div>
        <footer className="onboarding-footer">
          <span>
            Thoughtfully built by <strong>The Ideas Shed</strong>
          </span>
          <span>
            Part of <strong>My Social Impact</strong>
          </span>
        </footer>
      </div>
      <dialog
        ref={dialogRef}
        aria-label="Your SORP2026 account"
        className="onboarding-account-dialog"
        onCancel={() => setAccountOpen(false)}
        onClose={() => setAccountOpen(false)}
      >
        <button
          className="dialog-close"
          aria-label="Close account setup"
          onClick={() => setAccountOpen(false)}
        >
          ×
        </button>
        {verification ? (
          <>
            <p className="onboarding-eyebrow">ONE LAST CHECK</p>
            <h2>
              Check your inbox,
              <br />
              {state.facts.name.split(" ")[0]}.
            </h2>
            <p>
              Follow the verification link sent to{" "}
              <strong>{state.facts.email}</strong>, then sign in to continue to{" "}
              {product}.
            </p>
            <Link
              className="onboarding-primary"
              href={`/login/?next=${encodeURIComponent(`/get-started/?next=${encodeURIComponent(destination)}`)}`}
            >
              Sign in after verifying →
            </Link>
          </>
        ) : accountCreated ? (
          <>
            <h2>Your account is ready.</h2>
            <p role="status">{accountError}</p>
            <button
              className="onboarding-primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await post("complete", { fields: state.facts });
                  window.location.assign(destination);
                } catch {
                  setAccountError(
                    "Your introduction still couldn’t be linked. You can continue and choose your charity later.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Retry saving introduction
            </button>
            <Link href={destination}>Continue to {product} →</Link>
          </>
        ) : (
          <form onSubmit={(e) => void createAccount(e)}>
            <p className="onboarding-eyebrow">YOUR FREE SORP 2026 ACCOUNT</p>
            <h2>
              Make it yours,
              <br />
              {state.facts.name.split(" ")[0]}.
            </h2>
            <p>
              Creating an account for <strong>{state.facts.email}</strong>. Your
              next stop is {product}.
            </p>
            <label>
              Choose a password
              <input
                autoComplete="new-password"
                type="password"
                required
                minLength={12}
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <small>At least 12 characters. Kept out of the conversation.</small>
            <label>
              Confirm your password
              <input
                autoComplete="new-password"
                type="password"
                required
                minLength={12}
                maxLength={200}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
            {accountError && (
              <p className="onboarding-notice" role="alert">
                {accountError}
              </p>
            )}
            <button className="onboarding-primary" disabled={busy}>
              {busy ? "Creating your account…" : "Create my account"}{" "}
              <Arrow diagonal />
            </button>
            <p className="dialog-note">
              Already registered?{" "}
              <Link href={`/login/?next=${encodeURIComponent(destination)}`}>
                Sign in
              </Link>
              . Your existing work and subscriptions stay with your account.
            </p>
          </form>
        )}
      </dialog>
    </main>
  );
}
