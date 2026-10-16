"use client";
import { useEffect, useRef, useState } from "react";
export type VoiceState =
  | "ready"
  | "permission"
  | "recording"
  | "transcribing"
  | "transcript"
  | "error";
/** Adapts SORP's existing MediaRecorder codec order, multipart contract and editable transcript. */
export function VoiceInput({
  disabled,
  onTranscript,
  onState,
}: {
  disabled: boolean;
  onTranscript: (text: string) => void;
  onState: (state: VoiceState) => void;
}) {
  const [state, setState] = useState<VoiceState>("ready"),
    [seconds, setSeconds] = useState(0),
    [error, setError] = useState(""),
    [canRetry, setCanRetry] = useState(false);
  const [levels, setLevels] = useState<number[]>(Array(18).fill(3));
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    audio = useRef<AudioContext | null>(null);
  const frame = useRef(0),
    timer = useRef<ReturnType<typeof setInterval> | null>(null),
    timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true),
    controller = useRef<AbortController | null>(null),
    retry = useRef<Blob | null>(null);
  function transition(next: VoiceState) {
    if (mounted.current) {
      setState(next);
      onState(next);
    }
  }
  function release() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    cancelAnimationFrame(frame.current);
    if (timer.current) clearInterval(timer.current);
    if (timeout.current) clearTimeout(timeout.current);
    void audio.current?.close().catch(() => undefined);
    audio.current = null;
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state === "recording") recorder.current.stop();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(frame.current);
      if (timer.current) clearInterval(timer.current);
      if (timeout.current) clearTimeout(timeout.current);
      void audio.current?.close().catch(() => undefined);
      retry.current = null;
    };
  }, []);
  async function transcribe(blob: Blob) {
    transition("transcribing");
    setError("");
    controller.current = new AbortController();
    const deadline = setTimeout(() => controller.current?.abort(), 30000);
    try {
      if (blob.size > 3_500_000)
        throw new Error(
          "That recording is too long. Please record a shorter answer.",
        );
      const form = new FormData();
      form.append(
        "audio",
        blob,
        blob.type.includes("mp4") ? "introduction.m4a" : "introduction.webm",
      );
      const response = await fetch("/api/onboarding/transcribe/", {
        method: "POST",
        body: form,
        signal: controller.current.signal,
      });
      const result = await response.json();
      if (
        !response.ok ||
        typeof result.transcript !== "string" ||
        !result.transcript.trim()
      )
        throw new Error(
          result.error ||
            "We couldn’t hear enough to transcribe. Please retry or type your answer.",
        );
      if (mounted.current) {
        onTranscript(result.transcript.slice(0, 3000));
        retry.current = null;
        setCanRetry(false);
        transition("transcript");
      }
    } catch (e) {
      if (mounted.current) {
        setError(
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : "Transcription timed out. Retry or type your answer.",
        );
        transition("error");
      }
    } finally {
      clearTimeout(deadline);
    }
  }
  function stop() {
    if (recorder.current?.state === "recording") {
      recorder.current.stop();
      release();
    }
  }
  async function start() {
    setError("");
    transition("permission");
    retry.current = null;
    setCanRetry(false);
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "This browser cannot record audio. You can still type your answer.",
        );
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const preferred = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const current = preferred
        ? new MediaRecorder(media, {
            mimeType: preferred,
            audioBitsPerSecond: 48000,
          })
        : new MediaRecorder(media);
      recorder.current = current;
      const chunks: Blob[] = [];
      let bytes = 0;
      current.ondataavailable = (e) => {
        if (e.data.size) {
          chunks.push(e.data);
          bytes += e.data.size;
          if (bytes > 3_300_000) stop();
        }
      };
      current.onstop = () => {
        const blob = new Blob(chunks, {
          type: current.mimeType || preferred || "audio/webm",
        });
        release();
        retry.current = blob;
        setCanRetry(true);
        if (mounted.current) void transcribe(blob);
      };
      current.onerror = () => {
        current.onstop = null;
        release();
        setError("Recording stopped unexpectedly. Please try again.");
        transition("error");
      };
      const context = new AudioContext();
      audio.current = context;
      await context.resume();
      const analyser = context.createAnalyser();
      analyser.fftSize = 128;
      context.createMediaStreamSource(media).connect(analyser);
      // A short audible activation cue. The waveform itself uses real microphone samples.
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      oscillator.frequency.value = 620;
      gain.gain.setValueAtTime(0.025, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.09);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.09);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let last = 0;
      const draw = (time: number) => {
        if (time - last > 70) {
          analyser.getByteFrequencyData(data);
          setLevels(
            Array.from({ length: 18 }, (_, i) => 3 + (data[i * 2] / 255) * 32),
          );
          last = time;
        }
        frame.current = requestAnimationFrame(draw);
      };
      frame.current = requestAnimationFrame(draw);
      current.start(250);
      setSeconds(0);
      transition("recording");
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      timeout.current = setTimeout(stop, 90000);
    } catch (e) {
      release();
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone access was declined. Allow it in your browser settings, or type below."
          : e instanceof Error
            ? e.message
            : "We couldn’t open your microphone.",
      );
      transition("error");
    }
  }
  return (
    <div className={`onboarding-voice voice-${state}`}>
      <div className="voice-controls">
        <button
          type="button"
          className="voice-button"
          aria-label={
            state === "recording" ? "Stop recording" : "Record your answer"
          }
          aria-pressed={state === "recording"}
          disabled={
            disabled || state === "permission" || state === "transcribing"
          }
          onClick={state === "recording" ? stop : () => void start()}
        >
          {state === "recording" ? (
            <span className="stop-icon" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="9" y="2" width="6" height="13" rx="3" />
              <path d="M5 10v2a7 7 0 0014 0v-2M12 19v3m-4 0h8" />
            </svg>
          )}
        </button>
        <div className="voice-description" role="status">
          {state === "recording" ? (
            <>
              <strong>
                Listening · {Math.floor(seconds / 60)}:
                {String(seconds % 60).padStart(2, "0")}
              </strong>
              <span>Tap the square when you’re ready</span>
            </>
          ) : state === "transcribing" ? (
            <>
              <strong>Turning your voice into words</strong>
              <span>You’ll be able to edit before sending</span>
            </>
          ) : state === "permission" ? (
            <>
              <strong>Opening your microphone</strong>
              <span>Allow access in your browser</span>
            </>
          ) : state === "transcript" ? (
            <>
              <strong>Your words, ready to review</strong>
              <span>Edit below, then press Send</span>
            </>
          ) : (
            <>
              <strong>Prefer to talk?</strong>
              <span>Record, review, then send</span>
            </>
          )}
        </div>
        {(state === "recording" || state === "transcribing") && (
          <div className="voice-wave" aria-hidden="true">
            {levels.map((height, i) => (
              <i
                key={i}
                style={{
                  height: state === "recording" ? height : 14,
                  animationDelay: `${i * 55}ms`,
                }}
              />
            ))}
          </div>
        )}
      </div>
      {error && (
        <div className="voice-error" role="alert">
          {error}{" "}
          {canRetry && (
            <button
              type="button"
              onClick={() => void transcribe(retry.current!)}
            >
              Retry transcription
            </button>
          )}
        </div>
      )}
    </div>
  );
}
