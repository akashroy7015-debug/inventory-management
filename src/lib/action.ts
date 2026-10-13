import { StockError } from "./stock";

export type ActionState = { error?: string; ok?: string; at?: number } | undefined;

/** Wraps a server action so expected errors come back as form messages instead of crashes. */
export function formAction(fn: (fd: FormData) => Promise<string | void>) {
  return async (_prev: ActionState, fd: FormData): Promise<ActionState> => {
    try {
      const ok = await fn(fd);
      return { ok: ok || "Saved", at: Date.now() };
    } catch (e) {
      // redirect()/notFound() throw special errors that must propagate.
      if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
      if (e instanceof Error) {
        if (!(e instanceof StockError)) console.error(e);
        return { error: prismaFriendly(e.name === "ZodError" ? zodMessage(e) : e.message), at: Date.now() };
      }
      return { error: "Something went wrong", at: Date.now() };
    }
  };
}

function zodMessage(e: Error) {
  try {
    const issues = JSON.parse(e.message) as { path: string[]; message: string }[];
    return issues.map((i) => `${i.path.join(".") || "value"}: ${i.message}`).join("; ");
  } catch {
    return e.message;
  }
}

function prismaFriendly(msg: string) {
  if (msg.includes("Unique constraint")) return "That value already exists — codes and names must be unique.";
  return msg.length > 300 ? "Something went wrong. Please check your input." : msg;
}

export function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(fd: FormData, key: string) {
  return str(fd, key) || null;
}

export function optNum(fd: FormData, key: string) {
  const v = str(fd, key);
  if (v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new StockError(`${key} must be a number`);
  return n;
}

export function optDate(fd: FormData, key: string) {
  const v = str(fd, key);
  return v ? new Date(v) : null;
}
