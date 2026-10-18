"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Arrow } from "./ui";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type ManualMethod = "iphone" | "mac-safari" | "edge" | "android" | "desktop";

function manualMethod(): ManualMethod {
  const agent = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(agent)) return "iphone";
  if (/Macintosh/.test(agent) && /Safari/.test(agent) && !/Chrome|CriOS|Edg/.test(agent)) return "mac-safari";
  if (/Edg\//.test(agent)) return "edge";
  if (/Android/.test(agent)) return "android";
  return "desktop";
}

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function subscribeToInstallState(callback: () => void) {
  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => {
    displayMode.removeEventListener("change", callback);
    window.removeEventListener("appinstalled", callback);
  };
}

export function InstallApp() {
  const installedInBrowser = useSyncExternalStore(subscribeToInstallState, isInstalled, () => false);
  const [accepted, setAccepted] = useState(false);
  const [method, setMethod] = useState<ManualMethod>("desktop");
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as InstallPromptEvent;
    };
    const onInstalled = () => {
      promptRef.current = null;
      dialogRef.current?.close();
      setAccepted(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installation help remains available even if registration is blocked.
      });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    const event = promptRef.current;
    if (event) {
      promptRef.current = null;
      try {
        await event.prompt();
        const choice = await event.userChoice;
        if (choice.outcome === "accepted") setAccepted(true);
        return;
      } catch {
        // Some browsers withdraw a previously offered prompt. Show their manual route.
      }
    }
    setMethod(manualMethod());
    dialogRef.current?.showModal();
  }

  if (installedInBrowser || accepted) return null;

  return <>
    <button className="install-app-trigger" type="button" onClick={() => void install()}>
      Install <span>SORP 2026</span> <Arrow diagonal />
    </button>
    <dialog className="install-app-dialog" ref={dialogRef} aria-labelledby="install-app-title">
      <div className="install-app-dialog-heading">
        <span className="install-app-eyebrow">KEEP SORP 2026 CLOSE</span>
        <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close install instructions">×</button>
      </div>
      <h2 id="install-app-title">Install SORP 2026.</h2>
      {method === "iphone" ? <p>In Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. If you are in another browser, open this page in Safari first.</p> : null}
      {method === "mac-safari" ? <p>In Safari on macOS Sonoma or later, choose <strong>File → Add to Dock</strong>.</p> : null}
      {method === "edge" ? <p>In Edge, open the <strong>⋯</strong> menu, then choose <strong>Apps → Install this site as an app</strong>.</p> : null}
      {method === "android" ? <p>In Chrome, open the <strong>⋮</strong> menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p> : null}
      {method === "desktop" ? <p>Look for <strong>Install</strong> in your browser&apos;s address bar or menu. In Chrome, choose <strong>Install page as app</strong>.</p> : null}
      <p className="install-app-dialog-note">It will open in its own window. Your account and tools will still be available when you sign in.</p>
      <button className="install-app-done" type="button" onClick={() => dialogRef.current?.close()}>Got it</button>
    </dialog>
  </>;
}
