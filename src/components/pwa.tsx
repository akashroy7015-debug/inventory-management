"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Download, Share, X } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// The browser fires `beforeinstallprompt` once, often before the button that uses it mounts,
// so it is captured here at module level and shared through a tiny store.
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as InstallPromptEvent; emit(); });
  window.addEventListener("appinstalled", () => { deferred = null; emit(); });
}

/** Registers the service worker in production builds. Rendered once in the root layout. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** "Install app" button: uses the browser's install prompt, or shows Add-to-Home-Screen steps on iPhone/iPad. */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const prompt = useSyncExternalStore(subscribe, () => deferred, () => null);
  const mode = useSyncExternalStore(
    subscribe,
    () => (isStandalone() ? "installed" : isIos() ? "ios" : "web"),
    () => "installed",
  );
  const [showIos, setShowIos] = useState(false);

  if (mode === "installed" || (mode === "web" && !prompt)) return null;

  const onClick = async () => {
    if (mode === "ios") return setShowIos(true);
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice.catch(() => null);
    deferred = null;
    emit();
  };

  return (
    <>
      <button type="button" onClick={onClick} className={className}>
        <Download className="h-4 w-4" aria-hidden="true" /> Install app
      </button>
      {/* Portalled to <body>: a blurred/sticky ancestor would otherwise trap a fixed overlay inside it. */}
      {showIos && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="ios-install-title" onClick={() => setShowIos(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-ink shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h2 id="ios-install-title" className="font-display text-lg font-bold">Add StockHub to your Home Screen</h2>
              <button type="button" onClick={() => setShowIos(false)} className="-m-2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-500" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <ol className="mt-3 space-y-3 text-sm text-muted">
              <li className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">1</span><span>Tap <Share className="inline h-4 w-4 align-[-3px] text-ink" aria-label="Share" /> <strong className="text-ink">Share</strong> in Safari’s toolbar.</span></li>
              <li className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">2</span><span>Choose <strong className="text-ink">Add to Home Screen</strong>.</span></li>
              <li className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">3</span><span>Tap <strong className="text-ink">Add</strong> — StockHub then opens full-screen like an app.</span></li>
            </ol>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
