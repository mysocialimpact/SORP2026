"use client";
import Link from "next/link";
import { Arrow } from "@/components/ui";
import { invitationTokenFromDestination } from "@/lib/account-navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { VoiceInput, type VoiceState } from "./voice-input";
import { readAudience, serverAudience, subscribeAudience } from "@/lib/audience-preference";
import {
  advance,
  charityOptions,
  applyFacts,
  normaliseConversation,
  extractImmediate,
  fieldKeys,
  editableKeys,
  optionalKeys,
  fieldLimit,
  challengeQuestion,
  accountReady as canCreateAccount,
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
  type EditableKey,
} from "@/lib/onboarding/state";
const labels: Record<EditableKey, string> = {
  name: "Full name",
  email: "Email address",
  role: "Professional role",
  organisation: "Organisation or firm",
  responsibilities: "Tell us a little more about what you do.",
  discovery: "How did you hear about us?",
  concerns: challengeQuestion,
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
    signal: AbortSignal.timeout(action === "search" ? 15000 : 30000),
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
export function Onboarding({ previewEmailSandbox = false }: { previewEmailSandbox?: boolean }) {
  const [previewVerificationUrl, setPreviewVerificationUrl] = useState("");
  const params = useSearchParams(),
    destination = safeDestination(params.get("next") || params.get("return"));
  const audience = useSyncExternalStore(subscribeAudience, readAudience, serverAudience);
  const [state, setState] = useState<Conversation>(initialConversation),
    [mode, setMode] = useState<"conversation" | "form">("conversation");
  const [draft, setDraft] = useState(""),
    [busy, setBusy] = useState(true),
    [notice, setNotice] = useState(""),
    [changed, setChanged] = useState<EditableKey[]>([]),
    [reward, setReward] = useState<{ title: string; detail: string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false),
    [activity, setActivity] = useState("Opening your conversation"),
    [lookupSuggested, setLookupSuggested] = useState(false);
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
    dirty = useRef<Partial<Record<EditableKey, string>>>({}),
    currentState = useRef(state),
    saving = useRef<Promise<void> | null>(null),
    interacted = useRef(false),
    started = useRef(false),
    lock = useRef(false);
  const threadRef = useRef<HTMLDivElement>(null),
    attributionRef = useRef<Record<string, string>>({});
  const selected = state.charity.confirmed,
    candidates = state.charity.candidates;
  const objective = nextObjective(state),
    completed = objective === "complete";
  const accountReady = canCreateAccount(state);
  const fieldComplete = (key: FieldKey) =>
    key === "email"
      ? validEmail(state.facts.email)
      : validEntity(state.facts[key], key);
  const count = fieldKeys.filter(fieldComplete).length + Number(!!selected);
  const optionalCount = optionalKeys.filter(key => state.facts[key].trim()).length;
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
    const frame = requestAnimationFrame(() => {
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [mode, state.turns, history.length, state.charity.confirmed, candidates.length]);
  useEffect(() => {
    if (accountOpen) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [accountOpen]);
  useEffect(() => {
    if (!changed.length) return;
    const timer = setTimeout(() => setChanged([]), 2200);
    return () => clearTimeout(timer);
  }, [changed]);
  useEffect(() => {
    if (!reward || busy) return;
    const timer = setTimeout(() => setReward(null), 4800);
    return () => clearTimeout(timer);
  }, [reward, busy]);
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
    if (data.messages?.length) setHistory(data.messages);
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
        for (const key of editableKeys)
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
    if (started.current) return;
    started.current = true;
    interacted.current = true;
    // Loading a draft must not override a method the visitor has just chosen.
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
    const keys = editableKeys.filter(
      (k) => next.facts[k] && next.facts[k] !== previous.facts[k],
    );
    replace(next);
    if (keys.length) {
      setChanged(keys);
      const shortLabels: Record<EditableKey, string> = {
        name: "Name", email: "Email", role: "Role", organisation: "Organisation",
        responsibilities: "Introduction", discovery: "How you found us", concerns: "Your challenge",
      };
      setReward({
        title: keys.length === 1 ? `${shortLabels[keys[0]]} ${previous.facts[keys[0]] ? "updated" : "captured"}` : `${keys.length} details captured`,
        detail: keys.map(key => shortLabels[key]).join(" · "),
      });
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
    setActivity("Listening and filling in your details");
    setReward(null);
    setNotice("");
    const beforeSend = currentState.current;
    const immediate = advance(beforeSend, skip ? {} : extractImmediate(message, beforeSend), skip);
    // Render the message and safe local extraction before any save or AI request.
    setHistory(items => [...items, { role: "user", text: message }]);
    setDraft("");
    update(immediate, beforeSend);
    // The server revision/state remains authoritative while pending form edits save.
    currentState.current = beforeSend;
    const reassurance = setTimeout(() => setActivity("Putting your reply together"), 1600);
    try {
      // A save already in flight must finish first. Any other manual edits can
      // travel with this turn instead of costing an extra network round trip.
      if (saving.current) await saving.current;
      const before = currentState.current;
      const fields = { ...dirty.current };
      const local = advance(
        before,
        skip ? {} : extractImmediate(message, before),
        skip,
      );
      // Recognised details appear while the existing server conversation is responding.
      replace(local);
      if (service) {
        const data = await post("turn", {
          message,
          skip,
          fields,
          revision: before.revision,
        });
        for (const key of editableKeys)
          if (dirty.current[key] === fields[key]) delete dirty.current[key];
        update(
          applyFacts(normaliseConversation(data.state), dirty.current, "form"),
          local,
        );
        setHistory(data.messages?.length
          ? data.messages
          : (items) => [...items, { role: "assistant", text: nextQuestion(normaliseConversation(data.state)) }].slice(-22));
        setNotice(data.notice || "");
        if (data.lookup) {
          setQuery(data.lookup);
          // Search is an explicit, separate action: no registry wait blocks the reply.
          setLookupSuggested(true);
        }
      } else
        setHistory((h) => [
          ...h,
          { role: "assistant", text: nextQuestion(local) },
        ]);
    } catch (e) {
      if (!skip) setDraft(message);
      recover(e);
    } finally {
      clearTimeout(reassurance);
      lock.current = false;
      setBusy(false);
      void persistEdits().catch(() => undefined);
      if (!validEntity(currentState.current.facts.organisation, "organisation") || !registrationReady(currentState.current.facts))
        draftRef.current?.focus({ preventScroll: true });
    }
  }
  async function search(value = query) {
    if (lock.current || !value.trim()) return;
    lock.current = true;
    setBusy(true);
    setActivity("Finding the official charity record");
    setNotice("");
    setSearched(false);
    try {
      await persistEdits();
      if (!service)
        throw new Error(
          "Charity lookup is not connected here. Your details are kept on this page; please retry before creating your account.",
        );
      const data = await post("search", {
        query: value,
        revision: currentState.current.revision,
      });
      accept(data);
      setSearched(true);
      setLookupSuggested(false);
    } catch (e) {
      recover(e instanceof DOMException && e.name === "TimeoutError" ? new Error("Charity lookup timed out. Try the registration number or retry the name; your details are still here.") :
        e instanceof TypeError ? new Error("The charity search service is unavailable. Try again, or use the registration number; your details are still here.") : e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function confirm(index: number) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setActivity("Confirming your charity");
    setNotice("");
    try {
      await persistEdits();
      const data = await post("confirm", {
        index,
        revision: currentState.current.revision,
      });
      accept(data);
      setReward({ title: "Charity confirmed", detail: data.state.charity.confirmed.name });
      setEditingComplete(false);
    } catch (e) {
      recover(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function changeCharity() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setActivity("Updating your charity selection");
    try {
      await persistEdits();
      const data = await post("edit", { fields: {}, clearCharity: true, revision: currentState.current.revision });
      accept(data);
      setQuery(""); setSearched(false); setReward(null);
    } catch (error) { recover(error); }
    finally { lock.current = false; setBusy(false); }
  }
  async function createAccount(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (!canCreateAccount(currentState.current)) {
      setAccountError("Complete your details and confirm the official charity record before creating your account.");
      return;
    }
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
          invitationToken: invitationTokenFromDestination(destination),
          name: currentState.current.facts.name.trim(),
          email: currentState.current.facts.email.trim().toLowerCase(),
          position: currentState.current.facts.role.trim(),
          organisation: currentState.current.facts.organisation.trim(),
          password,
          progress: {
            sessionId: crypto.randomUUID(),
            step: "scope",
            onboarding: {
              audience: readAudience(),
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
        if (previewEmailSandbox) {
          const inbox = await post("preview-inbox", {});
          if (typeof inbox.link === "string") setPreviewVerificationUrl(inbox.link);
        }
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
            setBusy(false);
          } else if (!controller.signal.aborted) {
            void start("conversation");
          }
          return;
        }
        // Resume a verified registration in the same browser without forcing an existing user to repeat onboarding.
        await post("complete", { fields: {} }).catch(() => undefined);
        if (!controller.signal.aborted) window.location.replace(destination);
      })
      .catch(() => {
        if (!controller.signal.aborted) void start("conversation");
      });
    return () => controller.abort();
    // Load once per destination. accept reads refs, not a captured state snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination]);
  const firstQuestion = audience === "charity"
    ? "Tell me about yourself and the charity you’d like to explore: your name, email and professional work."
    : audience === "adviser"
      ? "Tell me about yourself and your firm: your name, email and role. Which charity would you like to explore?"
      : "Tell me a little about yourself: your name, email and professional work. Which charity would you like to explore?";
  const question = !state.turns && !count
      ? firstQuestion
      : nextQuestion(state);
  const earlierHistory = history.at(-1)?.role === "assistant" ? history.slice(0, -1) : history;
  const visibleHistory = earlierHistory.filter((item, index) =>
    !(item.role === "assistant" && index === earlierHistory.length - 2 &&
      item.text.trim() === question.trim()));
  const charityLookup = (<>
                {!selected && (
                  <div className="charity-discovery">
                    <p>Separate from your employer. Find and confirm the charity you want to explore.</p>
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
                    <p>We confirm an official charity record so your saved work and report are attached to the right organisation. The public sample and free demo do not need confirmation.</p>
                    <div className="charity-search">
                      <label htmlFor="charity-lookup">
                        Charity name or registration number
                      </label>
                      <div>
                        <input
                          id="charity-lookup"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          maxLength={160}
                          placeholder="Name or registration number (for example 202918)"
                          onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void search(); } }}
                        />
                        <button type="button" disabled={busy || !query.trim()} onClick={() => void search()}>Find →</button>
                      </div>
                    </div>
                    <p>Names can be ambiguous. If a name fails, enter the charity’s registration number above. Your other details will stay in place.</p>
                    {searched && !candidates.length && (
                      <p>
                        No reliable registry match yet. Try the charity number
                        or a more specific name.
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
                          type="button"
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
  </>);
  function edit(key: EditableKey, value: string) {
    dirty.current[key] = value;
    replace(applyFacts(currentState.current, { [key]: value }, "form"));
    setEditVersion(v => v + 1);
  }
  return (
    <main id="main" className="onboarding-page">
      <div className="onboarding-shell">
        <div className="onboarding-heading">
          <h1>One account.<br className="mobile-break" /> All five tools<span>.</span></h1>
          <p>Talk to us and we’ll fill in the form as we go. Or complete it yourself.</p>
          {previewEmailSandbox && <p className="onboarding-preview-notice">Preview test accounts only: use an address ending @example.invalid. Verification uses a private test inbox, not real email.</p>}
          <div className="onboarding-entry">
            <div className="onboarding-modes" aria-label="How to complete your details">
              <button type="button" aria-pressed={mode === "conversation"} onClick={() => setMode("conversation")}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></svg>
                Talk to us
              </button>
              <button type="button" aria-pressed={mode === "form"} onClick={() => setMode("form")}>Fill in the form <Arrow diagonal /></button>
            </div>
            <p>Already registered? <Link href={`/login/?next=${encodeURIComponent(destination)}`}>Log in</Link></p>
          </div>
        </div>
        {notice && <p className="onboarding-notice" role="status">{notice}</p>}
        <div className={`onboarding-workspace mode-${mode}${profileOpen ? " profile-open" : ""}`}>
          <button type="button" className="onboarding-mobile-summary" aria-expanded={profileOpen || mode === "form"} aria-controls="onboarding-profile-form"
            onClick={() => { if (mode === "form") setMode("conversation"); else setProfileOpen(open => !open); }}>
            <span><strong>{count}/5 essentials</strong><span>{mode === "form" ? "Back to conversation ↑" : profileOpen ? "Close details ↑" : "Your live form ↓"}</span></span>
            <span className="mobile-profile-values">{fieldKeys.filter(key => state.facts[key]).map(key => <span key={key}>{state.facts[key]}</span>)}</span>
            {reward && <span className="mobile-profile-reward" role="status">✓ {reward.title}</span>}
          </button>
          <section className="onboarding-conversation" aria-label="Your introduction">
            <div className="conversation-topline"><span><i /> YOUR CONVERSATION</span><span>Talk. Type. Make it yours.</span></div>
            <div className="conversation-body">
              <div className="conversation-thread" ref={threadRef} role="log" aria-label="Your conversation" aria-live="polite">
                {visibleHistory.map((h, i) => <div key={i} className={`conversation-message history-${h.role}`}><small>{h.role === "user" ? "YOU" : "SORP 2026"}</small><p>{h.text}</p></div>)}
                {busy ? (
                  <div className="conversation-activity" role="status"><span className="activity-dots" aria-hidden="true"><i /><i /><i /></span><span>{activity}…</span></div>
                ) : (
                  <div className="conversation-question">
                    <span className="assistant-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" /></svg></span>
                    <div><p className="onboarding-eyebrow">SORP 2026</p><h2>{question}</h2></div>
                  </div>
                )}
              </div>
              {lookupSuggested && !selected && <button type="button" className="onboarding-charity-nudge" onClick={() => { setProfileOpen(true); document.getElementById("charity-lookup")?.focus(); }}>Find {query} in your form →</button>}
              <div className={`conversation-reward${reward ? " has-reward" : ""}`} role="status" aria-live="polite">
                {reward ? <><span className="reward-spark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5" /></svg></span><span><strong>{reward.title}</strong><small>{reward.detail}</small></span></> : <span>Your details stay editable.</span>}
              </div>
              {(!completed || editingComplete) && (
                <form onSubmit={e => void send(e)} className="onboarding-composer">
                  <label htmlFor="introduction-answer">Your answer</label>
                  <textarea ref={draftRef} id="introduction-answer" value={draft} onChange={e => setDraft(e.target.value)} rows={2} maxLength={3000}
                    placeholder="I’m Sarah, an accountant at…"
                    disabled={busy || ["recording", "transcribing", "permission"].includes(voice)} />
                  <div className="composer-bottom">
                    <VoiceInput disabled={busy} onState={setVoice} onTranscript={text => { setDraft(current => [current, text].filter(Boolean).join(" ").slice(0, 3000)); draftRef.current?.focus({ preventScroll: true }); }} />
                    <button className="onboarding-send" disabled={busy || !draft.trim() || ["recording", "transcribing", "permission"].includes(voice)}>{busy ? "Working…" : "Send"} <span aria-hidden="true">↑</span></button>
                  </div>
                </form>
              )}
              {!completed && !["registration", "charity"].includes(objective) && <button type="button" className="onboarding-skip" disabled={busy} onClick={() => void send(undefined, true)}>Skip this question</button>}
              {accountReady && <div className="onboarding-choice">
                <button type="button" className="onboarding-primary" disabled={busy} onClick={() => setAccountOpen(true)}>Get started →</button>
                {!completed && <button type="button" className="onboarding-text-button" disabled={busy} onClick={() => draftRef.current?.focus()}>Keep chatting ↓</button>}
                {completed && state.turns < TOTAL_TURN_CAP && <button type="button" className="onboarding-text-button" onClick={() => setEditingComplete(true)}>Anything to add?</button>}
              </div>}
            </div>
            <div className="conversation-footnote">Your introduction stays with your account. <Link href="/privacy/">Privacy</Link></div>
          </section>
          <aside className="onboarding-profile" aria-label="Your live editable profile">
            <div className="profile-heading"><div><p className="onboarding-eyebrow">YOUR LIVE FORM</p><h2>Taking shape<span>.</span></h2></div>
              <span key={count} className="profile-count" aria-label={`${count} of 5 required details completed`}>{count}<small>/5</small></span>
            </div>
            <div className="profile-progress" role="progressbar" aria-label="Required details" aria-valuenow={count} aria-valuemin={0} aria-valuemax={5}><span style={{ width: `${count * 20}%` }} /></div>
            <div className="profile-milestones" aria-hidden="true">{[...fieldKeys, "charity"].map((key, index) => <span key={key} className={(index < 4 ? fieldComplete(key as FieldKey) : !!selected) ? "achieved" : ""}>{index < 4 ? labels[key as FieldKey] : "Charity"}</span>)}</div>
            <form id="onboarding-profile-form" onSubmit={e => { e.preventDefault(); if (accountReady) setAccountOpen(true); }}>
              <fieldset>
                <legend>Your details <small>Five essentials</small></legend>
                <div className="profile-fields">
                  {fieldKeys.map((key, index) => <label className={`profile-field${changed.includes(key) ? " field-arrived" : ""}${state.facts[key] ? " has-value" : ""}`} key={key}>
                    <span><small>{String(index + 1).padStart(2, "0")}</small>{labels[key]}{fieldComplete(key) && <i aria-hidden="true">✓</i>}</span>
                    <input name={key} type={key === "email" ? "email" : "text"} autoComplete={autocomplete[key]} required minLength={key === "email" ? undefined : 2}
                      aria-invalid={key === "email" && !!state.facts.email && !validEmail(state.facts.email)}
                      maxLength={fieldLimit(key)} value={state.facts[key]} placeholder={key === "organisation" ? "Your professional employer" : labels[key]} onChange={e => edit(key, e.target.value)} />
                  </label>)}
                </div>
                <label className="onboarding-independent"><input type="checkbox" checked={state.facts.organisation === "Independent"} onChange={e => edit("organisation", e.target.checked ? "Independent" : "")} /> I work independently</label>
                <div className={`profile-charity${selected ? " charity-confirmed" : ""}`}>
                  <h3><small>05</small> Charity you’re enquiring about <span>{selected ? "✓" : "Required"}</span></h3>
                  {selected ? <div className="confirmed-charity">
                    <strong>{selected.name}</strong><p>Charity {selected.registrationNumber} · Confirmed</p>
                    <div className="charity-source-links">
                      {publicLink(selected.officialUrl) && <a href={publicLink(selected.officialUrl)} target="_blank" rel="noreferrer">Official record ↗</a>}
                      {publicLink(selected.website) && <a href={publicLink(selected.website)} target="_blank" rel="noreferrer">Website ↗</a>}
                      <button type="button" className="onboarding-text-button" disabled={busy} onClick={() => void changeCharity()}>Change charity</button>
                    </div>
                  </div> : charityLookup}
                </div>
              </fieldset>
              <fieldset className="profile-optional">
                <legend>A little more about you <small>Optional · {optionalCount}/3</small></legend>
                {optionalKeys.map((key, index) => <label key={key} className={`profile-field${changed.includes(key) ? " field-arrived" : ""}${state.facts[key] ? " has-value" : ""}`}>
                  <span><small>0{index + 6}</small>{labels[key]}{state.facts[key] && <i aria-hidden="true">✓</i>}</span>
                  <textarea name={key} rows={key === "concerns" ? 3 : 2} maxLength={fieldLimit(key)} value={state.facts[key]} placeholder="In your own words…" onChange={e => edit(key, e.target.value)} />
                </label>)}
              </fieldset>
              <div className="profile-next">
                <button type="submit" className="onboarding-primary" disabled={!accountReady || busy}>Get started <span>→</span></button>
                <p>{accountReady ? "Create your free account. No payment required." : "Complete the five essentials, including charity confirmation."}</p>
              </div>
            </form>
            <p className="profile-destination">Next: <strong>{product}</strong></p>
          </aside>
        </div>
        <footer className="onboarding-footer"><span>My Social Impact × The Ideas Shed</span><span>One account. Greater impact.</span></footer>
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
              {previewEmailSandbox ? "Check your test inbox," : "Check your inbox,"}
              <br />
              {state.facts.name.split(" ")[0]}.
            </h2>
            <p>
              {previewEmailSandbox ? "A verification message is saved in the private preview inbox for " : "Follow the verification link sent to "}
              <strong>{state.facts.email}</strong>, then sign in to continue to{" "}
              {product}.
            </p>
            {previewEmailSandbox && <p>No email has been sent. This account exists only in this preview.</p>}
            {previewVerificationUrl && <a className="onboarding-primary" href={previewVerificationUrl}>Open preview verification →</a>}
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
                minLength={8}
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <small>At least 8 characters. Kept out of the conversation.</small>
            <label>
              Confirm your password
              <input
                autoComplete="new-password"
                type="password"
                required
                minLength={8}
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
