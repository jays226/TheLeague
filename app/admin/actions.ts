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

  if (teamBefore?.payment_status !== "approved" && teamAfter?.payment_status === "approved") {
    try {
      await sendPaymentApprovedEmail(teamAfter);
    } catch (error) {
      console.error("Payment approval email failed", error);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/app");
}

export async function approveReservationAction(formData: FormData) {
  await requireAdmin();
  await approveReservation(String(formData.get("reservationId") || ""));
  revalidatePath("/admin");
  revalidatePath("/app");
}

export async function rejectReservationAction(formData: FormData) {
  await requireAdmin();
  await rejectReservation(String(formData.get("reservationId") || ""));
  revalidatePath("/admin");
  revalidatePath("/app");
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
}

export async function deleteTeamAction(formData: FormData) {
  await requireAdmin();
  await deleteTeamByAdmin(String(formData.get("teamId") || ""));
  revalidatePath("/admin");
  revalidatePath("/app");
}

export async function moveTeamReservationAction(formData: FormData) {
  await requireAdmin();
  const slotId = String(formData.get("slotId") || "").trim();
  await moveTeamReservation(String(formData.get("teamId") || ""), slotId || null);
  revalidatePath("/admin");
  revalidatePath("/app");
}
