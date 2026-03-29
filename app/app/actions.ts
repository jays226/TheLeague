"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  cancelActiveReservation,
  getActiveReservationForTeam,
  getPendingReservationForTeam,
  getTeamByAccessToken,
  listLeagueGamesForTeam,
  reserveSlot
} from "@/lib/db";
import { submitLeagueGameResult } from "@/lib/db";
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

  redirect(`/app/dashboard?${params.toString()}`);
}

export async function reserveSlotAction(formData: FormData) {
  let successMessage =
    "Your change request is pending admin approval. Your current slot stays active until approved.";

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

    successMessage =
      existingApproved || existingPending
        ? "Your change request is pending admin approval. Your current slot stays active until approved."
        : "You are officially signed up for that slot.";

    revalidatePath("/app");
    revalidatePath("/app/dashboard");
    revalidatePath("/");
  } catch (error) {
    redirectWithMessage(
      error instanceof Error ? error.message : "Unable to reserve slot.",
      "error"
    );
  }

  redirectWithMessage(successMessage, "success");
}

export async function cancelReservationAction() {
  let successMessage = "Your reservation was cancelled.";

  try {
    const team = await requireTeam();
    const pendingReservation = await getPendingReservationForTeam(team.id);
    await cancelActiveReservation(team.id);
    successMessage = pendingReservation
      ? "Your pending change request was cancelled."
      : "Your reservation was cancelled.";
    revalidatePath("/app");
    revalidatePath("/app/dashboard");
    revalidatePath("/");
  } catch (error) {
    redirectWithMessage(
      error instanceof Error ? error.message : "Unable to cancel reservation.",
      "error"
    );
  }

  redirectWithMessage(successMessage, "success");
}

export async function logoutTeamAction() {
  const cookieStore = await cookies();
  cookieStore.delete(leagueCookieName);
  redirect("/");
}

function redirectScheduleWithMessage(message: string, tone: "success" | "error") {
  const params = new URLSearchParams({
    message,
    tone
  });

  redirect(`/app?${params.toString()}`);
}

function getGameWindow(matchDate: string, timeLabel: string) {
  const [time, meridiem] = timeLabel.split(" ");
  const [rawHour, rawMinute] = time.split(":").map(Number);
  let hour = rawHour % 12;

  if (meridiem === "PM") {
    hour += 12;
  }

  const isoHour = String(hour).padStart(2, "0");
  const isoMinute = String(rawMinute).padStart(2, "0");

  return {
    opensAt: new Date(`${matchDate}T${isoHour}:${isoMinute}:00-04:00`),
    closesAt: new Date(`${matchDate}T23:59:59-04:00`)
  };
}

export async function submitGameResultAction(formData: FormData) {
  try {
    const team = await requireTeam();
    const slotId = String(formData.get("slotId") || "");
    const week = Number(formData.get("week") || 0);
    const matchDate = String(formData.get("matchDate") || "");
    const timeLabel = String(formData.get("timeLabel") || "");
    const homeTeamId = String(formData.get("homeTeamId") || "");
    const awayTeamId = String(formData.get("awayTeamId") || "");
    const winnerTeamId = String(formData.get("winnerTeamId") || "");
    const homeTeamWins = Number(formData.get("homeTeamWins") || 0);
    const awayTeamWins = Number(formData.get("awayTeamWins") || 0);

    const scheduledGames = await listLeagueGamesForTeam(team.id);
    const game = scheduledGames.find(
      (entry) =>
        entry.slotId === slotId &&
        entry.week === week &&
        entry.homeTeamId === homeTeamId &&
        entry.awayTeamId === awayTeamId
    );

    if (!game) {
      throw new Error("That scheduled game could not be found for your team.");
    }

    const { opensAt, closesAt } = getGameWindow(matchDate, timeLabel);
    const now = new Date();

    if (now < opensAt) {
      throw new Error("Score reporting opens when your match time starts.");
    }

    if (now > closesAt) {
      throw new Error("The score reporting window closed at midnight after your game.");
    }

    if (winnerTeamId !== homeTeamId && winnerTeamId !== awayTeamId) {
      throw new Error("Choose one of the two teams as the winner.");
    }

    if (
      !Number.isInteger(homeTeamWins) ||
      !Number.isInteger(awayTeamWins) ||
      homeTeamWins < 0 ||
      awayTeamWins < 0 ||
      homeTeamWins > 3 ||
      awayTeamWins > 3
    ) {
      throw new Error("Scores must be whole numbers between 0 and 3.");
    }

    if (homeTeamWins === awayTeamWins) {
      throw new Error("The match result cannot be a tie.");
    }

    if (homeTeamWins + awayTeamWins > 3) {
      throw new Error("Enter a valid best-of-three result, such as 2-0 or 2-1.");
    }

    if (
      (winnerTeamId === homeTeamId && homeTeamWins < awayTeamWins) ||
      (winnerTeamId === awayTeamId && awayTeamWins < homeTeamWins)
    ) {
      throw new Error("The winner must have more game wins than the other team.");
    }

    await submitLeagueGameResult({
      slotId,
      week,
      matchDate,
      homeTeamId,
      awayTeamId,
      submittingTeamId: team.id,
      winnerTeamId,
      homeTeamWins,
      awayTeamWins
    });

    revalidatePath("/app");
    revalidatePath("/admin");
    redirectScheduleWithMessage("Your game result was submitted.", "success");
  } catch (error) {
    redirectScheduleWithMessage(
      error instanceof Error ? error.message : "Unable to submit your game result.",
      "error"
    );
  }
}
