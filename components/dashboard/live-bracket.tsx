import {
  buildPlayoffBracket,
  type PlayoffBracketEntry,
  type PlayoffBracketMatchup,
  type PlayoffBracketResultInput,
  type QualifiedPlayoffSeedRow
} from "@/lib/league-schedule";
import { cn } from "@/lib/utils";

type LiveBracketProps = {
  qualifiedSeeds: QualifiedPlayoffSeedRow[];
  currentTeamId?: string | null;
  results?: PlayoffBracketResultInput[];
  mode?: "player" | "admin";
  saveResultAction?: (formData: FormData) => void | Promise<void>;
};

type RoundLayout = {
  title: string;
  subtitle: string;
  matchups: PlayoffBracketMatchup[];
  desktopOffsetClass: string;
  desktopGapClass: string;
  hasIncomingConnector?: boolean;
  hasOutgoingConnector?: boolean;
};

function isSeed(entry: PlayoffBracketEntry): entry is QualifiedPlayoffSeedRow {
  return "teamId" in entry;
}

function BracketEntry({
  currentTeamId,
  entry,
  isWinner
}: {
  currentTeamId?: string | null;
  entry: PlayoffBracketEntry;
  isWinner?: boolean;
}) {
  if (!isSeed(entry)) {
    return (
      <div className="flex min-h-[68px] items-center justify-between rounded-xl border border-dashed border-border/70 bg-[rgba(255,255,255,0.72)] px-3 py-3 text-sm text-muted-foreground">
        <span className="font-medium">{entry.label}</span>
        <span className="text-xs uppercase tracking-[0.12em]">{entry.detail ?? "Projected"}</span>
      </div>
    );
  }

  const isCurrentTeam = Boolean(currentTeamId && entry.teamId === currentTeamId);

  return (
    <div
      className={cn(
        "min-h-[68px] rounded-xl border px-3 py-3 shadow-soft transition",
        isWinner
          ? "border-primary/40 bg-[linear-gradient(135deg,rgba(32,116,74,0.18),rgba(255,255,255,0.98))]"
          : isCurrentTeam
            ? "border-primary/30 bg-[linear-gradient(135deg,rgba(32,116,74,0.16),rgba(255,255,255,0.98))]"
            : "border-border/70 bg-[rgba(255,255,255,0.9)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/65">
            Seed {entry.seed}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">{entry.teamName}</p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{entry.slotLabel}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-foreground">
            {entry.wins}-{entry.losses}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {entry.forfeits} forfeit{entry.forfeits === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </div>
  );
}

function MatchupAdminControls({
  matchup,
  saveResultAction
}: {
  matchup: PlayoffBracketMatchup;
  saveResultAction?: (formData: FormData) => void | Promise<void>;
}) {
  if (!saveResultAction || !matchup.canPickWinner) {
    return null;
  }

  const options = [matchup.top, matchup.bottom].filter(isSeed);

  return (
    <form action={saveResultAction} className="mt-3 space-y-3 rounded-xl bg-white/85 p-3">
      <input name="matchupId" type="hidden" value={matchup.id} />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/65">
          Admin winner pick
        </p>
        <select
          className="mt-2 h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
          defaultValue={matchup.winnerTeamId ?? ""}
          name="winnerTeamId"
        >
          <option value="">No winner selected</option>
          {options.map((team) => (
            <option key={team.teamId} value={team.teamId}>
              {team.teamName}
            </option>
          ))}
        </select>
      </div>
      <button
        className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
        type="submit"
      >
        Save winner
      </button>
    </form>
  );
}

function MatchupCard({
  currentTeamId,
  hasIncomingConnector,
  hasOutgoingConnector,
  matchup,
  mode,
  saveResultAction
}: {
  currentTeamId?: string | null;
  hasIncomingConnector?: boolean;
  hasOutgoingConnector?: boolean;
  matchup: PlayoffBracketMatchup;
  mode: "player" | "admin";
  saveResultAction?: (formData: FormData) => void | Promise<void>;
}) {
  const winnerId = matchup.winner && isSeed(matchup.winner) ? matchup.winner.teamId : null;

  return (
    <div className="relative">
      {hasIncomingConnector ? (
        <div className="absolute -left-10 top-1/2 hidden h-px w-10 -translate-y-1/2 bg-[rgba(29,96,66,0.22)] xl:block" />
      ) : null}
      {hasOutgoingConnector ? (
        <div className="absolute -right-10 top-1/2 hidden h-px w-10 -translate-y-1/2 bg-[rgba(29,96,66,0.22)] xl:block" />
      ) : null}

      <div className="relative rounded-[22px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(245,247,244,0.92))] p-3 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/55">
            {matchup.label}
          </p>
          <div className="flex items-center gap-2">
            {winnerId ? (
              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                Winner locked
              </span>
            ) : null}
            <div className="hidden h-px w-8 bg-[rgba(29,96,66,0.18)] xl:block" />
          </div>
        </div>
        <div className="space-y-2">
          <BracketEntry
            currentTeamId={currentTeamId}
            entry={matchup.top}
            isWinner={winnerId !== null && isSeed(matchup.top) && matchup.top.teamId === winnerId}
          />
          <BracketEntry
            currentTeamId={currentTeamId}
            entry={matchup.bottom}
            isWinner={winnerId !== null && isSeed(matchup.bottom) && matchup.bottom.teamId === winnerId}
          />
        </div>

        {mode === "admin" ? (
          <MatchupAdminControls matchup={matchup} saveResultAction={saveResultAction} />
        ) : null}
      </div>
    </div>
  );
}

function RoundColumn({
  currentTeamId,
  layout,
  mode,
  saveResultAction
}: {
  currentTeamId?: string | null;
  layout: RoundLayout;
  mode: "player" | "admin";
  saveResultAction?: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="min-w-[260px] flex-1 xl:w-[260px] xl:flex-none">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/65">
          {layout.subtitle}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-foreground">{layout.title}</h3>
      </div>

      <div className={cn("space-y-4 xl:space-y-0", layout.desktopOffsetClass, layout.desktopGapClass)}>
        {layout.matchups.map((matchup) => (
          <MatchupCard
            currentTeamId={currentTeamId}
            hasIncomingConnector={layout.hasIncomingConnector}
            hasOutgoingConnector={layout.hasOutgoingConnector}
            key={matchup.id}
            matchup={matchup}
            mode={mode}
            saveResultAction={saveResultAction}
          />
        ))}
      </div>
    </div>
  );
}

function PlayInPlaceholder() {
  return (
    <div className="min-w-[220px] flex-1 xl:w-[220px] xl:flex-none">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/65">
          Opening round
        </p>
        <h3 className="mt-2 text-lg font-semibold text-foreground">Play-ins</h3>
      </div>
      <div className="rounded-[22px] border border-dashed border-border/70 bg-[rgba(255,255,255,0.62)] p-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Play-in matches will appear here when the field reaches all 18 playoff teams.
        </p>
      </div>
    </div>
  );
}

export function LiveBracket({
  currentTeamId,
  mode = "player",
  qualifiedSeeds,
  results = [],
  saveResultAction
}: LiveBracketProps) {
  const bracket = buildPlayoffBracket({
    qualifiedSeeds,
    results
  });
  const currentTeamSeed = currentTeamId
    ? bracket.field.find((seed) => seed.teamId === currentTeamId)
    : undefined;
  const rounds: RoundLayout[] = [
    {
      title: "Round of 16",
      subtitle: "Main bracket",
      matchups: bracket.roundOf16Matchups,
      desktopOffsetClass: "xl:pt-10",
      desktopGapClass: "xl:space-y-7",
      hasIncomingConnector: bracket.playInMatchups.length > 0,
      hasOutgoingConnector: true
    },
    {
      title: "Quarterfinals",
      subtitle: "Elite 8",
      matchups: bracket.quarterfinalMatchups,
      desktopOffsetClass: "xl:pt-[88px]",
      desktopGapClass: "xl:space-y-[74px]",
      hasIncomingConnector: true,
      hasOutgoingConnector: true
    },
    {
      title: "Semifinals",
      subtitle: "Final 4",
      matchups: bracket.semifinalMatchups,
      desktopOffsetClass: "xl:pt-[198px]",
      desktopGapClass: "xl:space-y-[188px]",
      hasIncomingConnector: true,
      hasOutgoingConnector: true
    },
    {
      title: "Championship",
      subtitle: "Final",
      matchups: bracket.finalMatchups,
      desktopOffsetClass: "xl:pt-[360px]",
      desktopGapClass: "xl:space-y-0",
      hasIncomingConnector: true,
      hasOutgoingConnector: false
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-primary/65">
            {mode === "admin" ? "Admin bracket" : "Live bracket"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
            League playoff picture
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Teams qualify only if they have at least 1 win, at least 3 total games played, and no
            more than 1 forfeit. Manual admin winner picks advance through the bracket everywhere
            this view is shown.
          </p>
        </div>
        <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/65">
            {mode === "admin" ? "Bracket status" : "Your spot"}
          </p>
          <p className="mt-2 text-base font-semibold text-foreground">
            {mode === "admin"
              ? bracket.currentChampion && isSeed(bracket.currentChampion)
                ? `${bracket.currentChampion.teamName} is champion`
                : `${bracket.field.length} teams currently in the field`
              : currentTeamSeed
                ? `Projected Seed ${currentTeamSeed.seed}`
                : "Outside the playoff field"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "admin"
              ? `${results.length} playoff result${results.length === 1 ? "" : "s"} saved`
              : currentTeamSeed
                ? `${currentTeamSeed.wins}-${currentTeamSeed.losses} with ${currentTeamSeed.forfeits} forfeits`
                : `${bracket.field.length} teams currently qualify`}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[1120px] rounded-[30px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),rgba(238,243,238,0.78)_55%,rgba(232,239,232,0.94))] p-5 shadow-soft xl:p-6">
          <div className="flex gap-5 xl:gap-10">
            {bracket.playInMatchups.length > 0 ? (
              <div className="min-w-[220px] flex-1 xl:w-[220px] xl:flex-none">
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/65">
                    Opening round
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">Play-ins</h3>
                </div>
                <div className="xl:pt-[290px] xl:space-y-[124px]">
                  {bracket.playInMatchups.map((matchup) => (
                    <MatchupCard
                      currentTeamId={currentTeamId}
                      hasIncomingConnector={false}
                      hasOutgoingConnector
                      key={matchup.id}
                      matchup={matchup}
                      mode={mode}
                      saveResultAction={saveResultAction}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <PlayInPlaceholder />
            )}

            {rounds.map((layout) => (
              <RoundColumn
                currentTeamId={currentTeamId}
                key={layout.title}
                layout={layout}
                mode={mode}
                saveResultAction={saveResultAction}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[26px] border border-white/70 bg-[rgba(255,255,255,0.68)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/65">
              Qualified teams
            </p>
            <p className="mt-2 text-base font-semibold text-foreground">
              Current 18-team playoff field
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {bracket.field.length} teams
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {bracket.field.map((seed) => (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3",
                currentTeamId && seed.teamId === currentTeamId
                  ? "border-primary/30 bg-primary/10"
                  : "border-border/70 bg-white/75"
              )}
              key={seed.teamId}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/65">
                    Seed {seed.seed}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{seed.teamName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{seed.slotLabel}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{seed.wins}-{seed.losses}</p>
                  <p>{seed.forfeits} forfeits</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
