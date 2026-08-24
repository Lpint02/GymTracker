/**
 * Pure utility functions shared across the application.
 * These are stateless helpers with no side effects.
 */

/**
 * Generate a short random alphanumeric ID.
 * Previously duplicated as a lambda inside App.tsx.
 */
export const generateId = (): string =>
  Math.random().toString(36).substring(2, 9);

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
