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
import { getLeagueGameWindow } from "@/lib/eastern-time";
import { sendScoreMismatchAlert } from "@/lib/email-notifications";
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

function submissionsMatch(
  left: { winnerTeamId: string; homeTeamWins: number; awayTeamWins: number },
  right: { winner_team_id: string; home_team_wins: number; away_team_wins: number }
) {
  return (
    left.winnerTeamId === right.winner_team_id &&
    left.homeTeamWins === right.home_team_wins &&
    left.awayTeamWins === right.away_team_wins
  );
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

    const teamSubmission = game.submissions.find((submission) => submission.submitting_team_id === team.id);
    const opponentSubmission = game.submissions.find(
      (submission) => submission.submitting_team_id !== team.id
    );

    const { opensAt, closesAt } = getLeagueGameWindow(matchDate, timeLabel);
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

    if (
      opponentSubmission &&
      !submissionsMatch(
        {
          winnerTeamId,
          homeTeamWins,
          awayTeamWins
        },
        opponentSubmission
      ) &&
      (
        !teamSubmission ||
        !submissionsMatch(
          {
            winnerTeamId,
            homeTeamWins,
            awayTeamWins
          },
          teamSubmission
        )
      )
    ) {
      try {
        await sendScoreMismatchAlert({
          week: game.week,
          dateLabel: game.dateLabel,
          homeTeamName: game.homeTeamName,
          awayTeamName: game.awayTeamName,
          submittedByTeamName: team.team_name,
          submittedWinnerTeamName:
            winnerTeamId === homeTeamId ? game.homeTeamName : game.awayTeamName,
          submittedScore: `${homeTeamWins}-${awayTeamWins}`,
          opponentSubmittedByTeamName:
            opponentSubmission.submitting_team_id === homeTeamId
              ? game.homeTeamName
              : game.awayTeamName,
          opponentWinnerTeamName:
            opponentSubmission.winner_team_id === homeTeamId
              ? game.homeTeamName
              : game.awayTeamName,
          opponentScore: `${opponentSubmission.home_team_wins}-${opponentSubmission.away_team_wins}`
        });
      } catch (error) {
        console.error("Score mismatch alert failed", error);
      }
    }

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
