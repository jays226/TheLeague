import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CopyTextButton } from "@/components/admin/copy-text-button";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { LiveBracket } from "@/components/dashboard/live-bracket";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  generatePlayoffBracketAction,
  publishPlayoffBracketAction,
  recalculatePlayoffsAction,
  resetPlayoffBracketAction,
  savePlayoffMatchResultAction,
  savePlayoffQualificationAction
} from "@/app/admin/playoffs/actions";
import { getAdminSession, listPlayoffGameResults, purgeExpiredAdminSessions } from "@/lib/db";
import { env } from "@/lib/env";
import { getPlayoffAdminData } from "@/lib/playoff-admin-data";
import type { PlayoffQualificationStatus } from "@/lib/playoff-qualification";
import { adminCookieName, hashAdminSessionToken } from "@/lib/session";

const statusLabels: Record<PlayoffQualificationStatus, string> = {
  automatic_qualifier: "Automatic Qualifier",
  wild_card: "Wild Card",
  eliminated: "Eliminated",
  ineligible: "Ineligible · More Than 1 Forfeit",
  withdrawn: "Withdrawn · Unavailable",
  pending_review: "Pending Review"
};

function statusClass(status: PlayoffQualificationStatus) {
  if (status === "automatic_qualifier") return "bg-primary/10 text-primary";
  if (status === "wild_card") return "bg-blue-100 text-blue-900";
  if (status === "ineligible") return "bg-red-100 text-red-900";
  if (status === "withdrawn") return "bg-red-100 text-red-900";
  if (status === "pending_review") return "bg-amber-100 text-amber-950";
  return "bg-secondary text-secondary-foreground";
}

function labelStatus(status: PlayoffQualificationStatus) {
  return statusLabels[status];
}

export default async function AdminPlayoffsPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string; error?: string; team?: string }>;
}) {
  const params = await searchParams;
  const token = (await cookies()).get(adminCookieName)?.value;
  await purgeExpiredAdminSessions();
  if (!env.adminPortalPassword || !token || !(await getAdminSession(hashAdminSessionToken(token)))) {
    redirect("/admin");
  }

  const [data, results] = await Promise.all([getPlayoffAdminData(), listPlayoffGameResults()]);
  const { teams, teamById, qualificationRows, previewSeeds, state } = data;
  const isPublished = state.is_published;
  const selectedTeamId = params.team && teams.some((team) => team.id === params.team) ? params.team : "all";
  const qualifiedRows = previewSeeds.map((seed) => ({
    ...seed,
    qualificationType: seed.qualificationType ??
      (qualificationRows.find((row) => row.teamId === seed.teamId)?.status === "wild_card" ? "wild_card" as const : "automatic_qualifier" as const)
  }));
  const emailPlayerRows = qualifiedRows.flatMap((seed) => {
    const team = teamById.get(seed.teamId);
    if (!team || (selectedTeamId !== "all" && selectedTeamId !== team.id)) return [];
    return [
      { name: team.player_one_name, email: team.player_one_email, teamName: team.team_name, slotLabel: seed.slotLabel, seed: seed.seed, type: seed.qualificationType },
      { name: team.player_two_name, email: team.player_two_email, teamName: team.team_name, slotLabel: seed.slotLabel, seed: seed.seed, type: seed.qualificationType }
    ];
  });
  const deduplicatedEmailRows = emailPlayerRows.filter((row, index, rows) =>
    !row.email || rows.findIndex((entry) => entry.email.toLowerCase() === row.email.toLowerCase()) === index
  );
  const emailAddresses = [...new Set(emailPlayerRows.map((row) => row.email.trim()).filter(Boolean))];
  const announcement = [
    "Subject: The League Playoffs — Sunday, November 15",
    "",
    "The Fall 2026 regular season is complete. Congratulations to the 16 teams advancing to the playoffs!",
    "",
    "Playoffs: Sunday, November 15, 2026, from 12–3 PM.",
    "",
    "Twelve teams qualified automatically as the top two eligible teams in each time slot. Four additional eligible teams qualified as wild cards based on win percentage, average adjusted point differential, and total points scored.",
    "Teams with more than one regular-season forfeit are ineligible.",
    "",
    "Seeds and teams:",
    ...qualifiedRows.map((seed) => `${seed.seed}. ${seed.teamName} (${seed.qualificationType === "wild_card" ? "Wild Card" : "Automatic Qualifier"})`)
  ].join("\n");
  const automaticCount = qualificationRows.filter((row) => row.status === "automatic_qualifier").length;
  const wildcardCount = qualificationRows.filter((row) => row.status === "wild_card").length;
  const pendingCount = qualificationRows.filter((row) => row.status === "pending_review").length;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f3eb_0%,#eef3ee_100%)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge>Admin portal</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">Playoffs</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Review the 16-team field, lock the bracket, record match scores, and prepare the player announcement.
            </p>
          </div>
          <Link className="inline-flex h-11 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-secondary-foreground" href="/admin">
            Back to admin
          </Link>
        </header>

        <nav className="sticky top-2 z-10 flex flex-wrap gap-2 rounded-2xl border border-white/70 bg-[#f8f6f0]/95 p-2 shadow-soft backdrop-blur">
          {[["qualification", "Qualification"], ["bracket", "Bracket"], ["email-list", "Email List"], ["announcement", "Announcement"]].map(([id, label]) => (
            <a className="rounded-xl px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-white" href={`#${id}`} key={id}>{label}</a>
          ))}
        </nav>

        {params.error || params.success ? (
          <div className={`rounded-2xl px-4 py-3 text-sm ${params.error ? "border border-red-200 bg-red-50 text-red-900" : "border border-green-200 bg-green-50 text-green-900"}`}>
            {params.error ?? params.success}
          </div>
        ) : null}

        {data.withdrawnTeamInPublishedBracket ? (
          <Card className="border border-amber-200 bg-amber-50/85 p-5 text-amber-950">
            <h2 className="font-semibold">Published bracket includes an unavailable team</h2>
            <p className="mt-2 text-sm leading-6">
              No Dinking and Driving is now excluded from qualification. Unlock and reset the bracket, then generate and publish it again to replace them with the next eligible team. Resetting clears any playoff scores already entered.
            </p>
          </Card>
        ) : null}

        {(data.unresolvedMatchups.length > 0 || data.missingPointScores.length > 0) ? (
          <Card className="border border-amber-200 bg-amber-50/85 p-5 text-amber-950">
            <h2 className="font-semibold">Regular-season results need review</h2>
            <p className="mt-2 text-sm leading-6">
              {data.unresolvedMatchups.length} unresolved match{data.unresolvedMatchups.length === 1 ? "" : "es"} and {data.missingPointScores.length} finalized match{data.missingPointScores.length === 1 ? "" : "es"} without point scores. Only finalized matches count; rankings remain provisional until these are reviewed.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {data.unresolvedMatchups.slice(0, 8).map((game) => <span key={`${game.week}-${game.homeTeamId}-${game.awayTeamId}`}>Week {game.week}: {game.homeTeamName} vs {game.awayTeamName}</span>)}
              {data.missingPointScores.slice(0, 8).map((game) => <span key={`missing-${game.week}-${game.homeTeamId}-${game.awayTeamId}`}>Missing points: {game.homeTeamName} vs {game.awayTeamName}</span>)}
            </div>
          </Card>
        ) : null}

        <section className="scroll-mt-24 space-y-5" id="qualification">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[[`${teams.length}`, "Total teams"], ["12", "Automatic qualifiers"], ["4", "Wild cards"], ["16", "Playoff spots"]].map(([value, label]) => (
              <Card className="p-5" key={label}><p className="text-3xl font-semibold text-foreground">{value}</p><p className="mt-1 text-sm text-muted-foreground">{label}</p></Card>
            ))}
          </div>
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Playoff qualification</h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
                  Top two eligible teams in each time slot qualify automatically; four wild cards follow. Ranking uses win percentage, average adjusted point differential, then total points scored. Forfeit penalties count in adjusted differential; more than one forfeit makes a team ineligible.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Current preview: {automaticCount} automatic, {wildcardCount} wild cards, {pendingCount} pending review.</p>
              </div>
              <form action={recalculatePlayoffsAction}>
                <button className="inline-flex h-10 items-center justify-center rounded-xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground" type="submit">Recalculate Playoffs</button>
              </form>
            </div>

            <form action={savePlayoffQualificationAction} className="mt-5">
              <div className="overflow-x-auto rounded-2xl border border-border/70">
                <table className="w-full min-w-[1150px] border-collapse text-left text-sm">
                  <thead className="bg-secondary/70 text-xs uppercase tracking-[0.1em] text-primary/75">
                    <tr>{["Team", "Time slot", "W–L", "Win %", "Adj. diff", "Forfeits", "Rank", "Qualification status", "Override reason"].map((label) => <th className="px-3 py-3 font-semibold" key={label}>{label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {qualificationRows.map((row) => (
                      <tr className="border-t border-border/60 align-top even:bg-white/35" key={row.teamId}>
                        <td className="px-3 py-3 font-semibold">{row.teamName}</td>
                        <td className="px-3 py-3">{row.slotLabel}</td>
                        <td className="px-3 py-3 whitespace-nowrap">{row.wins}–{row.losses}</td>
                        <td className="px-3 py-3">{row.winPercentage.toFixed(3)}</td>
                        <td className="px-3 py-3">{row.adjustedPointDifferential > 0 ? "+" : ""}{row.adjustedPointDifferential}<span className="ml-1 text-xs text-muted-foreground">({row.averagePointDifferential.toFixed(1)}/game)</span></td>
                        <td className="px-3 py-3">{row.forfeits}</td>
                        <td className="px-3 py-3">{row.overallRank ?? "—"}</td>
                        <td className="px-3 py-3">
                          {isPublished || row.status === "ineligible" || row.status === "withdrawn" ? (
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(row.status)}`}>{labelStatus(row.status)}</span>
                          ) : (
                            <select className="h-9 rounded-lg border border-border bg-white px-2 text-xs" defaultValue={row.status} name={`status-${row.teamId}`}>
                              <option value="automatic_qualifier">Automatic Qualifier</option>
                              <option value="wild_card">Wild Card</option>
                              <option value="eliminated">Eliminated</option>
                              <option value="pending_review">Pending Review</option>
                            </select>
                          )}
                          {row.status === "ineligible" ? <input name={`status-${row.teamId}`} type="hidden" value="ineligible" /> : null}
                        </td>
                        <td className="px-3 py-3">
                          {isPublished ? row.overrideReason ?? "—" : (
                            <input className="h-9 min-w-48 rounded-lg border border-border bg-white px-2 text-xs" defaultValue={row.overrideReason ?? ""} name={`reason-${row.teamId}`} placeholder={row.overrideReason ? "Reason" : "Required if changed"} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!isPublished ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <ConfirmSubmitButton className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground" confirmation="Save these qualification decisions? Any changed decision needs a reason and will be recorded for review.">Save qualification decisions</ConfirmSubmitButton>
                  <span className="text-xs text-muted-foreground">Teams with more than one forfeit cannot be manually qualified.</span>
                </div>
              ) : <p className="mt-4 text-sm font-semibold text-primary">Qualification and seeds are locked while the bracket is published.</p>}
            </form>
          </Card>
        </section>

        <section className="scroll-mt-24 space-y-5" id="bracket">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">16-team playoff bracket</h2>
                <p className="mt-2 text-sm text-muted-foreground">Sunday, November 15, 2026 · 12–3 PM</p>
                <p className="mt-1 text-sm text-muted-foreground">{isPublished ? "Published · seeds locked" : state.bracket_snapshot ? "Generated draft · not published" : "Preview only · not generated"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!isPublished ? <form action={generatePlayoffBracketAction}><ConfirmSubmitButton className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground" confirmation="Generate a new bracket? This clears any previously recorded playoff results.">Generate Bracket</ConfirmSubmitButton></form> : null}
                {state.bracket_snapshot && !isPublished ? <form action={publishPlayoffBracketAction}><ConfirmSubmitButton className="inline-flex h-10 items-center justify-center rounded-xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground" confirmation="Publish and lock these 16 seeds and matchups?">Publish Bracket</ConfirmSubmitButton></form> : null}
                {(state.bracket_snapshot || isPublished) ? <form action={resetPlayoffBracketAction}><ConfirmSubmitButton className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-800" confirmation="Unlock and reset this bracket? This permanently clears all playoff scores and later-round advancement.">{isPublished ? "Unlock & Reset Bracket" : "Reset Bracket"}</ConfirmSubmitButton></form> : null}
              </div>
            </div>
            {previewSeeds.length === 16 ? (
              <div className="mt-6">
                <LiveBracket
                  mode="admin"
                  qualifiedSeeds={qualifiedRows}
                  results={results.map((result) => ({ matchupId: result.matchup_id, winnerTeamId: result.winner_team_id, homeGamesWon: result.home_games_won, awayGamesWon: result.away_games_won }))}
                  saveResultAction={isPublished ? savePlayoffMatchResultAction : undefined}
                />
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">The bracket preview needs 16 selected teams and no unresolved qualification reviews. Current preview has {previewSeeds.length} teams.</p>
            )}
          </Card>
        </section>

        <section className="scroll-mt-24 space-y-5" id="email-list">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Playoff email list</h2>
                <p className="mt-2 text-sm text-muted-foreground">Qualified team contacts from the current bracket preview or locked bracket.</p>
              </div>
              <a className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground" href="/api/admin/playoffs/roster">Download CSV</a>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <CopyTextButton label="Copy All Emails" text={emailAddresses.join(", ")} />
              <CopyTextButton label="Copy BCC Emails" text={emailAddresses.join(", ")} />
              <form action="/admin/playoffs#email-list" className="flex items-center gap-2" method="get">
                <label className="text-sm font-medium" htmlFor="playoff-team-filter">View</label>
                <select className="h-10 rounded-xl border border-border bg-white px-3 text-sm" defaultValue={selectedTeamId} id="playoff-team-filter" name="team">
                  <option value="all">All playoff teams</option>
                  {qualifiedRows.map((seed) => <option key={seed.teamId} value={seed.teamId}>{seed.teamName}</option>)}
                </select>
                <button className="h-10 rounded-xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground" type="submit">View</button>
              </form>
            </div>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-border/70">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-secondary/70 text-xs uppercase tracking-[0.1em] text-primary/75"><tr>{["Seed", "Qualification", "Team", "Time slot", "Player", "Email"].map((label) => <th className="px-3 py-3 font-semibold" key={label}>{label}</th>)}</tr></thead>
                <tbody>{deduplicatedEmailRows.map((row) => <tr className="border-t border-border/60" key={`${row.teamName}-${row.email || row.name}`}><td className="px-3 py-3">{row.seed}</td><td className="px-3 py-3">{row.type === "wild_card" ? "Wild Card" : "Automatic"}</td><td className="px-3 py-3 font-semibold">{row.teamName}</td><td className="px-3 py-3">{row.slotLabel}</td><td className="px-3 py-3">{row.name}</td><td className="px-3 py-3">{row.email || <span className="font-semibold text-red-800">Missing contact information</span>}</td></tr>)}</tbody>
              </table>
            </div>
          </Card>
        </section>

        <section className="scroll-mt-24" id="announcement">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold text-foreground">Playoff announcement</h2>
            <p className="mt-2 text-sm text-muted-foreground">Review and copy this draft. It will not send automatically.</p>
            <pre className="mt-4 max-h-[480px] overflow-auto whitespace-pre-wrap rounded-2xl bg-white/80 p-5 text-sm leading-6 text-foreground">{announcement}</pre>
            <div className="mt-4"><CopyTextButton label="Copy Announcement" text={announcement} /></div>
          </Card>
        </section>
      </div>
    </main>
  );
}
