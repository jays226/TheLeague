import crypto from "node:crypto";

export const leagueCookieName = "league_access";
export const adminCookieName = "league_admin";

export function createId() {
  return crypto.randomUUID();
}

export function createAccessToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function createAdminSessionValue(password: string) {
  return crypto.createHash("sha256").update(`league-admin:${password}`).digest("hex");
}
