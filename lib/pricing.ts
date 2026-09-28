export type PlayerType = "social" | "general";

// Oct 4 is still daylight time in Virginia; the cutoff is midnight at the
// start of Oct 5 (exclusive), which includes 11:59 PM EDT on Oct 4.
const SOCIAL_DISCOUNT_DEADLINE = new Date("2026-10-05T00:00:00-04:00");

export function isSocialDiscountActive(at = new Date()) {
  return at < SOCIAL_DISCOUNT_DEADLINE;
}

export function getPlayerFeeCents(type: PlayerType, at = new Date()) {
  return type === "social" && isSocialDiscountActive(at) ? 500 : 1500;
}
