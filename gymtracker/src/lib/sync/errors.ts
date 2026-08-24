import { InvalidSessionError } from "./mappers";

/**
 * How a failed sync operation should be treated.
 *
 * Getting this classification right is what keeps the queue healthy. Retrying
 * everything forever poisons it; retrying nothing loses data on a flaky
 * connection. The four cases are genuinely different.
 */
export type FailureKind =
  /** Network or server hiccup. Back off and retry. */
  | "transient"
  /** Expired token. Refresh once and retry WITHOUT burning an attempt. */
  | "auth"
  /** The server already agrees with us. Treat as success and dequeue. */
  | "converged"
  /** Client/schema mismatch. Park it — retrying cannot help. */
  | "permanent";

interface SupabaseLikeError {
  code?: string;
  status?: number;
  message?: string;
}

const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export function classifyError(
  error: unknown,
  /**
   * What the operation was trying to do. Required because "the server already
   * agrees" is only a meaningful reading for some failures — see the 404 case.
   */
  op: "upsert" | "delete"
): FailureKind {
  // Caught before the network, so it can never be anything but permanent.
  if (error instanceof InvalidSessionError) return "permanent";

  const err = (error ?? {}) as SupabaseLikeError;
  const code = err.code ?? "";
  const status = err.status ?? 0;
  const message = (err.message ?? String(error)).toLowerCase();

  // fetch() rejects with a TypeError when the request never reached a server.
  if (
    error instanceof TypeError ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("timeout")
  ) {
    return "transient";
  }

  if (status === 401 || code === "PGRST301" || message.includes("jwt expired")) {
    return "auth";
  }

  // A favorite that already exists means the server is in the state we wanted.
  if (code === "23505") return "converged";

  // A 404 counts as "already gone" ONLY for a delete. Treating every 404 that
  // way is a trap: PGRST202 (missing RPC) and a wrong URL are also 404-shaped,
  // and swallowing those would silently discard a workout that exists nowhere
  // else. Caught in testing, when a routine push hit an RPC that had not been
  // deployed yet — exactly the case that must NOT look like success.
  if (status === 404 && op === "delete" && code !== "PGRST202") {
    return "converged";
  }

  if (TRANSIENT_STATUS.has(status)) return "transient";

  // 42501 (RLS/grant denial), 22P02 (bad input syntax), 23502 (not-null),
  // 23503 (foreign key), 23514 (check constraint), 400 in general. All mean the
  // request is wrong, not unlucky — exactly the drift this untyped codebase can
  // produce. Park them so one bad row cannot stall everything behind it.
  return "permanent";
}

/**
 * Exponential backoff with jitter.
 *
 * Jitter matters even for a single-user app: without it, several operations
 * queued during the same outage would all come due at the same instant and
 * retry in a burst against a server that may still be struggling.
 */
export function backoffDelayMs(attempts: number): number {
  const base = Math.min(30_000 * 2 ** Math.max(0, attempts - 1), 30 * 60_000);
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return Math.round(base + jitter);
}

export const MAX_ATTEMPTS = 8;

export function describeError(error: unknown): { code: string; message: string } {
  const err = (error ?? {}) as SupabaseLikeError;
  return {
    code: err.code ?? (err.status ? String(err.status) : "unknown"),
    message: err.message ?? String(error),
  };
}
