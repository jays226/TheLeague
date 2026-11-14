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

  try {
    await approveTeamPayment(teamId);
  } catch (error) {
    console.error("Team payment approval failed", error);
    redirect(error instanceof Error && error.message.includes("All time slots are full")
      ? "/admin?paymentError=slots-full"
      : "/admin?paymentError=approval-failed");
  }

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

  const playerOneDuprId = String(formData.get("playerOneDuprId") || "").trim();
  const playerTwoDuprId = String(formData.get("playerTwoDuprId") || "").trim();
  if (!playerOneDuprId || !playerTwoDuprId) {
    throw new Error("Enter a DUPR ID for each player.");
  }

  const playerOneType = String(formData.get("playerOneType") || "general") === "social" ? "social" : "general";
  const playerTwoType = String(formData.get("playerTwoType") || "general") === "social" ? "social" : "general";
  await createTeamByAdmin({
    id: createId(),
    teamName: String(formData.get("teamName") || "").trim(),
    playerOneName: String(formData.get("playerOneName") || "").trim(),
    playerOneEmail: String(formData.get("playerOneEmail") || "").trim().toLowerCase(),
    playerOneDuprId,
    playerOneType,
    playerTwoName: String(formData.get("playerTwoName") || "").trim(),
    playerTwoEmail: String(formData.get("playerTwoEmail") || "").trim().toLowerCase(),
    playerTwoDuprId,
    playerTwoType,
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
    playerOneDuprId: String(formData.get("playerOneDuprId") || "").trim() || undefined,
    playerOneType: String(formData.get("playerOneType") || "general") === "social" ? "social" : "general",
    playerTwoName: String(formData.get("playerTwoName") || "").trim(),
    playerTwoEmail: String(formData.get("playerTwoEmail") || "").trim().toLowerCase(),
    playerTwoDuprId: String(formData.get("playerTwoDuprId") || "").trim() || undefined,
    playerTwoType: String(formData.get("playerTwoType") || "general") === "social" ? "social" : "general",
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

  const selectedWinnerTeamId = String(formData.get("winnerTeamId") || "").trim() || null;
  const rawHomeTeamWins = String(formData.get("homeTeamWins") || "").trim();
  const rawAwayTeamWins = String(formData.get("awayTeamWins") || "").trim();
  const homeTeamWins = rawHomeTeamWins ? Number(rawHomeTeamWins) : null;
  const awayTeamWins = rawAwayTeamWins ? Number(rawAwayTeamWins) : null;
  const forfeitureChoice = String(formData.get("forfeitingTeamId") || "").trim();
  const bothForfeited = forfeitureChoice === "both";
  const forfeitingTeamId = bothForfeited ? null : forfeitureChoice || null;
  const homeTeamId = String(formData.get("homeTeamId") || "");
  const awayTeamId = String(formData.get("awayTeamId") || "");
  const winnerTeamId = bothForfeited ? homeTeamId : selectedWinnerTeamId;
  const resultType = bothForfeited ? "double_forfeit" : forfeitingTeamId ? "forfeit" : "standard";
  let gameScores: Array<{ home: number; away: number }> | null = null;

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
    !bothForfeited &&
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

  if (!bothForfeited && !forfeitingTeamId && winnerTeamId) {
    const rawGameScores = [1, 2, 3].map((index) => ({
      home: String(formData.get(`game${index}HomeScore`) ?? "").trim(),
      away: String(formData.get(`game${index}AwayScore`) ?? "").trim()
    }));
    if (rawGameScores.some((score) => Boolean(score.home) !== Boolean(score.away))) {
      throw new Error("Enter both teams' points for each game, or leave both fields blank.");
    }
    const enteredScores = rawGameScores
      .filter((score) => score.home !== "" && score.away !== "")
      .map((score) => ({ home: Number(score.home), away: Number(score.away) }));
    if (enteredScores.some((score) => !Number.isInteger(score.home) || !Number.isInteger(score.away) || score.home < 0 || score.away < 0)) {
      throw new Error("Individual game points must be whole numbers of zero or higher.");
    }
    if (enteredScores.some((score) => score.home === score.away)) {
      throw new Error("An individual game cannot end in a tie.");
    }
    if (enteredScores.length > 0) {
      if (!winnerTeamId || homeTeamWins === null || awayTeamWins === null) {
        throw new Error("Select the match winner and match score before adding individual game points.");
      }
      if (enteredScores.length !== homeTeamWins + awayTeamWins) {
        throw new Error("Enter individual point scores for each game played in the match.");
      }
      const actualHomeWins = enteredScores.filter((score) => score.home > score.away).length;
      const actualAwayWins = enteredScores.length - actualHomeWins;
      if (actualHomeWins !== homeTeamWins || actualAwayWins !== awayTeamWins) {
        throw new Error("Individual game scores must agree with the match score above.");
      }
      if ((winnerTeamId === homeTeamId && actualHomeWins <= actualAwayWins) || (winnerTeamId === awayTeamId && actualAwayWins <= actualHomeWins)) {
        throw new Error("Individual game scores must agree with the selected match winner.");
      }
      gameScores = enteredScores;
    }
  }

  await saveLeagueGameResult({
    slotId: String(formData.get("slotId") || ""),
    week: Number(formData.get("week") || 0),
    matchDate: String(formData.get("matchDate") || ""),
    homeTeamId,
    awayTeamId,
    winnerTeamId,
    homeTeamWins: bothForfeited ? 0 : homeTeamWins,
    awayTeamWins: bothForfeited ? 0 : awayTeamWins,
    resultType,
    forfeitingTeamId: resultType === "forfeit" ? forfeitingTeamId : null,
    gameScores
  });

  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/dashboard");
  revalidatePath("/schedule");
}
