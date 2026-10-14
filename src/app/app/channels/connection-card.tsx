import type { Channel, ChannelConnection, Location, SyncLog } from "@prisma/client";
import { RefreshCw, Upload, Link2 } from "lucide-react";
import { CONNECTORS, providersFor } from "@/lib/integrations";
import { decryptJson } from "@/lib/integrations/crypto";
import type { ConnectionSettings } from "@/lib/integrations/sync";
import { dateTime, label } from "@/lib/format";
import { ActionForm, Submit } from "@/components/action-form";
import { Badge, Card } from "@/components/ui";
import { ConnectForm, type ProviderInfo } from "./connect-form";
import { disconnectChannel, runSyncNow, saveConnectionSettings } from "./connection-actions";

export function ConnectionCard({ channel, connection, logs, locations, canEdit }: {
  channel: Channel;
  connection: ChannelConnection | null;
  logs: SyncLog[];
  locations: Location[];
  canEdit: boolean;
}) {
  const providers: ProviderInfo[] = providersFor(channel.type).map((p) => {
    const c = CONNECTORS[p];
    return { provider: p, name: c.name, setup: c.setup, fields: c.fields };
  });
  if (!providers.length) {
    return (
      <Card title="Live connection">
        <p className="text-sm text-slate-600">{label(channel.type)} has no public seller API, so use order-report import and stock-file export below.</p>
      </Card>
    );
  }
  if (!connection) {
    return (
      <Card title={<span className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Connect your {channel.name} account</span>}>
        <p className="mb-4 text-sm text-slate-600">Connect once and orders flow in automatically, while stock levels are pushed back every time they change — no more file uploads.</p>
        {canEdit ? <ConnectForm channelId={channel.id} providers={providers} /> : <p className="text-sm text-slate-500">Ask an owner or admin to connect this channel.</p>}
      </Card>
    );
  }

  const conn = CONNECTORS[connection.provider];
  const settings = (connection.settings ?? {}) as ConnectionSettings;
  let saved: Record<string, string> = {};
  try {
    const creds = decryptJson<Record<string, string>>(connection.credentials);
    saved = Object.fromEntries(conn.fields.filter((f) => f.type !== "password").map((f) => [f.key, creds[f.key] ?? ""]));
  } catch {
    // Unreadable (key rotated) — user re-enters credentials.
  }
  const syncButton = (kind: string, text: string, Icon: typeof RefreshCw) => (
    <ActionForm action={runSyncNow}>
      <input type="hidden" name="channelId" value={channel.id} />
      <input type="hidden" name="kind" value={kind} />
      <Submit className="btn btn-sm"><Icon className="h-3.5 w-3.5" /> {text}</Submit>
    </ActionForm>
  );

  return (
    <Card
      title={<span className="flex items-center gap-2"><Link2 className="h-4 w-4" /> {conn.name}</span>}
      actions={<Badge tone={connection.status === "CONNECTED" ? "green" : "red"}>{connection.status === "CONNECTED" ? "Connected" : "Needs attention"}</Badge>}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 text-sm">
          <div><span className="text-slate-500">Account:</span> {connection.accountName ?? "—"}</div>
          <div><span className="text-slate-500">Orders last synced:</span> {dateTime(connection.lastOrderSyncAt)}</div>
          <div><span className="text-slate-500">Stock last pushed:</span> {dateTime(connection.lastStockSyncAt)}</div>
          {connection.lastError && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{connection.lastError}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            {syncButton("orders", "Sync orders now", RefreshCw)}
            {syncButton("stock", "Push all stock now", Upload)}
            {syncButton("listings", "Match listings", Link2)}
          </div>
        </div>
        {canEdit && (
          <ActionForm action={saveConnectionSettings} className="space-y-2 text-sm">
            <input type="hidden" name="channelId" value={channel.id} />
            <label className="flex items-center gap-2"><input type="checkbox" name="autoImportOrders" defaultChecked={connection.autoImportOrders} /> Import new orders automatically</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="autoPushStock" defaultChecked={connection.autoPushStock} /> Update {channel.name} stock automatically</label>
            {connection.provider === "AMAZON" && (
              <div>
                <label className="label">Amazon FBA orders deduct stock from</label>
                <select name="fbaLocationId" className="input" defaultValue={settings.fbaLocationId ?? ""}>
                  <option value="">Don&apos;t import FBA orders</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
            <Submit className="btn btn-sm">Save sync settings</Submit>
          </ActionForm>
        )}
      </div>

      {logs.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-lg border border-slate-100">
          <table className="table text-xs">
            <thead><tr><th>When</th><th>Type</th><th>Result</th></tr></thead>
            <tbody>{logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-slate-500">{dateTime(l.startedAt)}</td>
                <td>{label(l.kind)}</td>
                <td>
                  <span className={l.ok ? "text-slate-700" : "text-red-700"}>{l.summary}</span>
                  {l.details && <details><summary className="cursor-pointer text-slate-500">Details</summary><pre className="whitespace-pre-wrap text-slate-600">{l.details}</pre></details>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <div className="mt-5 flex flex-wrap items-start gap-3 border-t border-slate-100 pt-4">
          <details className="flex-1">
            <summary className="cursor-pointer text-sm font-medium text-brand-700">Update credentials</summary>
            <div className="mt-3"><ConnectForm channelId={channel.id} providers={providers} current={connection.provider} saved={saved} /></div>
          </details>
          <ActionForm action={disconnectChannel}>
            <input type="hidden" name="channelId" value={channel.id} />
            <Submit className="btn btn-sm btn-danger" confirm="Disconnect and delete the saved credentials?">Disconnect</Submit>
          </ActionForm>
        </div>
      )}
    </Card>
  );
}
