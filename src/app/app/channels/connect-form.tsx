"use client";

import { useState } from "react";
import { ActionForm, Submit } from "@/components/action-form";
import type { CredentialField } from "@/lib/integrations/types";
import { connectChannel } from "./connection-actions";

export type ProviderInfo = { provider: string; name: string; setup: string[]; fields: CredentialField[] };

export function ConnectForm({ channelId, providers, current, saved }: {
  channelId: string;
  providers: ProviderInfo[];
  current?: string;
  /** Non-secret saved values, for editing an existing connection. */
  saved?: Record<string, string>;
}) {
  const [provider, setProvider] = useState(current ?? providers[0]?.provider);
  const info = providers.find((p) => p.provider === provider) ?? providers[0];
  const editing = !!current && current === provider;
  return (
    <ActionForm action={connectChannel} className="space-y-3">
      <input type="hidden" name="channelId" value={channelId} />
      {providers.length > 1 ? (
        <div>
          <label className="label">Platform</label>
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => (
              <label key={p.provider} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${provider === p.provider ? "border-brand-600 bg-brand-50 font-medium text-brand-700" : "border-slate-300"}`}>
                <input type="radio" name="provider" value={p.provider} className="sr-only" checked={provider === p.provider} onChange={() => setProvider(p.provider)} />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      ) : <input type="hidden" name="provider" value={info.provider} />}

      <details className="rounded-lg bg-slate-50 p-3 text-sm" open={!editing}>
        <summary className="cursor-pointer font-medium">How to get your {info.name} credentials</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600">{info.setup.map((s) => <li key={s}>{s}</li>)}</ol>
      </details>

      <div className="grid gap-3 sm:grid-cols-2">
        {info.fields.map((f) => (
          <div key={`${info.provider}-${f.key}`}>
            <label className="label" htmlFor={`f_${f.key}`}>{f.label}{f.optional ? " (optional)" : ""}</label>
            {f.type === "select" ? (
              <select id={`f_${f.key}`} name={`f_${f.key}`} className="input" defaultValue={editing ? saved?.[f.key] : undefined}>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input
                id={`f_${f.key}`}
                name={`f_${f.key}`}
                className="input font-mono text-xs"
                type={f.type === "password" ? "password" : "text"}
                autoComplete="off"
                required={!f.optional && !(editing && f.type === "password")}
                placeholder={editing && f.type === "password" ? "•••••• saved — leave blank to keep" : f.placeholder}
                defaultValue={editing && f.type !== "password" ? saved?.[f.key] : undefined}
              />
            )}
            {f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">Credentials are encrypted before they are stored and are only used to sync this channel.</p>
      <Submit>{editing ? "Test & save" : `Test & connect ${info.name}`}</Submit>
    </ActionForm>
  );
}
