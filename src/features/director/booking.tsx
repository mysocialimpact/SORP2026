"use client";
import { useState } from "react";
import styles from "./director.module.css";
type Slot = { start: string; end: string };
export function DirectorBooking() {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState("");
  const [invitation, setInvitation] = useState(false);
  const [key, setKey] = useState("");
  async function load() {
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
      setSlots(data.slots);
      setKey(crypto.randomUUID());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function book(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const res = await fetch("/api/booking/free/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...fields,
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
      className={styles.booking}
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
          A free 10-minute introductory call through our existing booking
          service. Bring your snapshot and agenda; we’ll explore whether a
          fuller conversation would help.
        </p>
        <p>
          Personalised support is agreed with you. No subscription or payment is
          required here.
        </p>
      </div>
      <div>
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
                />
              </label>
              <label>
                Organisation
                <input
                  name="organisation"
                  autoComplete="organization"
                  required
                  maxLength={180}
                />
              </label>
              <label>
                Choose a time · Europe/London
                <select
                  name="start"
                  required
                  defaultValue=""
                  onChange={() => setKey(crypto.randomUUID())}
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
        ) : (
          <button
            className={styles.primary}
            onClick={() => void load()}
            disabled={busy}
          >
            {busy
              ? "Checking the calendar…"
              : "See introductory meeting times ↗"}
          </button>
        )}
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
      </div>
    </section>
  );
}
