import { recurringSlots } from "@/lib/slots";

export type SlotTeam = {
  id: string;
  teamName: string;
};

export type GeneratedLeagueGame = {
  slotId: string;
  dayLabel: string;
  timeLabel: string;
  week: number;
  matchDate: string;
  dateLabel: string;
  locationLabel: string | null;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
};

export type LeagueGameWithResult = GeneratedLeagueGame & {
  winnerTeamId: string | null;
  resultType?: "standard" | "forfeit";
  forfeitingTeamId?: string | null;
};

export type PlayoffSeedingGame = LeagueGameWithResult & {
  homeTeamWins?: number | null;
  awayTeamWins?: number | null;
};

export type SlotStandingsRow = {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  forfeits: number;
  percentage: number;
};

export type SlotStandings = {
  slotId: string;
  label: string;
  teams: SlotStandingsRow[];
};

export type PlayoffSeedRow = {
  seed: number;
  teamId: string;
  teamName: string;
  slotId: string;
  slotLabel: string;
  wins: number;
  losses: number;
  forfeits: number;
  percentage: number;
};

type PlayoffSeedSortMetrics = {
  dominantWins: number;
  competitiveWins: number;
  forfeitWins: number;
};

export type QualifiedPlayoffSeedRow = PlayoffSeedRow & {
  overallSeed: number;
};

export type PlayoffSeedOverrideInput = {
  seed: number;
  teamId: string;
};

export type PlayoffTeamContext = {
  teamId: string;
  teamName: string;
  slotId?: string | null;
  slotLabel?: string | null;
};

export type PlayoffBracketMatchId =
  | "play-in-1"
  | "play-in-2"
  | "r16-a"
  | "r16-b"
  | "r16-c"
  | "r16-d"
  | "r16-e"
  | "r16-f"
  | "r16-g"
  | "r16-h"
  | "qf-1"
  | "qf-2"
  | "qf-3"
  | "qf-4"
  | "sf-1"
  | "sf-2"
  | "final";

export type PlayoffBracketResultInput = {
  matchupId: PlayoffBracketMatchId;
  winnerTeamId: string;
};

export type PlayoffBracketPlaceholder = {
  label: string;
  detail?: string;
};

export type PlayoffBracketEntry = QualifiedPlayoffSeedRow | PlayoffBracketPlaceholder;

export type PlayoffBracketMatchup = {
  id: PlayoffBracketMatchId;
  label: string;
  top: PlayoffBracketEntry;
  bottom: PlayoffBracketEntry;
  winner: PlayoffBracketEntry | null;
  winnerTeamId: string | null;
  canPickWinner: boolean;
};

type BracketSource =
  | {
      type: "seed";
      seed: number;
    }
  | {
      type: "winner";
      matchupId: PlayoffBracketMatchId;
      label: string;
    };

type BracketDefinition = {
  id: PlayoffBracketMatchId;
  label: string;
  top: BracketSource;
  bottom: BracketSource;
};

const seasonDatesByDay = {
  monday: ["2026-03-30", "2026-04-06", "2026-04-13", "2026-04-20"],
  tuesday: ["2026-03-31", "2026-04-07", "2026-04-14", "2026-04-21"],
  wednesday: ["2026-04-01", "2026-04-08", "2026-04-15", "2026-04-22"]
} as const;

const matchLocationsByDateAndTime = {
  "2026-03-30": {
    "6:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 13B"],
    "7:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 13B"]
  },
  "2026-03-31": {
    "6:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 13B"],
    "7:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 13B"]
  },
  "2026-04-01": {
    "6:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 13B"],
    "7:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 13B"]
  },
  "2026-04-06": {
    "6:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 13B"],
    "7:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 13B"]
  },
  "2026-04-07": {
    "6:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 13B"],
    "7:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 13B"]
  },
  "2026-04-08": {
    "6:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 13B"],
    "7:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 13B"]
  },
  "2026-04-13": {
    "6:00 PM": ["Snyder Pickleball Court 12B", "Snyder Pickleball Court 13B"],
    "7:00 PM": ["Snyder Pickleball Court 12B", "Snyder Pickleball Court 13B"]
  },
  "2026-04-14": {
    "6:00 PM": ["Perry-Fishburne (Old Dorms) Pickleball Court 4A", "Perry-Fishburne (Old Dorms) Pickleball Court 4B"],
    "7:00 PM": ["Perry-Fishburne (Old Dorms) Pickleball Court 4A", "Perry-Fishburne (Old Dorms) Pickleball Court 4B"]
  },
  "2026-04-15": {
    "6:00 PM": ["Perry-Fishburne (Old Dorms) Pickleball Court 4A", "Perry-Fishburne (Old Dorms) Pickleball Court 4B"],
    "7:00 PM": ["Perry-Fishburne (Old Dorms) Pickleball Court 4A", "Perry-Fishburne (Old Dorms) Pickleball Court 4B"]
  },
  "2026-04-20": {
    "6:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 12B"],
    "7:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 12B"]
  },
  "2026-04-21": {
    "6:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 12B"],
    "7:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 12B"]
  },
  "2026-04-22": {
    "6:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 12B"],
    "7:00 PM": ["Snyder Pickleball Court 12A", "Snyder Pickleball Court 12B"]
  }
} as const;

function hashString(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function formatSeasonDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function createSeedPlaceholder(seed: number): PlayoffBracketPlaceholder {
  return {
    label: `Seed ${seed}`,
    detail: "Projected"
  };
}

function resolveBracketSource(input: {
  source: BracketSource;
  seedsByNumber: Map<number, QualifiedPlayoffSeedRow>;
  winnersByMatchId: Map<PlayoffBracketMatchId, QualifiedPlayoffSeedRow>;
}) {
  if (input.source.type === "seed") {
    return input.seedsByNumber.get(input.source.seed) ?? createSeedPlaceholder(input.source.seed);
  }

  return (
    input.winnersByMatchId.get(input.source.matchupId) ?? {
      label: input.source.label,
      detail: "Awaiting result"
    }
  );
}

function createBracketDefinitions(hasPlayIns: boolean) {
  const playInDefinitions: BracketDefinition[] = hasPlayIns
    ? [
        {
          id: "play-in-1",
          label: "Play-in 1",
          top: { type: "seed", seed: 15 },
          bottom: { type: "seed", seed: 18 }
        },
        {
          id: "play-in-2",
          label: "Play-in 2",
          top: { type: "seed", seed: 16 },
          bottom: { type: "seed", seed: 17 }
        }
      ]
    : [];

  const roundOf16Definitions: BracketDefinition[] = hasPlayIns
    ? [
        {
          id: "r16-a",
          label: "A",
          top: { type: "seed", seed: 1 },
          bottom: { type: "winner", matchupId: "play-in-2", label: "Winner of Play-in 2" }
        },
        {
          id: "r16-b",
          label: "B",
          top: { type: "seed", seed: 8 },
          bottom: { type: "seed", seed: 9 }
        },
        {
          id: "r16-c",
          label: "C",
          top: { type: "seed", seed: 5 },
          bottom: { type: "seed", seed: 12 }
        },
        {
          id: "r16-d",
          label: "D",
          top: { type: "seed", seed: 4 },
          bottom: { type: "seed", seed: 13 }
        },
        {
          id: "r16-e",
          label: "E",
          top: { type: "seed", seed: 3 },
          bottom: { type: "seed", seed: 14 }
        },
        {
          id: "r16-f",
          label: "F",
          top: { type: "seed", seed: 6 },
          bottom: { type: "seed", seed: 11 }
        },
        {
          id: "r16-g",
          label: "G",
          top: { type: "seed", seed: 2 },
          bottom: { type: "winner", matchupId: "play-in-1", label: "Winner of Play-in 1" }
        },
        {
          id: "r16-h",
          label: "H",
          top: { type: "seed", seed: 7 },
          bottom: { type: "seed", seed: 10 }
        }
      ]
    : [
        {
          id: "r16-a",
          label: "A",
          top: { type: "seed", seed: 1 },
          bottom: { type: "seed", seed: 16 }
        },
        {
          id: "r16-b",
          label: "B",
          top: { type: "seed", seed: 8 },
          bottom: { type: "seed", seed: 9 }
        },
        {
          id: "r16-c",
          label: "C",
          top: { type: "seed", seed: 5 },
          bottom: { type: "seed", seed: 12 }
        },
        {
          id: "r16-d",
          label: "D",
          top: { type: "seed", seed: 4 },
          bottom: { type: "seed", seed: 13 }
        },
        {
          id: "r16-e",
          label: "E",
          top: { type: "seed", seed: 3 },
          bottom: { type: "seed", seed: 14 }
        },
        {
          id: "r16-f",
          label: "F",
          top: { type: "seed", seed: 6 },
          bottom: { type: "seed", seed: 11 }
        },
        {
          id: "r16-g",
          label: "G",
          top: { type: "seed", seed: 2 },
          bottom: { type: "seed", seed: 15 }
        },
        {
          id: "r16-h",
          label: "H",
          top: { type: "seed", seed: 7 },
          bottom: { type: "seed", seed: 10 }
        }
      ];

  const quarterfinalDefinitions: BracketDefinition[] = [
    {
      id: "qf-1",
      label: "QF1",
      top: { type: "winner", matchupId: "r16-a", label: "Winner of A" },
      bottom: { type: "winner", matchupId: "r16-b", label: "Winner of B" }
    },
    {
      id: "qf-2",
      label: "QF2",
      top: { type: "winner", matchupId: "r16-c", label: "Winner of C" },
      bottom: { type: "winner", matchupId: "r16-d", label: "Winner of D" }
    },
    {
      id: "qf-3",
      label: "QF3",
      top: { type: "winner", matchupId: "r16-e", label: "Winner of E" },
      bottom: { type: "winner", matchupId: "r16-f", label: "Winner of F" }
    },
    {
      id: "qf-4",
      label: "QF4",
      top: { type: "winner", matchupId: "r16-g", label: "Winner of G" },
      bottom: { type: "winner", matchupId: "r16-h", label: "Winner of H" }
    }
  ];

  const semifinalDefinitions: BracketDefinition[] = [
    {
      id: "sf-1",
      label: "SF1",
      top: { type: "winner", matchupId: "qf-1", label: "Winner of QF1" },
      bottom: { type: "winner", matchupId: "qf-2", label: "Winner of QF2" }
    },
    {
      id: "sf-2",
      label: "SF2",
      top: { type: "winner", matchupId: "qf-3", label: "Winner of QF3" },
      bottom: { type: "winner", matchupId: "qf-4", label: "Winner of QF4" }
    }
  ];

  const finalDefinitions: BracketDefinition[] = [
    {
      id: "final",
      label: "Final",
      top: { type: "winner", matchupId: "sf-1", label: "Winner of SF1" },
      bottom: { type: "winner", matchupId: "sf-2", label: "Winner of SF2" }
    }
  ];

  return {
    playInDefinitions,
    roundOf16Definitions,
    quarterfinalDefinitions,
    semifinalDefinitions,
    finalDefinitions
  };
}

function resolveBracketMatchups(input: {
  definitions: BracketDefinition[];
  seedsByNumber: Map<number, QualifiedPlayoffSeedRow>;
  resultByMatchId: Map<PlayoffBracketMatchId, string>;
  winnersByMatchId: Map<PlayoffBracketMatchId, QualifiedPlayoffSeedRow>;
}) {
  return input.definitions.map((definition) => {
    const top = resolveBracketSource({
      source: definition.top,
      seedsByNumber: input.seedsByNumber,
      winnersByMatchId: input.winnersByMatchId
    });
    const bottom = resolveBracketSource({
      source: definition.bottom,
      seedsByNumber: input.seedsByNumber,
      winnersByMatchId: input.winnersByMatchId
    });
    const topTeamId = "teamId" in top ? top.teamId : null;
    const bottomTeamId = "teamId" in bottom ? bottom.teamId : null;
    const winnerTeamId = input.resultByMatchId.get(definition.id) ?? null;
    const winner =
      winnerTeamId && topTeamId === winnerTeamId
        ? top
        : winnerTeamId && bottomTeamId === winnerTeamId
          ? bottom
          : null;

    if (winner && "teamId" in winner) {
      input.winnersByMatchId.set(definition.id, winner);
    }

    return {
      id: definition.id,
      label: definition.label,
      top,
      bottom,
      winner,
      winnerTeamId,
      canPickWinner: Boolean(topTeamId && bottomTeamId)
    } satisfies PlayoffBracketMatchup;
  });
}

function sortTeamsForSlot(slotId: string, teams: SlotTeam[]) {
  return [...teams].sort((left, right) => {
    const leftHash = hashString(`${slotId}:${left.teamName}:${left.id}`);
    const rightHash = hashString(`${slotId}:${right.teamName}:${right.id}`);
    return leftHash - rightHash || left.teamName.localeCompare(right.teamName);
  });
}

function buildRoundRobinRounds(inputTeams: SlotTeam[]) {
  if (inputTeams.length < 2) {
    return [] as Array<Array<[SlotTeam, SlotTeam]>>;
  }

  const teams = [...inputTeams];
  const byeTeam = { id: "__bye__", teamName: "BYE" };

  if (teams.length % 2 === 1) {
    teams.push(byeTeam);
  }

  const rounds: Array<Array<[SlotTeam, SlotTeam]>> = [];
  let rotating = [...teams];
  const roundCount = rotating.length - 1;

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const pairings: Array<[SlotTeam, SlotTeam]> = [];

    for (let index = 0; index < rotating.length / 2; index += 1) {
      const home = rotating[index];
      const away = rotating[rotating.length - 1 - index];

      if (home.id !== byeTeam.id && away.id !== byeTeam.id) {
        pairings.push([home, away]);
      }
    }

    rounds.push(pairings);

    const [first, ...rest] = rotating;
    const last = rest.pop();

    if (!last) {
      break;
    }

    rotating = [first, last, ...rest];
  }

  return rounds;
}

export function generateSlotSchedule(slotId: string, teams: SlotTeam[]) {
  const slot = recurringSlots.find((entry) => entry.id === slotId);

  if (!slot) {
    return [] as GeneratedLeagueGame[];
  }

  const orderedTeams = sortTeamsForSlot(slotId, teams);
  const rounds = buildRoundRobinRounds(orderedTeams);

  if (rounds.length === 0) {
    return [] as GeneratedLeagueGame[];
  }

  const dates = seasonDatesByDay[slot.dayKey];
  const selectedRounds =
    rounds.length >= 4
      ? rounds.slice(0, 4)
      : Array.from({ length: 4 }, (_, index) => rounds[index % rounds.length]);

  return selectedRounds.flatMap((pairings, index) =>
    pairings.map(([homeTeam, awayTeam], pairingIndex) => {
      const matchDate = dates[index];
      const locationOptions = matchLocationsByDateAndTime[matchDate]?.[slot.timeLabel];

      return {
        slotId,
        dayLabel: slot.dayLabel,
        timeLabel: slot.timeLabel,
        week: index + 1,
        matchDate,
        dateLabel: `${formatSeasonDate(matchDate)} • ${slot.timeLabel} ET`,
        locationLabel: locationOptions?.[pairingIndex] ?? null,
        homeTeamId: homeTeam.id,
        homeTeamName: homeTeam.teamName,
        awayTeamId: awayTeam.id,
        awayTeamName: awayTeam.teamName
      };
    })
  );
}

export function buildStandingsFromGames(games: LeagueGameWithResult[]) {
  const standingsBySlot = new Map<string, { label: string; teams: Map<string, SlotStandingsRow> }>();

  for (const game of games) {
    if (!standingsBySlot.has(game.slotId)) {
      standingsBySlot.set(game.slotId, {
        label: `${game.dayLabel} • ${game.timeLabel}`,
        teams: new Map<string, SlotStandingsRow>()
      });
    }

    const slotStanding = standingsBySlot.get(game.slotId)!;

    for (const [teamId, teamName] of [
      [game.homeTeamId, game.homeTeamName],
      [game.awayTeamId, game.awayTeamName]
    ] as const) {
      if (!slotStanding.teams.has(teamId)) {
        slotStanding.teams.set(teamId, {
          teamId,
          teamName,
          wins: 0,
          losses: 0,
          forfeits: 0,
          percentage: 0
        });
      }
    }

    if (!game.winnerTeamId) {
      continue;
    }

    const loserTeamId =
      game.winnerTeamId === game.homeTeamId
        ? game.awayTeamId
        : game.winnerTeamId === game.awayTeamId
          ? game.homeTeamId
          : null;

    if (!loserTeamId) {
      continue;
    }

    slotStanding.teams.get(game.winnerTeamId)!.wins += 1;
    slotStanding.teams.get(loserTeamId)!.losses += 1;
    if (game.resultType === "forfeit" && game.forfeitingTeamId === loserTeamId) {
      slotStanding.teams.get(loserTeamId)!.forfeits += 1;
    }
  }

  return [...standingsBySlot.entries()]
    .map(([slotId, slotStanding]) => ({
      slotId,
      label: slotStanding.label,
      teams: [...slotStanding.teams.values()]
        .map((team) => {
          const totalGames = team.wins + team.losses;
          return {
            ...team,
            percentage: totalGames > 0 ? team.wins / totalGames : 0
          };
        })
        .sort(
          (left, right) =>
            right.percentage - left.percentage ||
            right.wins - left.wins ||
            left.teamName.localeCompare(right.teamName)
        )
    }))
    .sort((left, right) => left.label.localeCompare(right.label)) satisfies SlotStandings[];
}

function normalizeWholeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizePercentage(input: {
  wins: number;
  losses: number;
  percentage: unknown;
}) {
  if (typeof input.percentage === "number" && Number.isFinite(input.percentage)) {
    return input.percentage;
  }

  const totalGames = input.wins + input.losses;
  return totalGames > 0 ? input.wins / totalGames : 0;
}

function comparePlayoffSeedRows(
  left: PlayoffSeedRow,
  right: PlayoffSeedRow,
  metricsByTeamId?: Map<string, PlayoffSeedSortMetrics>
) {
  const leftMetrics = metricsByTeamId?.get(left.teamId) ?? {
    dominantWins: 0,
    competitiveWins: 0,
    forfeitWins: 0
  };
  const rightMetrics = metricsByTeamId?.get(right.teamId) ?? {
    dominantWins: 0,
    competitiveWins: 0,
    forfeitWins: 0
  };
  const leftHasForfeit = left.forfeits > 0 ? 1 : 0;
  const rightHasForfeit = right.forfeits > 0 ? 1 : 0;

  return (
    right.percentage - left.percentage ||
    leftHasForfeit - rightHasForfeit ||
    rightMetrics.dominantWins - leftMetrics.dominantWins ||
    rightMetrics.competitiveWins - leftMetrics.competitiveWins ||
    left.forfeits - right.forfeits ||
    leftMetrics.forfeitWins - rightMetrics.forfeitWins ||
    left.teamName.localeCompare(right.teamName, undefined, { sensitivity: "accent" }) ||
    left.slotLabel.localeCompare(right.slotLabel, undefined, { sensitivity: "accent" }) ||
    left.teamId.localeCompare(right.teamId)
  );
}

export function generatePlayoffSeeds(standingsBySlot: SlotStandings[]) {
  const rows = standingsBySlot.flatMap((slot) =>
    (slot?.teams ?? []).map((team) => {
      const wins = normalizeWholeNumber(team?.wins);
      const losses = normalizeWholeNumber(team?.losses);
      const forfeits = normalizeWholeNumber(team?.forfeits);

      return {
        seed: 0,
        teamId: team?.teamId ?? "",
        teamName: team?.teamName ?? "Unknown team",
        slotId: slot?.slotId ?? "",
        slotLabel: slot?.label ?? "Unknown slot",
        wins,
        losses,
        forfeits,
        percentage: normalizePercentage({
          wins,
          losses,
          percentage: team?.percentage
        })
      } satisfies PlayoffSeedRow;
    })
  );

  return rows
    .sort((left, right) => comparePlayoffSeedRows(left, right))
    .map((row, index) => ({
      ...row,
      seed: index + 1
    })) satisfies PlayoffSeedRow[];
}

export function generatePlayoffSeedsFromGames(games: PlayoffSeedingGame[]) {
  const standingsBySlot = buildStandingsFromGames(games);
  const rows = generatePlayoffSeeds(standingsBySlot);
  const metricsByTeamId = new Map<string, PlayoffSeedSortMetrics>();

  for (const game of games) {
    if (!game.winnerTeamId) {
      continue;
    }

    const current = metricsByTeamId.get(game.winnerTeamId) ?? {
      dominantWins: 0,
      competitiveWins: 0,
      forfeitWins: 0
    };

    if (game.resultType === "forfeit") {
      current.forfeitWins += 1;
      metricsByTeamId.set(game.winnerTeamId, current);
      continue;
    }

    const winnerWins =
      game.winnerTeamId === game.homeTeamId ? game.homeTeamWins ?? null : game.awayTeamWins ?? null;
    const loserWins =
      game.winnerTeamId === game.homeTeamId ? game.awayTeamWins ?? null : game.homeTeamWins ?? null;

    if (winnerWins === null || loserWins === null) {
      current.competitiveWins += 1;
      metricsByTeamId.set(game.winnerTeamId, current);
      continue;
    }

    if (winnerWins - loserWins >= 2) {
      current.dominantWins += 1;
    } else {
      current.competitiveWins += 1;
    }

    metricsByTeamId.set(game.winnerTeamId, current);
  }

  return rows
    .sort((left, right) => comparePlayoffSeedRows(left, right, metricsByTeamId))
    .map((row, index) => ({
      ...row,
      seed: index + 1
    })) satisfies PlayoffSeedRow[];
}

export function qualifyPlayoffSeeds(
  seeds: PlayoffSeedRow[],
  input?: {
    minimumWins?: number;
    minimumGames?: number;
    maximumForfeits?: number;
    maxTeams?: number;
  }
) {
  const minimumWins = input?.minimumWins ?? 1;
  const minimumGames = input?.minimumGames ?? 3;
  const maximumForfeits = input?.maximumForfeits ?? 1;
  const maxTeams = input?.maxTeams ?? 18;

  return seeds
    .filter(
      (seed) =>
        seed.wins >= minimumWins &&
        seed.wins + seed.losses >= minimumGames &&
        seed.forfeits <= maximumForfeits
    )
    .slice(0, maxTeams)
    .map((seed, index) => ({
      ...seed,
      overallSeed: seed.seed,
      seed: index + 1
    })) satisfies QualifiedPlayoffSeedRow[];
}

export function resolvePlayoffField(input: {
  autoSeeds: PlayoffSeedRow[];
  overrides: PlayoffSeedOverrideInput[];
  teamContextById?: Map<string, PlayoffTeamContext>;
  maxTeams?: number;
}) {
  const maxTeams = input.maxTeams ?? 18;
  const manualOverrides = [...input.overrides]
    .sort((left, right) => left.seed - right.seed)
    .slice(0, maxTeams);

  if (manualOverrides.length === 0) {
    return qualifyPlayoffSeeds(input.autoSeeds, { maxTeams });
  }

  const autoSeedByTeamId = new Map(input.autoSeeds.map((seed) => [seed.teamId, seed]));

  return manualOverrides.map((override, index) => {
    const autoSeed = autoSeedByTeamId.get(override.teamId);
    const teamContext = input.teamContextById?.get(override.teamId);

    return {
      seed: index + 1,
      overallSeed: autoSeed?.seed ?? 0,
      teamId: override.teamId,
      teamName: autoSeed?.teamName ?? teamContext?.teamName ?? "Unknown team",
      slotId: autoSeed?.slotId ?? teamContext?.slotId ?? "",
      slotLabel: autoSeed?.slotLabel ?? teamContext?.slotLabel ?? "No slot assigned",
      wins: autoSeed?.wins ?? 0,
      losses: autoSeed?.losses ?? 0,
      forfeits: autoSeed?.forfeits ?? 0,
      percentage: autoSeed?.percentage ?? 0
    } satisfies QualifiedPlayoffSeedRow;
  });
}

export function buildPlayoffBracket(input: {
  qualifiedSeeds: QualifiedPlayoffSeedRow[];
  results?: PlayoffBracketResultInput[];
}) {
  const field = input.qualifiedSeeds.slice(0, 18);
  const hasPlayIns = field.length >= 18;
  const seedsByNumber = new Map(field.map((seed) => [seed.seed, seed]));
  const resultByMatchId = new Map(
    (input.results ?? []).map((result) => [result.matchupId, result.winnerTeamId])
  );
  const winnersByMatchId = new Map<PlayoffBracketMatchId, QualifiedPlayoffSeedRow>();
  const definitions = createBracketDefinitions(hasPlayIns);
  const playInMatchups = resolveBracketMatchups({
    definitions: definitions.playInDefinitions,
    seedsByNumber,
    resultByMatchId,
    winnersByMatchId
  });
  const roundOf16Matchups = resolveBracketMatchups({
    definitions: definitions.roundOf16Definitions,
    seedsByNumber,
    resultByMatchId,
    winnersByMatchId
  });
  const quarterfinalMatchups = resolveBracketMatchups({
    definitions: definitions.quarterfinalDefinitions,
    seedsByNumber,
    resultByMatchId,
    winnersByMatchId
  });
  const semifinalMatchups = resolveBracketMatchups({
    definitions: definitions.semifinalDefinitions,
    seedsByNumber,
    resultByMatchId,
    winnersByMatchId
  });
  const finalMatchups = resolveBracketMatchups({
    definitions: definitions.finalDefinitions,
    seedsByNumber,
    resultByMatchId,
    winnersByMatchId
  });

  return {
    field,
    currentChampion: finalMatchups[0]?.winner ?? null,
    playInMatchups,
    roundOf16Matchups,
    quarterfinalMatchups,
    semifinalMatchups,
    finalMatchups
  };
}
