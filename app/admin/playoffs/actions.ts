"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getAdminSession,
  getPlayoffTournamentState,
  listPlayoffGameResults,
  publishPlayoffBracket,
  resetPlayoffBracket,
  saveGeneratedPlayoffBracket,
  savePlayoffGameResult,
  savePlayoffQualificationOverrides
} from "@/lib/db";
import { env } from "@/lib/env";
import { buildPlayoffBracket } from "@/lib/league-schedule";
import { getPlayoffAdminData } from "@/lib/playoff-admin-data";
import type { PlayoffQualificationOverride, PlayoffQualificationOverrideStatus } from "@/lib/playoff-qualification";
import { adminCookieName, hashAdminSessionToken } from "@/lib/session";

async function requireAdmin() {
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!env.adminPortalPassword || !token || !(await getAdminSession(hashAdminSessionToken(token)))) {
    redirect("/admin");
  }
}

function redirectWithMessage(message: string, tone: "success" | "error" = "success"): never {
  redirect(`/admin/playoffs?${tone}=${encodeURIComponent(message)}`);
}

export async function recalculatePlayoffsAction() {
  await requireAdmin();
  revalidatePath("/admin/playoffs");
  redirectWithMessage("Qualification recalculated from finalized regular-season results.");
}

export async function savePlayoffQualificationAction(formData: FormData) {
  await requireAdmin();
  const data = await getPlayoffAdminData();
  if (data.state.is_published) {
    redirectWithMessage("Unlock and reset the published bracket before changing qualification.", "error");
  }

  const allowedStatuses = new Set<PlayoffQualificationOverrideStatus>([
    "automatic_qualifier",
    "wild_card",
    "eliminated",
    "pending_review"
  ]);
  const overrides: PlayoffQualificationOverride[] = [];
  const existingOverrides = new Map(
    (data.state.qualification_overrides ?? []).map((override) => [override.teamId, override])
  );
  const selectedStatusByTeamId = new Map<string, PlayoffQualificationOverrideStatus>();

  for (const row of data.qualificationRows) {
    if (row.status === "ineligible" || row.status === "withdrawn") continue;
    const status = String(formData.get(`status-${row.teamId}`) || row.status) as PlayoffQualificationOverrideStatus;
    const reason = String(formData.get(`reason-${row.teamId}`) || "").trim();
    if (!allowedStatuses.has(status)) redirectWithMessage("One or more qualification statuses are invalid.", "error");
    selectedStatusByTeamId.set(row.teamId, status);
    if (status !== row.status && reason.length < 5) {
      redirectWithMessage(`Add a reason of at least five characters for ${row.teamName}.`, "error");
    }
    if (status !== row.status) {
      overrides.push({ teamId: row.teamId, status, reason });
    } else {
      const previous = existingOverrides.get(row.teamId);
      if (previous?.status === status) {
        overrides.push({ ...previous, reason: reason || previous.reason });
      }
    }
  }

  const assignedRows = data.qualificationRows.map((row) => ({
    ...row,
    status: selectedStatusByTeamId.get(row.teamId) ?? row.status
  }));
  const automaticBySlot = new Map<string, number>();
  for (const row of assignedRows) {
    if (row.status === "automatic_qualifier") automaticBySlot.set(row.slotId, (automaticBySlot.get(row.slotId) ?? 0) + 1);
  }
  if ([...automaticBySlot.values()].some((count) => count > 2)) {
    redirectWithMessage("Each time slot can have at most two automatic qualifiers.", "error");
  }
  if (assignedRows.filter((row) => row.status === "wild_card").length > 4) {
    redirectWithMessage("There can be at most four wild cards.", "error");
  }
  if (assignedRows.filter((row) => row.status === "automatic_qualifier" || row.status === "wild_card").length > 16) {
    redirectWithMessage("There can be at most 16 qualified teams.", "error");
  }

  await savePlayoffQualificationOverrides(overrides);
  revalidatePath("/admin/playoffs");
  redirectWithMessage("Qualification decisions and reasons saved.");
}

export async function generatePlayoffBracketAction() {
  await requireAdmin();
  const data = await getPlayoffAdminData();
  if (data.state.is_published) {
    redirectWithMessage("Unlock and reset the published bracket before regenerating it.", "error");
  }
  if (data.qualificationRows.some((row) => row.status === "pending_review")) {
    redirectWithMessage("Resolve every pending qualification review before generating the bracket.", "error");
  }

  const seeds = data.calculatedSeeds;
  if (seeds.length !== 16) {
    redirectWithMessage(`The bracket needs 16 qualified teams; ${seeds.length} are currently selected.`, "error");
  }

  await saveGeneratedPlayoffBracket(seeds, data.qualificationRows);
  revalidatePath("/admin/playoffs");
  revalidatePath("/admin");
  redirectWithMessage("A new 16-team bracket was generated. Any previous playoff results were cleared.");
}

export async function publishPlayoffBracketAction() {
  await requireAdmin();
  const state = await getPlayoffTournamentState();
  if (!state.bracket_snapshot || state.bracket_snapshot.length !== 16) {
    redirectWithMessage("Generate a complete 16-team bracket before publishing.", "error");
  }
  try {
    await publishPlayoffBracket();
  } catch (error) {
    redirectWithMessage(error instanceof Error ? error.message : "Unable to publish the bracket.", "error");
  }
  revalidatePath("/admin/playoffs");
  revalidatePath("/admin");
  redirectWithMessage("The bracket is published and its seeds are locked.");
}

export async function resetPlayoffBracketAction() {
  await requireAdmin();
  await resetPlayoffBracket();
  revalidatePath("/admin/playoffs");
  revalidatePath("/admin");
  redirectWithMessage("The bracket was unlocked and reset. Qualification overrides were retained.");
}

export async function savePlayoffMatchResultAction(formData: FormData) {
  await requireAdmin();
  const state = await getPlayoffTournamentState();
  if (!state.is_published || !state.bracket_snapshot) {
    redirectWithMessage("Publish the bracket before entering playoff results.", "error");
  }

  const matchupId = String(formData.get("matchupId") || "") as Parameters<typeof savePlayoffGameResult>[0]["matchupId"];
  const winnerTeamId = String(formData.get("winnerTeamId") || "").trim();
  const homeGamesWon = Number(formData.get("homeGamesWon"));
  const awayGamesWon = Number(formData.get("awayGamesWon"));
  if (
    !Number.isInteger(homeGamesWon) || !Number.isInteger(awayGamesWon) ||
    homeGamesWon < 0 || awayGamesWon < 0 || homeGamesWon > 2 || awayGamesWon > 2 ||
    !((homeGamesWon === 2 && awayGamesWon <= 1) || (awayGamesWon === 2 && homeGamesWon <= 1))
  ) {
    redirectWithMessage("Enter a finalized best-of-three score: 2–0, 2–1, 0–2, or 1–2.", "error");
  }

  const results = await listPlayoffGameResults();
  const bracket = buildPlayoffBracket({
    qualifiedSeeds: state.bracket_snapshot,
    results: results.map((result) => ({
      matchupId: result.matchup_id,
      winnerTeamId: result.winner_team_id,
      homeGamesWon: result.home_games_won,
      awayGamesWon: result.away_games_won
    }))
  });
  const matchup = [
    ...bracket.roundOf16Matchups,
    ...bracket.quarterfinalMatchups,
    ...bracket.semifinalMatchups,
    ...bracket.finalMatchups
  ].find((entry) => entry.id === matchupId);

  if (!matchup?.canPickWinner) redirectWithMessage("Both teams must advance into this matchup before a result can be entered.", "error");
  const topTeamId = "teamId" in matchup.top ? matchup.top.teamId : null;
  const bottomTeamId = "teamId" in matchup.bottom ? matchup.bottom.teamId : null;
  const winnerMatchesScore =
    (winnerTeamId === topTeamId && homeGamesWon === 2) ||
    (winnerTeamId === bottomTeamId && awayGamesWon === 2);
  if (!winnerMatchesScore) redirectWithMessage("The selected winner must be the team with two games won.", "error");

  await savePlayoffGameResult({ matchupId: matchup.id, winnerTeamId, homeGamesWon, awayGamesWon });
  revalidatePath("/admin/playoffs");
  revalidatePath("/admin");
  redirectWithMessage("Playoff score saved and the winner advanced.");
}
