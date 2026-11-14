import "server-only";

import { getPlayoffTournamentState, listLeagueGames, listTeamsWithReservations } from "@/lib/db";
import { buildStandingsFromGames } from "@/lib/league-schedule";
import { calculatePlayoffQualification, isWithdrawnPlayoffTeam, seedPlayoffQualifiers } from "@/lib/playoff-qualification";
import { formatEasternDateKey } from "@/lib/eastern-time";
import { recurringSlots } from "@/lib/slots";

export async function getPlayoffAdminData() {
  const [teams, games, state] = await Promise.all([
    listTeamsWithReservations(),
    listLeagueGames(),
    getPlayoffTournamentState()
  ]);
  const slotByTeamId = new Map<string, { slotId: string; slotLabel: string }>();

  for (const game of games) {
    const slot = recurringSlots.find((entry) => entry.id === game.slotId);
    const slotLabel = `${game.dayLabel} • ${slot?.timeWindowLabel ?? game.timeLabel}`;
    slotByTeamId.set(game.homeTeamId, { slotId: game.slotId, slotLabel });
    slotByTeamId.set(game.awayTeamId, { slotId: game.slotId, slotLabel });
  }

  const scheduledTeams = teams
    .filter((team) => !team.is_waitlist && slotByTeamId.has(team.id))
    .map((team) => ({ ...team, ...slotByTeamId.get(team.id)! }));
  const standings = buildStandingsFromGames(games);
  const liveQualificationRows = calculatePlayoffQualification(
    scheduledTeams.map((team) => ({
      teamId: team.id,
      teamName: team.team_name,
      slotId: team.slotId,
      slotLabel: team.slotLabel
    })),
    standings,
    state.qualification_overrides ?? []
  );
  const qualificationRows = state.is_published && state.qualification_snapshot
    ? state.qualification_snapshot
    : liveQualificationRows;
  const calculatedSeeds = seedPlayoffQualifiers(liveQualificationRows);
  const previewSeeds = state.bracket_snapshot ?? calculatedSeeds;
  const withdrawnTeamInPublishedBracket = Boolean(
    state.is_published && state.bracket_snapshot?.some((seed) => isWithdrawnPlayoffTeam(seed.teamName))
  );
  const teamById = new Map(scheduledTeams.map((team) => [team.id, team]));
  const today = formatEasternDateKey(new Date());
  const unresolvedMatchups = games.filter(
    (game) => game.matchDate < today && !game.winnerTeamId && game.resultType !== "double_forfeit"
  );
  const missingPointScores = games.filter(
    (game) =>
      game.matchDate < today &&
      !!game.winnerTeamId &&
      game.resultType === "standard" &&
      !game.gameScores?.length
  );

  return {
    teams: scheduledTeams,
    teamById,
    games,
    state,
    standings,
    qualificationRows,
    calculatedSeeds,
    previewSeeds,
    withdrawnTeamInPublishedBracket,
    unresolvedMatchups,
    missingPointScores
  };
}
