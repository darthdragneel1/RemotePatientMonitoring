/**
 * Date formatting utilities for calendar dates (such as Date of Birth)
 * that should not shift due to local browser timezone offsets.
 */

/**
 * Format a calendar date string (e.g. "2026-03-27" or "2026-03-27T00:00:00.000Z")
 * into a localized display string (e.g. "3/27/2026") in UTC without timezone drift.
 */
export function formatDob(dob: string | null | undefined): string {
  if (!dob) return "—";

  // If formatted as ISO or YYYY-MM-DD, extract the date portion directly
  const datePart = dob.split("T")[0];
  const parts = datePart.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (!isNaN(m) && !isNaN(d) && year) {
      return `${m}/${d}/${year}`;
    }
  }

  const date = new Date(dob);
  if (isNaN(date.getTime())) return dob;
  return date.toLocaleDateString("en-US", { timeZone: "UTC" });
}

/**
 * Extract "YYYY-MM-DD" from an ISO date string or date value for HTML `<input type="date">`.
 */
export function toDateInputValue(dob: string | null | undefined): string {
  if (!dob) return "";
  const datePart = dob.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }
  const d = new Date(dob);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

/**
 * Convert an `<input type="date">` value ("YYYY-MM-DD") to a UTC ISO string ("YYYY-MM-DDT00:00:00.000Z")
 * or `null` if empty, ensuring it is stored deterministically without timezone shifts.
 */
export function toDobIsoString(dateInput: string | null | undefined): string | null {
  if (!dateInput || !dateInput.trim()) return null;
  const clean = dateInput.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return `${clean}T00:00:00.000Z`;
  }
  if (clean.includes("T")) {
    return clean;
  }
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
