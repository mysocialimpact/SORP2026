"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./director.module.css";
type Slot = { start: string; end: string };
export function DirectorBooking() {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState("");
  const [invitation, setInvitation] = useState(false);
  const [key, setKey] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const [discussion, setDiscussion] = useState("");
  const [details, setDetails] = useState({ name: "", email: "", organisation: "" });
  const panel = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const loading = useRef(false);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      panel.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      panel.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/booking/availability/?service=free", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          "We couldn’t check the calendar. Please retry or email marcus@mysocialimpact.org.",
        );
      setSlots(Array.isArray(data.slots) ? data.slots : []);
      setSelectedStart("");
      setKey(crypto.randomUUID());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
      loading.current = false;
    }
  }, []);
  const showBooking = useCallback(() => {
    setOpen(true);
    if (slots === null) void load();
  }, [slots, load]);
  useEffect(() => {
    window.addEventListener("director-booking-open", showBooking);
    return () => window.removeEventListener("director-booking-open", showBooking);
  }, [showBooking]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    void fetch("/api/readiness-account/", { cache: "no-store", signal: controller.signal })
      .then(async response => response.ok ? response.json() : null)
      .then(data => {
        if (!data?.signedIn || !data.account) return;
        setDetails(current => ({
          name: current.name || data.account.name || "",
          email: current.email || data.account.email || "",
          organisation: current.organisation || data.account.organisation || data.platformAccess?.memberships?.[0]?.name || "",
        }));
      }).catch(() => undefined);
    return () => controller.abort();
  }, [open]);
  async function book(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const res = await fetch("/api/booking/free/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fields.name,
          email: fields.email,
          organisation: fields.organisation,
          start: fields.start,
          evidence: `My Impact Director introduction: ${discussion.trim()}`.slice(0, 800),
          serviceId: "free",
          source: "my-impact-director",
          idempotencyKey: key,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || "Your meeting has not been booked. Please try again.",
        );
      setConfirmed(data.start);
      setInvitation(data.invitationSent === true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }
  const date = (start: string) =>
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/London",
    }).format(new Date(start));
  return (
    <section
      id="director-conversation"
      className={`${styles.booking}${open ? "" : ` ${styles.bookingClosed}`}`}
      aria-labelledby="director-booking-title"
    >
      <div>
        <p className={styles.kicker}>
          A human conversation. A useful first step.
        </p>
        <h2 id="director-booking-title">
          Let’s talk about
          <br />
          <em>your organisation.</em>
        </h2>
        <p>
          A free 10-minute introductory call. Bring your snapshot and agenda; we’ll explore whether a
          fuller conversation would help.
        </p>
        <button type="button" className={styles.primary} aria-expanded={open} aria-controls="director-booking-panel" onClick={showBooking}>Book a 10-minute chat →</button>
      </div>
      {open && <div ref={panel} id="director-booking-panel" className={styles.bookingPanel} tabIndex={-1} aria-label="Choose a time for your 10-minute chat">
        <div className={styles.bookingPanelTop}><strong>Choose a time · Europe/London</strong><button type="button" className={styles.textButton} onClick={() => setOpen(false)}>Close ×</button></div>
        {confirmed ? (
          <div role="status">
            <h3>You’re booked.</h3>
            <p>{date(confirmed)} · UK time</p>
            <p>
              {invitation
                ? "Your calendar invitation has been sent."
                : "Your booking is confirmed. Email invitation delivery has not been confirmed."}
            </p>
          </div>
        ) : slots ? (
          slots.length ? (
            <form onSubmit={book} className={styles.bookingForm}>
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={180}
                  value={details.name}
                  onChange={event => setDetails(value => ({ ...value, name: event.target.value }))}
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={details.email}
                  onChange={event => setDetails(value => ({ ...value, email: event.target.value }))}
                />
              </label>
              <label>
                Organisation
                <input
                  name="organisation"
                  autoComplete="organization"
                  required
                  maxLength={180}
                  value={details.organisation}
                  onChange={event => setDetails(value => ({ ...value, organisation: event.target.value }))}
                />
              </label>
              <label>
                What would you like to discuss?
                <textarea name="discussion" rows={3} maxLength={750} required placeholder="A sentence or two is plenty." value={discussion} onChange={event => setDiscussion(event.target.value)} />
              </label>
              <label>
                Choose a time · Europe/London
                <select
                  name="start"
                  required
                  value={selectedStart}
                  onChange={event => { setSelectedStart(event.target.value); setKey(crypto.randomUUID()); }}
                >
                  <option value="" disabled>
                    Select an available time
                  </option>
                  {slots.map((s) => (
                    <option key={s.start} value={s.start}>
                      {date(s.start)}
                    </option>
                  ))}
                </select>
              </label>
              <button className={styles.primary} disabled={busy}>
                {busy ? "Booking…" : "Book my free introduction ↗"}
              </button>
              <p className={styles.small}>
                Your contact details are used to arrange this meeting.{" "}
                <a href="/privacy/">Privacy information</a>
              </p>
            </form>
          ) : (
            <p>
              No introductory slots are available right now.{" "}
              <a href="mailto:marcus@mysocialimpact.org?subject=My%20Impact%20Director%20introduction">
                Email us to arrange a conversation.
              </a>
            </p>
          )
        ) : <p role="status">{busy ? "Checking Marcus’s calendar…" : "Choose a time when availability appears."}</p>}
        {error && (
          <p role="alert">
            {error}{" "}
            <button
              className={styles.textButton}
              onClick={() => void load()}
              disabled={busy}
            >
              Check times again
            </button>
          </p>
        )}
      </div>}
    </section>
  );
}
