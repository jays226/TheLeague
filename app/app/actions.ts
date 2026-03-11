"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  cancelActiveReservation,
  getActiveReservationForTeam,
  getPendingReservationForTeam,
  getTeamByAccessToken,
  reserveSlot
} from "@/lib/db";
import { createId, leagueCookieName } from "@/lib/session";

async function requireTeam() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(leagueCookieName)?.value;

  if (!accessToken) {
    redirect("/");
  }

  const team = await getTeamByAccessToken(accessToken);

  if (!team) {
    redirect("/");
  }

  return team;
}

function redirectWithMessage(message: string, tone: "success" | "error") {
  const params = new URLSearchParams({
    message,
    tone
  });

  redirect(`/app?${params.toString()}`);
}

export async function reserveSlotAction(formData: FormData) {
  try {
    const team = await requireTeam();
    const slotId = String(formData.get("slotId") || "");
    const existingApproved = await getActiveReservationForTeam(team.id);
    const existingPending = await getPendingReservationForTeam(team.id);

    await reserveSlot({
      id: createId(),
      teamId: team.id,
      slotId
    });

    revalidatePath("/app");
    redirectWithMessage(
      existingApproved || existingPending
        ? "Your change request is pending admin approval. Your current slot stays active until approved."
        : "You are officially signed up for that slot.",
      "success"
    );
  } catch (error) {
    redirectWithMessage(
      error instanceof Error ? error.message : "Unable to reserve slot.",
      "error"
    );
  }
}

export async function cancelReservationAction() {
  try {
    const team = await requireTeam();
    const pendingReservation = await getPendingReservationForTeam(team.id);
    await cancelActiveReservation(team.id);
    revalidatePath("/app");
    redirectWithMessage(
      pendingReservation ? "Your pending change request was cancelled." : "Your reservation was cancelled.",
      "success"
    );
  } catch (error) {
    redirectWithMessage(
      error instanceof Error ? error.message : "Unable to cancel reservation.",
      "error"
    );
  }
}

export async function logoutTeamAction() {
  const cookieStore = await cookies();
  cookieStore.delete(leagueCookieName);
  redirect("/");
}
