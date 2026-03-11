"use server";

import { hashPassword } from "@/lib/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  approveReservation,
  approveTeamPayment,
  createTeamByAdmin,
  deleteTeamByAdmin,
  getTeamById,
  moveTeamReservation,
  rejectReservation,
  updateTeamByAdmin
} from "@/lib/db";
import { sendPaymentApprovedEmail } from "@/lib/email-notifications";
import { env } from "@/lib/env";
import { adminCookieName, createAccessToken, createAdminSessionValue, createId } from "@/lib/session";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get(adminCookieName)?.value;

  if (!env.adminPortalPassword) {
    throw new Error("ADMIN_PORTAL_PASSWORD is not configured.");
  }

  if (session !== createAdminSessionValue(env.adminPortalPassword)) {
    redirect("/admin");
  }
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");

  if (!env.adminPortalPassword || password !== env.adminPortalPassword) {
    redirect("/admin?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(adminCookieName, createAdminSessionValue(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  redirect("/admin");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(adminCookieName);
  redirect("/admin");
}

export async function approveTeamPaymentAction(formData: FormData) {
  await requireAdmin();
  const teamId = String(formData.get("teamId") || "");
  const teamBefore = getTeamById(teamId);

  approveTeamPayment(teamId);

  const teamAfter = getTeamById(teamId);

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
  approveReservation(String(formData.get("reservationId") || ""));
  revalidatePath("/admin");
  revalidatePath("/app");
}

export async function rejectReservationAction(formData: FormData) {
  await requireAdmin();
  rejectReservation(String(formData.get("reservationId") || ""));
  revalidatePath("/admin");
  revalidatePath("/app");
}

export async function createTeamAction(formData: FormData) {
  await requireAdmin();

  createTeamByAdmin({
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

  updateTeamByAdmin({
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
  deleteTeamByAdmin(String(formData.get("teamId") || ""));
  revalidatePath("/admin");
  revalidatePath("/app");
}

export async function moveTeamReservationAction(formData: FormData) {
  await requireAdmin();
  const slotId = String(formData.get("slotId") || "").trim();
  moveTeamReservation(String(formData.get("teamId") || ""), slotId || null);
  revalidatePath("/admin");
  revalidatePath("/app");
}
