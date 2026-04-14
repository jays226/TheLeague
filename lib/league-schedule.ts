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
};

export type SlotStandingsRow = {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  percentage: number;
};

export type SlotStandings = {
  slotId: string;
  label: string;
  teams: SlotStandingsRow[];
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
