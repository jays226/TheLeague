"use server";

import { hashPassword } from "@/lib/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  approveReservation,
  approveTeamPayment,
  clearRecentAdminLoginFailures,
  createTeamByAdmin,
  createAdminSession,
  deleteTeamByAdmin,
  deleteAdminSession,
  getTeamById,
  getAdminSession,
  isAdminLoginRateLimited,
  moveTeamReservation,
  purgeExpiredAdminSessions,
  recordAdminLoginFailure,
  rejectReservation,
  savePlayoffSeedOverrides,
  saveLeagueGameResult,
  setTeamWaitlistStatus,
  updateTeamByAdmin
} from "@/lib/db";
import { sendPaymentApprovedEmail } from "@/lib/email-notifications";
import { env } from "@/lib/env";
import {
  adminCookieName,
  adminSessionLifetimeSeconds,
  createAccessToken,
  createAdminSessionToken,
  createId,
  hashAdminSessionToken
} from "@/lib/session";

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(adminCookieName)?.value;

  if (!env.adminPortalPassword) {
    throw new Error("ADMIN_PORTAL_PASSWORD is not configured.");
  }

  if (!sessionToken) {
    redirect("/admin");
  }

  await purgeExpiredAdminSessions();
  const session = await getAdminSession(hashAdminSessionToken(sessionToken));

  if (!session) {
    cookieStore.delete(adminCookieName);
    redirect("/admin");
  }
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");

  await purgeExpiredAdminSessions();

  if (await isAdminLoginRateLimited()) {
    redirect("/admin?error=rate-limit");
  }

  if (!env.adminPortalPassword || password !== env.adminPortalPassword) {
    await recordAdminLoginFailure();
    redirect("/admin?error=1");
  }

  await clearRecentAdminLoginFailures();

  const sessionToken = createAdminSessionToken();
  const expiresAt = new Date(Date.now() + adminSessionLifetimeSeconds * 1000);
  await createAdminSession(hashAdminSessionToken(sessionToken), expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(adminCookieName, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: adminSessionLifetimeSeconds
  });

  redirect("/admin");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(adminCookieName)?.value;
  if (sessionToken) {
    await deleteAdminSession(hashAdminSessionToken(sessionToken));
  }
  cookieStore.delete(adminCookieName);
  redirect("/admin");
}

export async function approveTeamPaymentAction(formData: FormData) {
  await requireAdmin();
  const teamId = String(formData.get("teamId") || "");
  const teamBefore = await getTeamById(teamId);

  await approveTeamPayment(teamId);

  const teamAfter = await getTeamById(teamId);

  if (
    teamBefore?.payment_status !== "approved" &&
    teamAfter?.payment_status === "approved" &&
    !teamAfter?.is_waitlist
  ) {
    try {
      await sendPaymentApprovedEmail(teamAfter);
    } catch (error) {
      console.error("Payment approval email failed", error);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/dashboard");
  revalidatePath("/");
}

export async function approveReservationAction(formData: FormData) {
  await requireAdmin();
  await approveReservation(String(formData.get("reservationId") || ""));
  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/dashboard");
  revalidatePath("/");
}

export async function rejectReservationAction(formData: FormData) {
  await requireAdmin();
  await rejectReservation(String(formData.get("reservationId") || ""));
  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/dashboard");
  revalidatePath("/");
}

export async function createTeamAction(formData: FormData) {
  await requireAdmin();

  await createTeamByAdmin({
    id: createId(),
    teamName: String(formData.get("teamName") || "").trim(),
    playerOneName: String(formData.get("playerOneName") || "").trim(),
    playerOneEmail: String(formData.get("playerOneEmail") || "").trim().toLowerCase(),
    playerTwoName: String(formData.get("playerTwoName") || "").trim(),
    playerTwoEmail: String(formData.get("playerTwoEmail") || "").trim().toLowerCase(),
    passwordHash: hashPassword(String(formData.get("password") || "").trim()),
    paymentStatus:
      String(formData.get("paymentStatus") || "pending") === "approved" ? "approved" : "pending",
    accessToken: createAccessToken()
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateTeamAction(formData: FormData) {
  await requireAdmin();

  const password = String(formData.get("password") || "").trim();

  await updateTeamByAdmin({
    teamId: String(formData.get("teamId") || ""),
    teamName: String(formData.get("teamName") || "").trim(),
    playerOneName: String(formData.get("playerOneName") || "").trim(),
    playerOneEmail: String(formData.get("playerOneEmail") || "").trim().toLowerCase(),
    playerTwoName: String(formData.get("playerTwoName") || "").trim(),
    playerTwoEmail: String(formData.get("playerTwoEmail") || "").trim().toLowerCase(),
    paymentStatus:
      String(formData.get("paymentStatus") || "pending") === "approved" ? "approved" : "pending",
    passwordHash: password ? hashPassword(password) : undefined
  });

  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/dashboard");
  revalidatePath("/");
}

export async function deleteTeamAction(formData: FormData) {
  await requireAdmin();
  await deleteTeamByAdmin(String(formData.get("teamId") || ""));
  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/dashboard");
  revalidatePath("/");
}

export async function moveTeamReservationAction(formData: FormData) {
  await requireAdmin();
  const slotId = String(formData.get("slotId") || "").trim();
  await moveTeamReservation(String(formData.get("teamId") || ""), slotId || null);
  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/dashboard");
  revalidatePath("/");
}

export async function setTeamWaitlistAction(formData: FormData) {
  await requireAdmin();
  const teamId = String(formData.get("teamId") || "");
  const isWaitlist = String(formData.get("isWaitlist") || "1") === "1";
  await setTeamWaitlistStatus(teamId, isWaitlist);
  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/");
}

export async function saveGameResultAction(formData: FormData) {
  await requireAdmin();

  const winnerTeamId = String(formData.get("winnerTeamId") || "").trim() || null;
  const rawHomeTeamWins = String(formData.get("homeTeamWins") || "").trim();
  const rawAwayTeamWins = String(formData.get("awayTeamWins") || "").trim();
  const homeTeamWins = rawHomeTeamWins ? Number(rawHomeTeamWins) : null;
  const awayTeamWins = rawAwayTeamWins ? Number(rawAwayTeamWins) : null;
  const forfeitingTeamId = String(formData.get("forfeitingTeamId") || "").trim() || null;
  const homeTeamId = String(formData.get("homeTeamId") || "");
  const awayTeamId = String(formData.get("awayTeamId") || "");
  const resultType = forfeitingTeamId ? "forfeit" : "standard";

  if ((rawHomeTeamWins && !Number.isInteger(homeTeamWins)) || (rawAwayTeamWins && !Number.isInteger(awayTeamWins))) {
    throw new Error("Manual scores must be whole numbers.");
  }

  if (
    homeTeamWins !== null &&
    awayTeamWins !== null &&
    (homeTeamWins < 0 || awayTeamWins < 0 || homeTeamWins > 3 || awayTeamWins > 3)
  ) {
    throw new Error("Manual scores must be between 0 and 3.");
  }

  if (
    winnerTeamId &&
    homeTeamWins !== null &&
    awayTeamWins !== null &&
    homeTeamWins === awayTeamWins
  ) {
    throw new Error("Manual result cannot be a tie.");
  }

  if (forfeitingTeamId && forfeitingTeamId !== homeTeamId && forfeitingTeamId !== awayTeamId) {
    throw new Error("Forfeiting team must be one of the scheduled teams.");
  }

  await saveLeagueGameResult({
    slotId: String(formData.get("slotId") || ""),
    week: Number(formData.get("week") || 0),
    matchDate: String(formData.get("matchDate") || ""),
    homeTeamId,
    awayTeamId,
    winnerTeamId,
    homeTeamWins,
    awayTeamWins,
    resultType,
    forfeitingTeamId: resultType === "forfeit" ? forfeitingTeamId : null
  });

  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/dashboard");
  revalidatePath("/schedule");
}

export async function savePlayoffSeedsAction(formData: FormData) {
  await requireAdmin();

  const overrides: Array<{ seed: number; teamId: string }> = [];
  const seenTeamIds = new Set<string>();

  for (let seed = 1; seed <= 18; seed += 1) {
    const teamId = String(formData.get(`seed-${seed}`) || "").trim();

    if (!teamId) {
      continue;
    }

    if (seenTeamIds.has(teamId)) {
      redirect("/admin?showSeeds=1&playoffTone=error&playoffMessage=Each%20playoff%20team%20can%20only%20appear%20once.");
    }

    seenTeamIds.add(teamId);
    overrides.push({ seed, teamId });
  }

  await savePlayoffSeedOverrides(overrides);

  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/dashboard");
  redirect("/admin?showSeeds=1&playoffTone=success&playoffMessage=Manual%20playoff%20bracket%20saved.");
}

export async function clearPlayoffSeedsAction() {
  await requireAdmin();
  await savePlayoffSeedOverrides([]);
  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/dashboard");
  redirect("/admin?showSeeds=1&playoffTone=success&playoffMessage=Manual%20playoff%20bracket%20cleared.");
}
