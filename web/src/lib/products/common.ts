// Small server-side helpers shared by service.ts (products) and prices-service.ts (prices),
// so the two files never import each other.

/** Soft delete rule (same as customers and products): a row is deleted when its stamp starts with "DELETE" (the S2-DBA-04 trigger writes "DELETE <who> <when>"; the prefix also covers older "DELETED" stamps). */
export const isDeleted = (stamp: string | null | undefined) => /^DELETE/i.test(stamp ?? '');

/** PostgREST filter for "not soft-deleted". Keeps rows whose stamp is NULL (a plain NOT ILIKE would drop them). */
export const NOT_DELETED = 'stamp.is.null,stamp.not.ilike.DELETE%';

/** "Today" in Manila, so a price effective today shows up at midnight local time, not at 8 AM (UTC). */
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD