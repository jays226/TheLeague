import crypto from "node:crypto";

export const leagueCookieName = "league_access";
export const adminCookieName = "league_admin";
export const adminSessionLifetimeSeconds = 60 * 60 * 8;

export function createId() {
  return crypto.randomUUID();
}

export function createAccessToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function createAdminSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashAdminSessionToken(token: string) {
  return crypto.createHash("sha256").update(`league-admin-session:${token}`).digest("hex");
}

export function createPasswordResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(`league-password-reset:${token}`).digest("hex");
}
