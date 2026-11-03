import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAdminSession, listLeagueGames, listTeamsWithReservations, purgeExpiredAdminSessions } from "@/lib/db";
import { env } from "@/lib/env";
import { adminCookieName, hashAdminSessionToken } from "@/lib/session";

function csvCell(value: string | number | null | undefined) {
  const rawText = value == null ? "" : String(value);
  const text = /^[\s]*[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(adminCookieName)?.value;

  await purgeExpiredAdminSessions();

  const isAuthed =
    !!env.adminPortalPassword &&
    !!sessionToken &&
    !!(await getAdminSession(hashAdminSessionToken(sessionToken)));

  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [games, teams] = await Promise.all([listLeagueGames(), listTeamsWithReservations()]);
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const header = [
    "Week",
    "Date",
    "Day",
    "Time",
    "Location",
    "Home Team",
    "Away Team",
    "Game Number",
    "Home Player 1",
    "Home Player 1 DUPR ID",
    "Home Player 2",
    "Home Player 2 DUPR ID",
    "Away Player 1",
    "Away Player 1 DUPR ID",
    "Away Player 2",
    "Away Player 2 DUPR ID",
    "Home Points",
    "Away Points",
    "Match Score (Home-Away)",
    "Score Reports"
  ];
  const rows: Array<Array<string | number | null | undefined>> = [header];

  for (const game of games) {
    const home = teamById.get(game.homeTeamId);
    const away = teamById.get(game.awayTeamId);
    const scoreRows = game.gameScores?.length ? game.gameScores : [null];

    scoreRows.forEach((score, index) => {
      rows.push([
        game.week,
        game.matchDate,
        game.dayLabel,
        game.timeLabel,
        game.locationLabel,
        game.homeTeamName,
        game.awayTeamName,
        score ? index + 1 : "",
        home?.player_one_name,
        home?.player_one_dupr_id || "DUPR ID missing",
        home?.player_two_name,
        home?.player_two_dupr_id || "DUPR ID missing",
        away?.player_one_name,
        away?.player_one_dupr_id || "DUPR ID missing",
        away?.player_two_name,
        away?.player_two_dupr_id || "DUPR ID missing",
        score?.home,
        score?.away,
        game.homeTeamWins !== null && game.awayTeamWins !== null
          ? `${game.homeTeamWins}-${game.awayTeamWins}`
          : "",
        `${game.submissions.length}/2`
      ]);
    });
  }

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="the-league-dupr-matches.csv"',
      "Cache-Control": "private, no-store"
    }
  });
}
