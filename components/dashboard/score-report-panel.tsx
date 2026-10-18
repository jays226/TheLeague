"use client";

import { useState } from "react";

import { submitGameResultAction } from "@/app/app/actions";

type ScoreReportPanelProps = {
  awayTeamId: string;
  awayTeamName: string;
  gameScores: Array<{ home: number; away: number }> | null;
  currentTeamId: string;
  homeTeamId: string;
  homeTeamName: string;
  isOpen: boolean;
  matchDate: string;
  slotId: string;
  timeLabel: string;
  week: number;
};

export function ScoreReportPanel({
  awayTeamId,
  awayTeamName,
  gameScores,
  currentTeamId,
  homeTeamId,
  homeTeamName,
  isOpen,
  matchDate,
  slotId,
  timeLabel,
  week
}: ScoreReportPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [reportType, setReportType] = useState<"standard" | "opponent-forfeit" | "team-forfeit">(
    "standard"
  );
  const currentTeamIsHome = currentTeamId === homeTeamId;
  const forfeitWinnerTeamId =
    reportType === "opponent-forfeit"
      ? currentTeamIsHome
        ? homeTeamId
        : awayTeamId
      : currentTeamIsHome
        ? awayTeamId
        : homeTeamId;
  const forfeitHomeWins =
    reportType === "opponent-forfeit"
      ? currentTeamIsHome
        ? 2
        : 0
      : currentTeamIsHome
        ? 0
        : 2;
  const forfeitAwayWins =
    reportType === "opponent-forfeit"
      ? currentTeamIsHome
        ? 0
        : 2
      : currentTeamIsHome
        ? 2
        : 0;

  if (!isOpen) {
    return (
      <button
        className="inline-flex h-11 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-muted-foreground"
        disabled
        type="button"
      >
        Log score
      </button>
    );
  }

  return (
    <div className="mt-5">
      <button
        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        {expanded ? "Hide score form" : "Log score"}
      </button>

      {expanded ? (
        <form action={submitGameResultAction} className="mt-4 space-y-4">
          <input name="slotId" type="hidden" value={slotId} />
          <input name="week" type="hidden" value={String(week)} />
          <input name="matchDate" type="hidden" value={matchDate} />
          <input name="timeLabel" type="hidden" value={timeLabel} />
          <input name="homeTeamId" type="hidden" value={homeTeamId} />
          <input name="awayTeamId" type="hidden" value={awayTeamId} />
          <input
            name="resultType"
            type="hidden"
            value={reportType === "standard" ? "standard" : "forfeit"}
          />
          <input
            name="forfeitingTeamId"
            type="hidden"
            value={
              reportType === "team-forfeit"
                ? currentTeamId
                : reportType === "opponent-forfeit"
                  ? currentTeamIsHome
                    ? awayTeamId
                    : homeTeamId
                  : ""
            }
          />

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/65">
              Report type
            </p>
            <div className="grid gap-2 md:grid-cols-3">
              {[
                ["standard", "Normal result"],
                ["opponent-forfeit", "Other team forfeited"],
                ["team-forfeit", "We forfeited"]
              ].map(([value, label]) => (
                <button
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    reportType === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-white text-foreground hover:bg-secondary/55"
                  }`}
                  key={value}
                  onClick={() =>
                    setReportType(value as "standard" | "opponent-forfeit" | "team-forfeit")
                  }
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {reportType === "standard" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter each game&apos;s points. Leave Game 3 blank if the match ended 2–0.
              </p>
              {[0, 1, 2].map((index) => (
                <div className="grid items-center gap-2 sm:grid-cols-[5rem_1fr_1fr]" key={index}>
                  <span className="text-sm font-semibold text-foreground">Game {index + 1}</span>
                  <label className="sr-only" htmlFor={`game-${index + 1}-home-score`}>{homeTeamName} game {index + 1} score</label>
                  <input
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                    defaultValue={gameScores?.[index]?.home ?? ""}
                    id={`game-${index + 1}-home-score`}
                    inputMode="numeric"
                    min="0"
                    name={`game${index + 1}HomeScore`}
                    placeholder={`${homeTeamName} points`}
                    required={index < 2}
                    type="number"
                  />
                  <label className="sr-only" htmlFor={`game-${index + 1}-away-score`}>{awayTeamName} game {index + 1} score</label>
                  <input
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                    defaultValue={gameScores?.[index]?.away ?? ""}
                    id={`game-${index + 1}-away-score`}
                    inputMode="numeric"
                    min="0"
                    name={`game${index + 1}AwayScore`}
                    placeholder={`${awayTeamName} points`}
                    required={index < 2}
                    type="number"
                  />
                </div>
              ))}
              <button
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
                type="submit"
              >
                Save game scores
              </button>
            </div>
          ) : (
            <>
              <input name="winnerTeamId" type="hidden" value={forfeitWinnerTeamId} />
              <input name="homeTeamWins" type="hidden" value={String(forfeitHomeWins)} />
              <input name="awayTeamWins" type="hidden" value={String(forfeitAwayWins)} />
              <div className="rounded-2xl border border-border/70 bg-secondary/55 px-4 py-3 text-sm text-foreground">
                {reportType === "opponent-forfeit"
                  ? "This will record a 2-0 win by forfeit because the other team did not show up."
                  : "This will record a 2-0 loss by forfeit for your team."}
              </div>
              <button
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
                type="submit"
              >
                Save forfeit
              </button>
            </>
          )}
        </form>
      ) : null}
    </div>
  );
}
