import type { SlotStandings } from "@/lib/league-schedule";

export type PlayoffQualificationStatus =
  | "automatic_qualifier"
  | "wild_card"
  | "eliminated"
  | "ineligible"
  | "withdrawn"
  | "pending_review";

export type PlayoffQualificationOverrideStatus = Exclude<PlayoffQualificationStatus, "ineligible" | "withdrawn">;

const withdrawnTeamNames = new Set(["no dinking and driving"]);

export function isWithdrawnPlayoffTeam(teamName: string) {
  return withdrawnTeamNames.has(teamName.trim().toLocaleLowerCase().replace(/\s+/g, " "));
}

export type PlayoffQualificationOverride = {
  teamId: string;
  status: PlayoffQualificationOverrideStatus;
  reason: string;
};

export type PlayoffQualificationRow = {
  teamId: string;
  teamName: string;
  slotId: string;
  slotLabel: string;
  wins: number;
  losses: number;
  completedGames: number;
  winPercentage: number;
  forfeits: number;
  pointsScored: number;
  adjustedPointDifferential: number;
  averagePointDifferential: number;
  overallRank: number | null;
  status: PlayoffQualificationStatus;
  overrideReason: string | null;
};

type QualificationTeam = {
  teamId: string;
  teamName: string;
  slotId: string;
  slotLabel: string;
};

function compareMetric(left: PlayoffQualificationRow, right: PlayoffQualificationRow) {
  return (
    right.winPercentage - left.winPercentage ||
    right.averagePointDifferential - left.averagePointDifferential ||
    right.pointsScored - left.pointsScored
  );
}

function sameQualificationMetrics(left: PlayoffQualificationRow, right: PlayoffQualificationRow) {
  const sameWinPercentage = left.wins * right.completedGames === right.wins * left.completedGames;
  const sameAverageDifferential =
    left.adjustedPointDifferential * right.completedGames ===
    right.adjustedPointDifferential * left.completedGames;
  return sameWinPercentage && sameAverageDifferential && left.pointsScored === right.pointsScored;
}

function orderTiedRows(rows: PlayoffQualificationRow[]) {
  return [...rows].sort(
    (left, right) => left.teamName.localeCompare(right.teamName) || left.teamId.localeCompare(right.teamId)
  );
}

function markCutlineTiePending(rows: PlayoffQualificationRow[], cutIndex: number) {
  if (cutIndex < 0 || cutIndex >= rows.length - 1 || !sameQualificationMetrics(rows[cutIndex], rows[cutIndex + 1])) {
    return false;
  }

  let start = cutIndex;
  let end = cutIndex + 1;
  while (start > 0 && sameQualificationMetrics(rows[start - 1], rows[cutIndex])) start -= 1;
  while (end < rows.length - 1 && sameQualificationMetrics(rows[end + 1], rows[cutIndex])) end += 1;
  for (let index = start; index <= end; index += 1) rows[index].status = "pending_review";
  return true;
}

export function calculatePlayoffQualification(
  teams: QualificationTeam[],
  standings: SlotStandings[],
  overrides: PlayoffQualificationOverride[] = []
) {
  const statsByTeamId = new Map(standings.flatMap((slot) => slot.teams.map((team) => [team.teamId, team] as const)));
  const rows: PlayoffQualificationRow[] = teams.map((team) => {
    const stats = statsByTeamId.get(team.teamId);
    const wins = stats?.wins ?? 0;
    const losses = stats?.losses ?? 0;
    const completedGames = wins + losses;
    const adjustedPointDifferential = stats?.scoreDifferential ?? 0;

    return {
      ...team,
      wins,
      losses,
      completedGames,
      winPercentage: completedGames ? wins / completedGames : 0,
      forfeits: stats?.forfeits ?? 0,
      pointsScored: stats?.pointsScored ?? 0,
      adjustedPointDifferential,
      averagePointDifferential: completedGames ? adjustedPointDifferential / completedGames : 0,
      overallRank: null,
      status: isWithdrawnPlayoffTeam(team.teamName)
        ? "withdrawn"
        : stats?.forfeits && stats.forfeits > 1
          ? "ineligible"
          : "eliminated",
      overrideReason: null
    };
  });

  const rowsBySlot = new Map<string, PlayoffQualificationRow[]>();
  for (const row of rows) {
    if (row.status === "ineligible" || row.status === "withdrawn") continue;
    const slotRows = rowsBySlot.get(row.slotId) ?? [];
    slotRows.push(row);
    rowsBySlot.set(row.slotId, slotRows);
  }

  const eligibleRows = rows.filter((row) => row.status !== "ineligible" && row.status !== "withdrawn");
  const overallOrder = [...eligibleRows].sort(
    (left, right) => compareMetric(left, right) || left.slotLabel.localeCompare(right.slotLabel) || left.teamName.localeCompare(right.teamName)
  );
  overallOrder.forEach((row, index) => { row.overallRank = index + 1; });

  for (const slotRows of rowsBySlot.values()) {
    const ordered = slotRows.sort((left, right) => compareMetric(left, right));
    if (ordered.length <= 2) {
      ordered.forEach((row) => { row.status = "automatic_qualifier"; });
      continue;
    }

    const hasAutoTie = markCutlineTiePending(ordered, 1);
    ordered.forEach((row, index) => {
      if (row.status === "pending_review") return;
      row.status = index < 2 ? "automatic_qualifier" : "eliminated";
    });
    if (hasAutoTie) {
      // A tied team is held out of the wildcard pool until an admin resolves the cutoff.
      continue;
    }
  }

  const wildcardPool = rows.filter((row) => row.status === "eliminated");
  wildcardPool.sort((left, right) => compareMetric(left, right));
  if (wildcardPool.length <= 4) {
    wildcardPool.forEach((row) => { row.status = "wild_card"; });
  } else {
    markCutlineTiePending(wildcardPool, 3);
    wildcardPool.forEach((row, index) => {
      if (row.status === "pending_review") return;
      row.status = index < 4 ? "wild_card" : "eliminated";
    });
  }

  const overridesByTeamId = new Map(overrides.map((override) => [override.teamId, override]));
  for (const row of rows) {
    const override = overridesByTeamId.get(row.teamId);
    if (!override || row.status === "ineligible" || row.status === "withdrawn") continue;
    row.status = override.status;
    row.overrideReason = override.reason;
  }

  return rows.sort(
    (left, right) =>
      (left.overallRank ?? Number.MAX_SAFE_INTEGER) - (right.overallRank ?? Number.MAX_SAFE_INTEGER) ||
      left.slotLabel.localeCompare(right.slotLabel) ||
      left.teamName.localeCompare(right.teamName)
  );
}

export function seedPlayoffQualifiers(rows: PlayoffQualificationRow[]) {
  const qualifiers = rows.filter(
    (row) => row.status === "automatic_qualifier" || row.status === "wild_card"
  );

  if (qualifiers.length !== 16 || rows.some((row) => row.status === "pending_review")) return [];

  return orderTiedRows(qualifiers.sort((left, right) => compareMetric(left, right))).map((row, index) => ({
    seed: index + 1,
    overallSeed: index + 1,
    teamId: row.teamId,
    teamName: row.teamName,
    slotId: row.slotId,
    slotLabel: row.slotLabel,
    wins: row.wins,
    losses: row.losses,
    forfeits: row.forfeits,
    percentage: row.winPercentage,
    pointsScored: row.pointsScored,
    scoreDifferential: row.adjustedPointDifferential,
    qualificationType: row.status === "wild_card" ? "wild_card" as const : "automatic_qualifier" as const
  }));
}
