import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { saveGameResultAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAdminSession, listLeagueGames, purgeExpiredAdminSessions } from "@/lib/db";
import { env } from "@/lib/env";
import { adminCookieName, hashAdminSessionToken } from "@/lib/session";

function formatEasternTimestamp(value: string) {
  return `${new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value))} ET`;
}

function getForfeitLabel(input: {
  forfeitingTeamId: string | null;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
}) {
  if (!input.forfeitingTeamId) {
    return "Forfeit";
  }

  return `Forfeit by ${
    input.forfeitingTeamId === input.homeTeamId ? input.homeTeamName : input.awayTeamName
  }`;
}

export default async function AdminGamesPage({
  searchParams
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(adminCookieName)?.value;

  await purgeExpiredAdminSessions();

  const isAuthed =
    !!env.adminPortalPassword &&
    !!sessionToken &&
    !!(await getAdminSession(hashAdminSessionToken(sessionToken)));

  if (!isAuthed) {
    redirect("/admin");
  }

  const leagueGames = await listLeagueGames();
  const weeks = [...new Set(leagueGames.map((game) => game.week))].sort((left, right) => left - right);
  const selectedWeek = params.week ? Number(params.week) : weeks[0] ?? 1;
  const weeklyGames = leagueGames.filter((game) => game.week === selectedWeek);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f3eb_0%,#eef3ee_100%)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge>Admin portal</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
              Weekly game reports
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Review each matchup for the selected week and compare what both teams submitted.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition hover:bg-[hsl(42_40%_86%)]"
            href="/admin"
          >
            Back to admin
          </Link>
        </header>

        <Card className="p-6">
          <p className="text-sm uppercase tracking-[0.16em] text-primary/65">Choose a week</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {weeks.map((week) => (
              <Link
                className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${
                  week === selectedWeek
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/80 text-foreground hover:bg-white"
                }`}
                href={`/admin/games?week=${week}`}
                key={week}
              >
                Week {week}
              </Link>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          {weeklyGames.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">
              No scheduled games were found for this week yet.
            </Card>
          ) : (
            weeklyGames.map((game) => (
              <Card className="p-6" key={`${game.slotId}-${game.week}-${game.homeTeamId}-${game.awayTeamId}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/65">
                      Week {game.week} • {game.dayLabel} at {game.timeLabel}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                      {game.homeTeamName} vs {game.awayTeamName}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">{game.dateLabel}</p>
                    {game.locationLabel ? (
                      <p className="mt-1 text-sm text-muted-foreground">{game.locationLabel}</p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl bg-secondary/80 px-4 py-3 text-sm text-foreground">
                    {game.winnerTeamId
                      ? `Current recorded result: ${
                          game.homeTeamWins !== null && game.awayTeamWins !== null
                            ? `${game.homeTeamWins}-${game.awayTeamWins}${
                                game.resultType === "forfeit"
                                  ? ` (${getForfeitLabel({
                                      forfeitingTeamId: game.forfeitingTeamId,
                                      homeTeamId: game.homeTeamId,
                                      homeTeamName: game.homeTeamName,
                                      awayTeamId: game.awayTeamId,
                                      awayTeamName: game.awayTeamName
                                    })})`
                                  : ""
                              }`
                            : game.winnerTeamId === game.homeTeamId
                              ? `${game.homeTeamName} win`
                              : `${game.awayTeamName} win`
                        }`
                      : "No final result recorded yet"}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-white/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/65">
                      {game.homeTeamName} submission
                    </p>
                    {game.submissions.find((submission) => submission.submitting_team_id === game.homeTeamId) ? (
                      <div className="mt-3 space-y-1 text-sm text-foreground">
                        {(() => {
                          const submission = game.submissions.find(
                            (entry) => entry.submitting_team_id === game.homeTeamId
                          )!;
                          return (
                            <>
                              <p>
                                Winner picked:{" "}
                                {submission.winner_team_id === game.homeTeamId
                                  ? game.homeTeamName
                                  : game.awayTeamName}
                              </p>
                              <p>
                                Reported score: {submission.home_team_wins}-{submission.away_team_wins}
                              </p>
                              {submission.result_type === "forfeit" ? (
                                <p>
                                  {getForfeitLabel({
                                    forfeitingTeamId: submission.forfeiting_team_id,
                                    homeTeamId: game.homeTeamId,
                                    homeTeamName: game.homeTeamName,
                                    awayTeamId: game.awayTeamId,
                                    awayTeamName: game.awayTeamName
                                  })}
                                </p>
                              ) : null}
                              <p className="text-muted-foreground">
                                Submitted {formatEasternTimestamp(submission.updated_at)}
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">No submission yet.</p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-white/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/65">
                      {game.awayTeamName} submission
                    </p>
                    {game.submissions.find((submission) => submission.submitting_team_id === game.awayTeamId) ? (
                      <div className="mt-3 space-y-1 text-sm text-foreground">
                        {(() => {
                          const submission = game.submissions.find(
                            (entry) => entry.submitting_team_id === game.awayTeamId
                          )!;
                          return (
                            <>
                              <p>
                                Winner picked:{" "}
                                {submission.winner_team_id === game.homeTeamId
                                  ? game.homeTeamName
                                  : game.awayTeamName}
                              </p>
                              <p>
                                Reported score: {submission.home_team_wins}-{submission.away_team_wins}
                              </p>
                              {submission.result_type === "forfeit" ? (
                                <p>
                                  {getForfeitLabel({
                                    forfeitingTeamId: submission.forfeiting_team_id,
                                    homeTeamId: game.homeTeamId,
                                    homeTeamName: game.homeTeamName,
                                    awayTeamId: game.awayTeamId,
                                    awayTeamName: game.awayTeamName
                                  })}
                                </p>
                              ) : null}
                              <p className="text-muted-foreground">
                                Submitted {formatEasternTimestamp(submission.updated_at)}
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">No submission yet.</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-[rgba(245,132,79,0.08)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/65">
                    Manual result override
                  </p>
                  <form action={saveGameResultAction} className="mt-3 flex flex-wrap items-center gap-3">
                    <input name="slotId" type="hidden" value={game.slotId} />
                    <input name="week" type="hidden" value={String(game.week)} />
                    <input name="matchDate" type="hidden" value={game.matchDate} />
                    <input name="homeTeamId" type="hidden" value={game.homeTeamId} />
                    <input name="awayTeamId" type="hidden" value={game.awayTeamId} />
                    <input
                      aria-label={`${game.homeTeamName} wins`}
                      className="h-11 w-20 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                      defaultValue={game.homeTeamWins ?? ""}
                      inputMode="numeric"
                      max={3}
                      min={0}
                      name="homeTeamWins"
                      placeholder="2"
                      type="number"
                    />
                    <span className="text-sm font-semibold text-muted-foreground">-</span>
                    <input
                      aria-label={`${game.awayTeamName} wins`}
                      className="h-11 w-20 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                      defaultValue={game.awayTeamWins ?? ""}
                      inputMode="numeric"
                      max={3}
                      min={0}
                      name="awayTeamWins"
                      placeholder="1"
                      type="number"
                    />
                    <select
                      className="h-11 min-w-56 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                      defaultValue={game.winnerTeamId ?? ""}
                      name="winnerTeamId"
                    >
                      <option value="">No result recorded</option>
                      <option value={game.homeTeamId}>{game.homeTeamName}</option>
                      <option value={game.awayTeamId}>{game.awayTeamName}</option>
                    </select>
                    <select
                      className="h-11 min-w-48 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                      defaultValue={
                        game.resultType === "forfeit" && game.forfeitingTeamId
                          ? game.forfeitingTeamId
                          : ""
                      }
                      name="forfeitingTeamId"
                    >
                      <option value="">No forfeit</option>
                      <option value={game.homeTeamId}>{game.homeTeamName} forfeited</option>
                      <option value={game.awayTeamId}>{game.awayTeamName} forfeited</option>
                    </select>
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
                      type="submit"
                    >
                      Save result
                    </button>
                  </form>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
