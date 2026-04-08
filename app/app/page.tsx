import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutTeamAction } from "@/app/app/actions";
import { ReservationBanner } from "@/components/dashboard/reservation-banner";
import { ScoreReportPanel } from "@/components/dashboard/score-report-panel";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getActiveReservationForTeam,
  getTeamById,
  getTeamByAccessToken,
  listLeagueGamesForTeam,
  listLeagueStandings,
  listSlots
} from "@/lib/db";
import { getLeagueGameWindow } from "@/lib/eastern-time";
import { env } from "@/lib/env";
import { leagueCookieName } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

function getCurrentPortalTime() {
  return new Date();
}

function getForfeitLabel(input: {
  forfeitingTeamId: string | null;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
}) {
  if (!input.forfeitingTeamId) {
    return "forfeit";
  }

  return `forfeit by ${
    input.forfeitingTeamId === input.homeTeamId ? input.homeTeamName : input.awayTeamName
  }`;
}

export default async function AppPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string; tone?: "success" | "error" }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(leagueCookieName)?.value;

  if (!accessToken) {
    redirect("/");
  }

  const team = await getTeamByAccessToken(accessToken);

  if (!team) {
    redirect("/");
  }

  const activeReservation = await getActiveReservationForTeam(team.id);
  const slots = await listSlots();
  const activeSlot = activeReservation ? slots.find((slot) => slot.id === activeReservation.slot_id) : undefined;
  const teamSchedule = await listLeagueGamesForTeam(team.id);
  const standings = await listLeagueStandings();
  const currentSlotStandings = activeReservation
    ? standings.find((entry) => entry.slotId === activeReservation.slot_id)
    : undefined;
  const now = getCurrentPortalTime();
  const decoratedSchedule = teamSchedule
    .map((game) => {
      const { opensAt, closesAt } = getLeagueGameWindow(game.matchDate, game.timeLabel);
      const teamSubmission = game.submissions.find((submission) => submission.submitting_team_id === team.id);
      const opponentSubmission = game.submissions.find(
        (submission) => submission.submitting_team_id !== team.id
      );

      return {
        ...game,
        opensAt,
        closesAt,
        canSubmitNow: now >= opensAt && now <= closesAt,
        teamSubmission,
        opponentSubmission
      };
    })
    .sort((left, right) => {
      const leftTime = left.opensAt.getTime();
      const rightTime = right.opensAt.getTime();
      return leftTime - rightTime;
    });
  const reportableGames = decoratedSchedule.filter((game) => game.canSubmitNow);
  const currentMatchup =
    reportableGames[0] ??
    decoratedSchedule.find((game) => game.closesAt >= now && !game.winnerTeamId) ??
    decoratedSchedule[0];
  const opponentTeam =
    currentMatchup
      ? await getTeamById(currentMatchup.homeTeamId === team.id ? currentMatchup.awayTeamId : currentMatchup.homeTeamId)
      : null;
  const tournamentFormUrl = env.tournamentFormUrl;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f3eb_0%,#eef3ee_100%)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-soft">
              <Image
                alt="The League logo"
                className="h-14 w-14 object-contain"
                height={56}
                priority
                src="/logo.png"
                width={56}
              />
            </div>
            <div>
              <Badge>Schedule</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
                {team.team_name}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                This is now your main portal page: see your weekly matchups, your current slot, and
                standings across every time slot in one place.
              </p>
              <Link
                className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#E1306C] px-4 text-sm font-semibold text-white transition hover:bg-[#c72b5f]"
                href="https://www.instagram.com/theleagueatuva/"
                rel="noreferrer"
                target="_blank"
              >
                Instagram
              </Link>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-white/75 px-5 text-sm font-semibold text-foreground transition hover:bg-white"
              href="/app/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition hover:bg-[hsl(42_40%_86%)]"
              href="/"
            >
              Home
            </Link>
            <form action={logoutTeamAction}>
              <button
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
                type="submit"
              >
                Log out
              </button>
            </form>
          </div>
        </header>

        {params.message ? (
          <ReservationBanner
            body={params.message}
            title={params.tone === "error" ? "Action failed" : "Action saved"}
            tone={params.tone === "error" ? "warning" : "success"}
          />
        ) : null}

        <Card className="border-[rgba(245,132,79,0.22)] bg-[linear-gradient(135deg,rgba(245,132,79,0.12),rgba(255,255,255,0.92))] p-6">
          <p className="text-sm uppercase tracking-[0.16em] text-primary/65">
            NEW • Pop-Up Tournament
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            April 18 • 12 PM-3 PM
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            We&apos;re hosting a sudden death tournament at Perry Fishburne Tennis Courts in the
            Dell, by Old Dorms.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            $30/team • $130 cash prize • 16 spots available.
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Featuring a live DJ.</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Questions? theleagueatuva@gmail.com
          </p>
          {tournamentFormUrl ? (
            <a
              className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
              href={tournamentFormUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open tournament signup form
            </a>
          ) : (
            <p className="mt-4 text-sm font-medium text-primary">
              Add the tournament Google Form link to enable signup here.
            </p>
          )}
        </Card>

        {team.is_waitlist ? (
          <Card className="border-[rgba(245,132,79,0.2)] bg-[linear-gradient(135deg,rgba(245,132,79,0.14),rgba(255,255,255,0.92))] p-6">
            <p className="text-sm uppercase tracking-[0.16em] text-primary/65">Waitlist status</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
              Your team is currently on the waitlist.
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              You will not see a weekly schedule until a spot opens. We&apos;ll reach out by email if
              your team can be moved into the league.
            </p>
          </Card>
        ) : team.payment_status !== "approved" ? (
          <Card className="border-[rgba(245,132,79,0.2)] bg-[linear-gradient(135deg,rgba(245,132,79,0.14),rgba(255,255,255,0.92))] p-6">
            <p className="text-sm uppercase tracking-[0.16em] text-primary/65">Payment status</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
              Your schedule unlocks after payment is approved.
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Your team fee is {formatCurrency(team.amount_cents)} total. Once payment is approved,
              return here to see your slot and weekly league schedule.
            </p>
          </Card>
        ) : !activeReservation ? (
          <Card className="p-6">
            <p className="text-sm uppercase tracking-[0.16em] text-primary/65">No slot selected</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
              Choose a weekly time slot to unlock your match schedule.
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Your team is approved, but you still need to claim a weekly time slot. Head to the
              dashboard tab to pick an open slot or request a switch later.
            </p>
          </Card>
        ) : (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.16em] text-primary/65">
                    Current matchup
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                    {currentMatchup
                      ? `vs ${
                          currentMatchup.homeTeamId === team.id
                            ? currentMatchup.awayTeamName
                            : currentMatchup.homeTeamName
                        }`
                      : "Your next league matchup will appear here"}
                  </h2>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Scoring opens at match time, closes at midnight
                </span>
              </div>

              {currentMatchup ? (
                <div className="mt-5 rounded-3xl bg-white/82 p-5 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/65">
                        Week {currentMatchup.week}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-foreground">
                        {currentMatchup.homeTeamName} vs {currentMatchup.awayTeamName}
                      </p>
                    </div>
                    {currentMatchup.teamSubmission ? (
                      <div className="rounded-2xl bg-secondary/80 px-4 py-3 text-sm text-foreground">
                        You submitted{" "}
                        <span className="font-semibold">
                          {currentMatchup.teamSubmission.home_team_wins}-
                          {currentMatchup.teamSubmission.away_team_wins}
                        </span>
                        {currentMatchup.teamSubmission.result_type === "forfeit" ? (
                          <span className="ml-1">
                            (
                            {getForfeitLabel({
                              forfeitingTeamId: currentMatchup.teamSubmission.forfeiting_team_id,
                              homeTeamId: currentMatchup.homeTeamId,
                              homeTeamName: currentMatchup.homeTeamName,
                              awayTeamName: currentMatchup.awayTeamName
                            })}
                            )
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-secondary/55 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/65">
                        Date and time
                      </p>
                      <p className="mt-1 text-sm text-foreground">{currentMatchup.dateLabel}</p>
                    </div>
                    {currentMatchup.locationLabel ? (
                      <div className="rounded-2xl border border-border/70 bg-secondary/55 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/65">
                          Location
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {currentMatchup.locationLabel}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          "A" means the side of the court closer to Memorial Gym or Old Dorms. "B"
                          is the other side of the court.
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {opponentTeam ? (
                    <div className="mt-4 rounded-2xl border border-border/70 bg-secondary/55 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/65">
                        Opponent contact
                      </p>
                      <div className="mt-2 space-y-2 text-sm text-foreground">
                        <p className="font-semibold">{opponentTeam.team_name}</p>
                        <p>
                          {opponentTeam.player_one_name} • {opponentTeam.player_one_email}
                        </p>
                        <p>
                          {opponentTeam.player_two_name} • {opponentTeam.player_two_email}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <p className="mt-4 text-sm text-muted-foreground">
                    {currentMatchup.canSubmitNow
                      ? "Score reporting is open for this matchup until 11:59 PM tonight."
                      : "The Log score button will activate when your match time begins."}
                  </p>

                  <ScoreReportPanel
                    awayTeamId={currentMatchup.awayTeamId}
                    awayTeamName={currentMatchup.awayTeamName}
                    awayTeamWins={currentMatchup.teamSubmission?.away_team_wins ?? null}
                    currentTeamId={team.id}
                    homeTeamId={currentMatchup.homeTeamId}
                    homeTeamName={currentMatchup.homeTeamName}
                    homeTeamWins={currentMatchup.teamSubmission?.home_team_wins ?? null}
                    isOpen={currentMatchup.canSubmitNow}
                    matchDate={currentMatchup.matchDate}
                    slotId={currentMatchup.slotId}
                    teamSubmissionWinnerTeamId={currentMatchup.teamSubmission?.winner_team_id ?? null}
                    timeLabel={currentMatchup.timeLabel}
                    week={currentMatchup.week}
                  />

                  <p className="mt-3 text-sm text-muted-foreground">
                    {currentMatchup.opponentSubmission
                      ? "The other team has also submitted a result. If both reports match, standings update automatically."
                      : "Once the other team submits the same result, standings will update automatically."}
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-white/80 p-4 text-sm text-muted-foreground">
                  Your current matchup will appear here once your weekly schedule is generated.
                </div>
              )}
            </Card>

            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="p-6">
                <p className="text-sm uppercase tracking-[0.16em] text-primary/65">Current slot</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                  {activeReservation.day_label} • {activeReservation.time_label}
                </h2>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  Season runs from Monday, March 30 through Wednesday, April 22. You&apos;ll play four
                  weekly matches inside this slot.
                </p>
                <div className="mt-6 rounded-2xl bg-white/80 p-4">
                  <p className="text-sm text-muted-foreground">Teams in your slot</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(activeSlot?.teams || []).map((slotTeam) => (
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          slotTeam === team.team_name
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                        }`}
                        key={slotTeam}
                      >
                        {slotTeam}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <p className="text-sm uppercase tracking-[0.16em] text-primary/65">Quick notes</p>
                <div className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground">
                  <p>Each weekly matchup is best two out of three games.</p>
                  <p>
                    Opponents are pulled from the teams in your reserved time slot and locked into a
                    season rotation.
                  </p>
                  <p>
                    The fourth week repeats an earlier matchup so every team still plays four total
                    league games.
                  </p>
                </div>
              </Card>
            </div>

            {currentSlotStandings ? (
              <Card className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.16em] text-primary/65">
                      Your slot standings
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                      {currentSlotStandings.label}
                    </h2>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    Sorted by percentage
                  </span>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-border/70">
                  <div className="grid grid-cols-[1.6fr_0.6fr_0.6fr_0.8fr] bg-secondary/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary/75">
                    <span>Team</span>
                    <span>W</span>
                    <span>L</span>
                    <span>Pct</span>
                  </div>
                  {currentSlotStandings.teams.map((entry) => (
                    <div
                      className="grid grid-cols-[1.6fr_0.6fr_0.6fr_0.8fr] border-t border-border/60 px-4 py-3 text-sm text-foreground"
                      key={`${currentSlotStandings.slotId}-${entry.teamName}`}
                    >
                      <span className={entry.teamName === team.team_name ? "font-semibold text-primary" : ""}>
                        {entry.teamName}
                      </span>
                      <span>{entry.wins}</span>
                      <span>{entry.losses}</span>
                      <span>{entry.percentage.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.16em] text-primary/65">
                    Weekly schedule
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                    Your four league matchups
                  </h2>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  {teamSchedule.length} games
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {teamSchedule.map((game) => (
                  <div
                    className="rounded-3xl bg-white/82 p-5 shadow-soft"
                    key={`${game.week}-${game.homeTeamId}-${game.awayTeamId}`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/65">
                      Week {game.week}
                    </p>
                    <p className="mt-3 text-xl font-semibold text-foreground">
                      vs {game.homeTeamId === team.id ? game.awayTeamName : game.homeTeamName}
                    </p>
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/65">
                          Date and time
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{game.dateLabel}</p>
                      </div>
                      {game.locationLabel ? (
                        <div className="rounded-2xl border border-border/70 bg-secondary/55 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/65">
                            Location
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">{game.locationLabel}</p>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-4 text-sm font-medium text-primary">
                      {game.winnerTeamId
                        ? `Recorded result: ${
                            game.homeTeamWins !== null && game.awayTeamWins !== null
                              ? `${game.homeTeamWins}-${game.awayTeamWins}${
                                  game.resultType === "forfeit"
                                    ? ` (${getForfeitLabel({
                                        forfeitingTeamId: game.forfeitingTeamId,
                                        homeTeamId: game.homeTeamId,
                                        homeTeamName: game.homeTeamName,
                                        awayTeamName: game.awayTeamName
                                      })})`
                                    : ""
                                }`
                              : game.winnerTeamId === team.id
                                ? "Win"
                                : "Loss"
                          }`
                        : "Awaiting result"}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.16em] text-primary/65">Standings</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                    All slot standings
                  </h2>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Sorted by percentage
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Standings update as match results are recorded. Ties in percentage are broken by wins,
                then alphabetically.
              </p>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {standings.map((slotStanding) => (
                  <div className="rounded-3xl bg-white/82 p-5 shadow-soft" key={slotStanding.slotId}>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/65">
                      {slotStanding.label}
                    </p>
                    <div className="mt-4 overflow-hidden rounded-2xl border border-border/70">
                      <div className="grid grid-cols-[1.6fr_0.6fr_0.6fr_0.8fr] bg-secondary/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary/75">
                        <span>Team</span>
                        <span>W</span>
                        <span>L</span>
                        <span>Pct</span>
                      </div>
                      {slotStanding.teams.map((entry) => (
                        <div
                          className="grid grid-cols-[1.6fr_0.6fr_0.6fr_0.8fr] border-t border-border/60 px-4 py-3 text-sm text-foreground"
                          key={`${slotStanding.slotId}-${entry.teamName}`}
                        >
                          <span className={entry.teamName === team.team_name ? "font-semibold text-primary" : ""}>
                            {entry.teamName}
                          </span>
                          <span>{entry.wins}</span>
                          <span>{entry.losses}</span>
                          <span>{entry.percentage.toFixed(3)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
