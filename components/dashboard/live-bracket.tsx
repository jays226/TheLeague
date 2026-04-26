import { type QualifiedPlayoffSeedRow } from "@/lib/league-schedule";
import { cn } from "@/lib/utils";

type LiveBracketProps = {
  qualifiedSeeds: QualifiedPlayoffSeedRow[];
  currentTeamId: string;
};

type PlaceholderEntry = {
  label: string;
  detail?: string;
};

type SeedOrPlaceholder = QualifiedPlayoffSeedRow | PlaceholderEntry;

type Matchup = {
  id: string;
  label: string;
  top: SeedOrPlaceholder;
  bottom: SeedOrPlaceholder;
};

type RoundLayout = {
  title: string;
  subtitle: string;
  matchups: Matchup[];
  desktopOffsetClass: string;
  desktopGapClass: string;
  hasIncomingConnector?: boolean;
  hasOutgoingConnector?: boolean;
};

function isSeed(entry: SeedOrPlaceholder): entry is QualifiedPlayoffSeedRow {
  return "teamId" in entry;
}

function makePlayInMatchups(seeds: QualifiedPlayoffSeedRow[]) {
  const playInPool = seeds.slice(14, 18);

  if (playInPool.length < 4) {
    return [] as Matchup[];
  }

  return [
    {
      id: "play-in-1",
      label: "Play-in 1",
      top: playInPool[0],
      bottom: playInPool[3]
    },
    {
      id: "play-in-2",
      label: "Play-in 2",
      top: playInPool[1],
      bottom: playInPool[2]
    }
  ] satisfies Matchup[];
}

function makeRoundOf16Matchups(seeds: QualifiedPlayoffSeedRow[]) {
  const topSeeds = seeds.slice(0, Math.min(seeds.length, 14));

  return [
    {
      id: "r16-a",
      label: "A",
      top: topSeeds[0] ?? { label: "Seed 1" },
      bottom: seeds.length >= 18 ? { label: "Winner of Play-in 2" } : topSeeds[13] ?? { label: "TBD" }
    },
    {
      id: "r16-b",
      label: "B",
      top: topSeeds[7] ?? { label: "Seed 8" },
      bottom: topSeeds[8] ?? { label: "Seed 9" }
    },
    {
      id: "r16-c",
      label: "C",
      top: topSeeds[4] ?? { label: "Seed 5" },
      bottom: topSeeds[11] ?? { label: "Seed 12" }
    },
    {
      id: "r16-d",
      label: "D",
      top: topSeeds[3] ?? { label: "Seed 4" },
      bottom: topSeeds[12] ?? { label: "Seed 13" }
    },
    {
      id: "r16-e",
      label: "E",
      top: topSeeds[2] ?? { label: "Seed 3" },
      bottom: topSeeds[13] ?? { label: "Seed 14" }
    },
    {
      id: "r16-f",
      label: "F",
      top: topSeeds[5] ?? { label: "Seed 6" },
      bottom: topSeeds[9] ?? { label: "Seed 10" }
    },
    {
      id: "r16-g",
      label: "G",
      top: topSeeds[1] ?? { label: "Seed 2" },
      bottom: seeds.length >= 18 ? { label: "Winner of Play-in 1" } : topSeeds[10] ?? { label: "Seed 11" }
    },
    {
      id: "r16-h",
      label: "H",
      top: topSeeds[6] ?? { label: "Seed 7" },
      bottom: topSeeds[10] ?? { label: "Seed 11" }
    }
  ] satisfies Matchup[];
}

function makeQuarterfinals() {
  return [
    { id: "qf-1", label: "QF1", top: { label: "Winner of A" }, bottom: { label: "Winner of B" } },
    { id: "qf-2", label: "QF2", top: { label: "Winner of C" }, bottom: { label: "Winner of D" } },
    { id: "qf-3", label: "QF3", top: { label: "Winner of E" }, bottom: { label: "Winner of F" } },
    { id: "qf-4", label: "QF4", top: { label: "Winner of G" }, bottom: { label: "Winner of H" } }
  ] satisfies Matchup[];
}

function makeSemifinals() {
  return [
    { id: "sf-1", label: "SF1", top: { label: "Winner of QF1" }, bottom: { label: "Winner of QF2" } },
    { id: "sf-2", label: "SF2", top: { label: "Winner of QF3" }, bottom: { label: "Winner of QF4" } }
  ] satisfies Matchup[];
}

function makeFinal() {
  return [
    { id: "final", label: "Final", top: { label: "Winner of SF1" }, bottom: { label: "Winner of SF2" } }
  ] satisfies Matchup[];
}

function BracketEntry({
  entry,
  currentTeamId
}: {
  entry: SeedOrPlaceholder;
  currentTeamId: string;
}) {
  if (!isSeed(entry)) {
    return (
      <div className="flex min-h-[68px] items-center justify-between rounded-xl border border-dashed border-border/70 bg-[rgba(255,255,255,0.72)] px-3 py-3 text-sm text-muted-foreground">
        <span className="font-medium">{entry.label}</span>
        <span className="text-xs uppercase tracking-[0.12em]">{entry.detail ?? "Projected"}</span>
      </div>
    );
  }

  const isCurrentTeam = entry.teamId === currentTeamId;

  return (
    <div
      className={cn(
        "min-h-[68px] rounded-xl border px-3 py-3 shadow-soft transition",
        isCurrentTeam
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

function MatchupCard({
  matchup,
  currentTeamId,
  hasIncomingConnector,
  hasOutgoingConnector
}: {
  matchup: Matchup;
  currentTeamId: string;
  hasIncomingConnector?: boolean;
  hasOutgoingConnector?: boolean;
}) {
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
          <div className="hidden h-px w-8 bg-[rgba(29,96,66,0.18)] xl:block" />
        </div>
        <div className="space-y-2">
          <BracketEntry currentTeamId={currentTeamId} entry={matchup.top} />
          <BracketEntry currentTeamId={currentTeamId} entry={matchup.bottom} />
        </div>
      </div>
    </div>
  );
}

function RoundColumn({
  layout,
  currentTeamId
}: {
  layout: RoundLayout;
  currentTeamId: string;
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
          Play-in matches will appear here if the qualified field fills all 18 playoff spots.
        </p>
      </div>
    </div>
  );
}

export function LiveBracket({ qualifiedSeeds, currentTeamId }: LiveBracketProps) {
  const field = qualifiedSeeds.slice(0, 18);
  const currentTeamSeed = field.find((seed) => seed.teamId === currentTeamId);
  const playInMatchups = makePlayInMatchups(field);

  const rounds: RoundLayout[] = [
    {
      title: "Round of 16",
      subtitle: "Main bracket",
      matchups: makeRoundOf16Matchups(field),
      desktopOffsetClass: "xl:pt-10",
      desktopGapClass: "xl:space-y-7",
      hasIncomingConnector: playInMatchups.length > 0,
      hasOutgoingConnector: true
    },
    {
      title: "Quarterfinals",
      subtitle: "Elite 8",
      matchups: makeQuarterfinals(),
      desktopOffsetClass: "xl:pt-[88px]",
      desktopGapClass: "xl:space-y-[74px]",
      hasIncomingConnector: true,
      hasOutgoingConnector: true
    },
    {
      title: "Semifinals",
      subtitle: "Final 4",
      matchups: makeSemifinals(),
      desktopOffsetClass: "xl:pt-[198px]",
      desktopGapClass: "xl:space-y-[188px]",
      hasIncomingConnector: true,
      hasOutgoingConnector: true
    },
    {
      title: "Championship",
      subtitle: "Final",
      matchups: makeFinal(),
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
          <p className="text-sm uppercase tracking-[0.16em] text-primary/65">Live bracket</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
            League playoff picture
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Teams qualify with at least 1 win and no more than 1 forfeit. When the field reaches 18
            teams, Seeds 15 through 18 open in play-ins before the full bracket begins.
          </p>
        </div>
        <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/65">
            Your spot
          </p>
          <p className="mt-2 text-base font-semibold text-foreground">
            {currentTeamSeed ? `Projected Seed ${currentTeamSeed.seed}` : "Outside the playoff field"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentTeamSeed
              ? `${currentTeamSeed.wins}-${currentTeamSeed.losses} with ${currentTeamSeed.forfeits} forfeits`
              : `${field.length} teams currently qualify`}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[1120px] rounded-[30px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),rgba(238,243,238,0.78)_55%,rgba(232,239,232,0.94))] p-5 shadow-soft xl:p-6">
          <div className="flex gap-5 xl:gap-10">
            {playInMatchups.length > 0 ? (
              <div className="min-w-[220px] flex-1 xl:w-[220px] xl:flex-none">
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/65">
                    Opening round
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">Play-ins</h3>
                </div>
                <div className="xl:pt-[290px] xl:space-y-[124px]">
                  {playInMatchups.map((matchup) => (
                    <MatchupCard
                      currentTeamId={currentTeamId}
                      hasIncomingConnector={false}
                      hasOutgoingConnector
                      key={matchup.id}
                      matchup={matchup}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <PlayInPlaceholder />
            )}

            {rounds.map((layout) => (
              <RoundColumn currentTeamId={currentTeamId} key={layout.title} layout={layout} />
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
            {field.length} teams
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {field.map((seed) => (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3",
                seed.teamId === currentTeamId
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
