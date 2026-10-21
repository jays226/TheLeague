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
import { getApplicationNow, getLeagueGameWindow } from "@/lib/eastern-time";
import { gameScoresMatch } from "@/lib/game-scores";
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
  left: {
    winnerTeamId: string;
    homeTeamWins: number;
    awayTeamWins: number;
    gameScores: Array<{ home: number; away: number }> | null;
    resultType: "standard" | "forfeit";
    forfeitingTeamId: string | null;
  },
  right: {
    winner_team_id: string;
    home_team_wins: number;
    away_team_wins: number;
    result_type: "standard" | "forfeit";
    forfeiting_team_id: string | null;
    game_scores: Array<{ home: number; away: number }> | null;
  }
) {
  return (
    left.winnerTeamId === right.winner_team_id &&
    left.homeTeamWins === right.home_team_wins &&
    left.awayTeamWins === right.away_team_wins &&
    gameScoresMatch(left.gameScores, right.game_scores) &&
    left.resultType === right.result_type &&
    left.forfeitingTeamId === right.forfeiting_team_id
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
    const resultType = String(formData.get("resultType") || "standard") === "forfeit" ? "forfeit" : "standard";
    const forfeitingTeamId = String(formData.get("forfeitingTeamId") || "").trim() || null;
    let winnerTeamId = "";
    let homeTeamWins = 0;
    let awayTeamWins = 0;
    let gameScores: Array<{ home: number; away: number }> | null = null;

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
    const now = getApplicationNow();

    if (now < opensAt) {
      throw new Error("Score reporting opens when your match time starts.");
    }

    if (now > closesAt) {
      throw new Error("The score reporting window closed at midnight after your game.");
    }

    if (resultType === "forfeit") {
      if (forfeitingTeamId !== homeTeamId && forfeitingTeamId !== awayTeamId) {
        throw new Error("Choose which team forfeited.");
      }
      winnerTeamId = forfeitingTeamId === homeTeamId ? awayTeamId : homeTeamId;
      homeTeamWins = winnerTeamId === homeTeamId ? 2 : 0;
      awayTeamWins = winnerTeamId === awayTeamId ? 2 : 0;
    } else {
      if (forfeitingTeamId) {
        throw new Error("A normal result cannot include a forfeiting team.");
      }
      const rawScores = [1, 2, 3].map((index) => ({
        home: String(formData.get(`game${index}HomeScore`) ?? "").trim(),
        away: String(formData.get(`game${index}AwayScore`) ?? "").trim()
      }));
      if (!rawScores[0].home || !rawScores[0].away || !rawScores[1].home || !rawScores[1].away) {
        throw new Error("Enter the point score for the first two games.");
      }
      if (Boolean(rawScores[2].home) !== Boolean(rawScores[2].away)) {
        throw new Error("Enter both scores for Game 3, or leave both blank.");
      }
      const enteredScores = rawScores
        .filter((score) => score.home !== "" && score.away !== "")
        .map((score) => ({ home: Number(score.home), away: Number(score.away) }));
      if (enteredScores.some((score) => !Number.isInteger(score.home) || !Number.isInteger(score.away) || score.home < 0 || score.away < 0)) {
        throw new Error("Game scores must be whole numbers of zero or higher.");
      }
      for (const score of enteredScores) {
        if (score.home === score.away) throw new Error("An individual game cannot end in a tie.");
        if (homeTeamWins === 2 || awayTeamWins === 2) {
          throw new Error("Do not enter a game score after one team has won the match.");
        }
        if (score.home > score.away) homeTeamWins += 1;
        else awayTeamWins += 1;
      }
      if (homeTeamWins !== 2 && awayTeamWins !== 2) {
        throw new Error("A best-of-three match needs a winner. Enter the deciding Game 3 score.");
      }
      if ((homeTeamWins === 2 || awayTeamWins === 2) && enteredScores.length < 2) {
        throw new Error("Enter at least two game scores.");
      }
      if (enteredScores.length === 3 && homeTeamWins + awayTeamWins !== 3) {
        throw new Error("Enter scores only for games that were played.");
      }
      winnerTeamId = homeTeamWins === 2 ? homeTeamId : awayTeamId;
      gameScores = enteredScores;
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
      awayTeamWins,
      resultType,
      forfeitingTeamId,
      gameScores
    });

    if (
      opponentSubmission &&
      !submissionsMatch(
        {
          winnerTeamId,
          homeTeamWins,
          awayTeamWins,
          gameScores,
          resultType,
          forfeitingTeamId
        },
        opponentSubmission
      ) &&
      (
        !teamSubmission ||
        !submissionsMatch(
          {
            winnerTeamId,
            homeTeamWins,
            awayTeamWins,
            gameScores,
            resultType,
            forfeitingTeamId
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
          submittedScore: gameScores?.map((score) => `${score.home}-${score.away}`).join(", ") ?? `${homeTeamWins}-${awayTeamWins}`,
          opponentSubmittedByTeamName:
            opponentSubmission.submitting_team_id === homeTeamId
              ? game.homeTeamName
              : game.awayTeamName,
          opponentWinnerTeamName:
            opponentSubmission.winner_team_id === homeTeamId
              ? game.homeTeamName
              : game.awayTeamName,
          opponentScore: opponentSubmission.game_scores?.map((score) => `${score.home}-${score.away}`).join(", ") ?? `${opponentSubmission.home_team_wins}-${opponentSubmission.away_team_wins}`
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
