"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

export function ActionForm({ action, children, className, reset = false, onDone }: {
  action: Action; children: ReactNode; className?: string; reset?: boolean; onDone?: (s: ActionState) => void;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && reset) ref.current?.reset();
    if (state) onDone?.(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.at]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <FormMessage state={state} />
    </form>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error) return <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>;
  if (state.ok) return <p className="mt-2 whitespace-pre-line rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{state.ok}</p>;
  return null;
}

export function Submit({ children, className = "btn btn-primary", confirm }: { children: ReactNode; className?: string; confirm?: string }) {
  const { pending } = useFormStatus();
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
