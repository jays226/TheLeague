import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAdminSession, listLeagueGames, listTeamsWithReservations, purgeExpiredAdminSessions } from "@/lib/db";
import { env } from "@/lib/env";
import { adminCookieName, hashAdminSessionToken } from "@/lib/session";

export default async function AdminDuprPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(adminCookieName)?.value;

  await purgeExpiredAdminSessions();

  const isAuthed =
    !!env.adminPortalPassword &&
    !!sessionToken &&
    !!(await getAdminSession(hashAdminSessionToken(sessionToken)));

  if (!isAuthed) redirect("/admin");

  const [games, teams] = await Promise.all([listLeagueGames(), listTeamsWithReservations()]);
  const teamById = new Map(teams.map((team) => [team.id, team]));

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f3eb_0%,#eef3ee_100%)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge>Admin portal</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
              DUPR match entry
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              All scheduled matches in week order, with player DUPR IDs and individual game scores in home–away order.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition hover:bg-[hsl(42_40%_86%)]"
            href="/admin"
          >
            Back to admin
          </Link>
        </header>

        <Card className="overflow-hidden">
          <div className="border-b border-border/70 px-5 py-4 text-sm text-muted-foreground">
            {games.length} scheduled matches · Scores are shown as home player pair first, then away player pair.
          </div>
          {games.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No scheduled games were found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead className="bg-white/70 text-xs uppercase tracking-[0.12em] text-primary/70">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Week / slot</th>
                    <th className="px-4 py-3 font-semibold">Match</th>
                    <th className="px-4 py-3 font-semibold">Home players · DUPR ID</th>
                    <th className="px-4 py-3 font-semibold">Away players · DUPR ID</th>
                    <th className="px-4 py-3 font-semibold">Game scores</th>
                    <th className="px-4 py-3 font-semibold">Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((game) => {
                    const homeTeam = teamById.get(game.homeTeamId);
                    const awayTeam = teamById.get(game.awayTeamId);
                    const players = (team: typeof homeTeam) =>
                      team ? (
                        <div className="space-y-1">
                          <p>{team.player_one_name} <span className="font-mono text-xs text-muted-foreground">{team.player_one_dupr_id || "DUPR ID missing"}</span></p>
                          <p>{team.player_two_name} <span className="font-mono text-xs text-muted-foreground">{team.player_two_dupr_id || "DUPR ID missing"}</span></p>
                        </div>
                      ) : <span className="text-muted-foreground">Player details unavailable</span>;
                    const scoreText = game.gameScores?.length
                      ? game.gameScores.map((score) => `${score.home}-${score.away}`).join(", ")
                      : game.resultType === "forfeit" && game.winnerTeamId
                        ? `Forfeit · ${game.homeTeamWins}-${game.awayTeamWins}`
                        : "No individual scores reported";

                    return (
                      <tr className="border-t border-border/60 align-top even:bg-white/35" key={`${game.slotId}-${game.week}-${game.homeTeamId}-${game.awayTeamId}`}>
                        <td className="whitespace-nowrap px-4 py-4">
                          <p className="font-semibold">Week {game.week}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{game.dayLabel} · {game.timeLabel}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{game.dateLabel}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold">{game.homeTeamName}</p>
                          <p className="my-1 text-xs text-muted-foreground">vs</p>
                          <p className="font-semibold">{game.awayTeamName}</p>
                          {game.homeTeamWins !== null && game.awayTeamWins !== null ? (
                            <p className="mt-2 text-xs text-muted-foreground">Match: {game.homeTeamWins}-{game.awayTeamWins}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">{players(homeTeam)}</td>
                        <td className="px-4 py-4">{players(awayTeam)}</td>
                        <td className="px-4 py-4 font-mono font-semibold">{scoreText}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">
                          {game.submissions.length}/2 teams
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
