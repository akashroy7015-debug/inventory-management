"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

const PendingContext = createContext<boolean | null>(null);

export function ActionForm({ action, children, className, reset = false, onDone }: {
  action: Action; children: ReactNode; className?: string; reset?: boolean; onDone?: (s: ActionState) => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && reset) ref.current?.reset();
    if (state) onDone?.(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.at]);
  return (
    <PendingContext.Provider value={pending}>
      {/* Submitting via onSubmit (not the action prop) stops React from clearing the fields,
          so a failed submit keeps what the user typed. */}
      <form
        ref={ref}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
        <FormMessage state={state} />
      </form>
    </PendingContext.Provider>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error) return <p className="mt-2 whitespace-pre-line rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>;
  if (state.ok) return <p className="mt-2 whitespace-pre-line rounded-md bg-green-50 px-3 py-2 text-sm text-green-800" role="status">{state.ok}</p>;
  return null;
}

export function Submit({ children, className = "btn btn-primary", confirm }: { children: ReactNode; className?: string; confirm?: string }) {
  const fromForm = useContext(PendingContext);
  const { pending: fromStatus } = useFormStatus();
  const pending = fromForm ?? fromStatus;
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
