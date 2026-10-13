import { lookup } from "dns/promises";
import { isIP } from "net";

export class IntegrationError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

function privateAddress(ip: string) {
  if (ip === "::1" || ip === "::" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  const p = v4.split(".").map(Number);
  if (p.length !== 4) return false;
  return (
    p[0] === 10 || p[0] === 127 || p[0] === 0 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127)
  );
}

/**
 * Users type their own store URLs, so refuse anything that points inside our network
 * (cloud metadata, localhost, private ranges). ALLOW_PRIVATE_INTEGRATION_HOSTS=1 is for local testing only.
 */
export async function assertPublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new IntegrationError(`Invalid URL: ${raw}`);
  }
  if (process.env.ALLOW_PRIVATE_INTEGRATION_HOSTS === "1") return url;
  if (url.protocol !== "https:") throw new IntegrationError("Store URL must start with https://");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (!addresses.length) throw new IntegrationError(`Could not find ${host} — check the address`);
  if (addresses.some(privateAddress)) throw new IntegrationError("That address is not allowed");
  return url;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch with timeout, rate-limit retries and readable errors. Returns parsed JSON (or null for empty bodies). */
export async function requestJson<T = unknown>(url: string, init: RequestInit & { retries?: number } = {}): Promise<{ data: T; headers: Headers }> {
  await assertPublicUrl(url);
  const retries = init.retries ?? 3;
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(30_000) });
    } catch (e) {
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw new IntegrationError(`Could not reach ${new URL(url).host}: ${(e as Error).message}`);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const wait = Number(res.headers.get("retry-after"));
      await sleep(Math.min(10_000, Number.isFinite(wait) && wait > 0 ? wait * 1000 : 1500 * 2 ** attempt));
      continue;
    }
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) {
      const detail = typeof data === "string" ? data.slice(0, 200) : JSON.stringify(data).slice(0, 300);
      const hint = res.status === 401 || res.status === 403 ? " — check the credentials and API permissions" : "";
      throw new IntegrationError(`${new URL(url).host} returned ${res.status}${hint}: ${detail}`, res.status);
    }
    return { data: data as T, headers: res.headers };
  }
}

export function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
