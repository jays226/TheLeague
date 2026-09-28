export type PlayerType = "social" | "general";

// Oct 5 is still daylight time in Virginia; the cutoff is midnight at the
// start of Oct 6 (exclusive), which includes 11:59 PM EDT on Oct 5.
const SOCIAL_DISCOUNT_DEADLINE = new Date("2026-10-06T00:00:00-04:00");

export function isSocialDiscountActive(at = new Date()) {
  return at < SOCIAL_DISCOUNT_DEADLINE;
}

export function getPlayerFeeCents(type: PlayerType, at = new Date()) {
  return type === "social" && isSocialDiscountActive(at) ? 500 : 1500;
}
