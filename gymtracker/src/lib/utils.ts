/**
 * Pure utility functions shared across the application.
 * These are stateless helpers with no side effects.
 */

/**
 * Generate a v4 UUID for a new entity (session, exercise, set, favorite).
 *
 * IDs are generated on the client, never by the server, because the app writes
 * offline and must know an entity's id before it has ever seen the network.
 * That is also what makes sync retries safe: every push is an upsert keyed by
 * this id, so replaying the same operation converges on the same row instead of
 * creating a duplicate.
 *
 * This replaced `Math.random().toString(36).substring(2, 9)` — 7 base-36 chars,
 * ~78 billion values. Over years of logging, a user generates on the order of
 * 10^5 set ids, which by the birthday bound is a percent-level chance of a
 * collision — and a collision here means one set silently overwriting another
 * on upsert. It was also not a UUID, which a Postgres `uuid` column rejects.
 *
 * The `getRandomValues` fallback is not theoretical: `crypto.randomUUID` is
 * unavailable in insecure contexts, and `npm run dev:host` serves the app over
 * plain http://<lan-ip> for phone testing. `getRandomValues` is available there.
 */
export const generateId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

  return (
    hex.slice(0, 8) + "-" +
    hex.slice(8, 12) + "-" +
    hex.slice(12, 16) + "-" +
    hex.slice(16, 20) + "-" +
    hex.slice(20)
  );
};

/**
 * Grouping key for a free-text name (exercise, muscle group, routine).
 *
 * Names are free text by design — there is no enum of exercises — so "Panca
 * Piana", "panca piana" and " Panca Piana " all have to count as the same
 * exercise when computing PRs, progress and favorites. This is that rule.
 *
 * It pairs with `displayLabel`: group by the KEY, show the LABEL. Mixing the
 * two up is how a PR badge silently disappears, because a map keyed by one
 * gets looked up with the other.
 *
 * The database enforces the same rule independently, via the generated
 * `label_key`/`name_key` columns on the favorites tables.
 */
export const normalizeKey = (name: string): string =>
  name.trim().toLowerCase();

/**
 * The form of a name that is shown to the user: trimmed, original casing kept.
 *
 * Casing is never corrected automatically — the user's own spelling of an
 * exercise is theirs to keep.
 */
export const displayLabel = (name: string): string => name.trim();

/**
 * Look a value up in a map keyed by display label, using any casing of the name.
 *
 * Needed because the two conventions coexist by design: `sessionPRs` is keyed
 * by normalized key (a consumer only has that session's own casing on hand),
 * while `currentPRsByExercise` is keyed by the canonical label (the casing of
 * the exercise's first-ever occurrence). A consumer holding "panca piana"
 * cannot index the second one directly.
 */
export const findByName = <T>(
  byLabel: Record<string, T>,
  name: string
): T | undefined => {
  const direct = byLabel[displayLabel(name)];
  if (direct !== undefined) return direct;

  const key = normalizeKey(name);
  for (const label of Object.keys(byLabel)) {
    if (normalizeKey(label) === key) return byLabel[label];
  }
  return undefined;
};

/**
 * Return today's date in ISO format (YYYY-MM-DD).
 */
export const getTodayISO = (): string => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Return the Monday (YYYY-MM-DD) of the solar week containing the given date.
 */
export const getMondayOfWeek = (dateStr: string): string => {
  const parts = dateStr.split("-");
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setDate(date.getDate() + diffToMonday);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Number of whole days between an ISO date string (YYYY-MM-DD) and today.
 */
export const daysSince = (dateStr: string): number => {
  const parts = dateStr.split("-");
  const past = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  past.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - past.getTime()) / 86400000);
};

/**
 * Format an ISO date string (YYYY-MM-DD) in Italian locale.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param format  - "short" → "Lun 12 Lug 2026" (dashboard cards)
 *                  "long"  → "lunedì 12 luglio 2026" (session header, modal)
 */
export const formatDateItalian = (
  dateStr: string,
  format: "short" | "long" = "short"
): string => {
  try {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;

    const year = parts[0];
    const monthNum = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(Number(year), monthNum, day);

    if (format === "long") {
      return dateObj.toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    // "short" format with capitalized first letters
    const weekday = dateObj.toLocaleDateString("it-IT", { weekday: "short" });
    const month = dateObj.toLocaleDateString("it-IT", { month: "short" });

    const formattedWeekday =
      weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const formattedMonth = month.charAt(0).toUpperCase() + month.slice(1);

    return `${formattedWeekday} ${day} ${formattedMonth} ${year}`;
  } catch {
    return dateStr;
  }
};
