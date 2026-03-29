"use client";

import { useState } from "react";

import { submitGameResultAction } from "@/app/app/actions";

type ScoreReportPanelProps = {
  awayTeamId: string;
  awayTeamName: string;
  awayTeamWins: number | null;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamWins: number | null;
  isOpen: boolean;
  matchDate: string;
  slotId: string;
  teamSubmissionWinnerTeamId: string | null;
  timeLabel: string;
  week: number;
};

export function ScoreReportPanel({
  awayTeamId,
  awayTeamName,
  awayTeamWins,
  homeTeamId,
  homeTeamName,
  homeTeamWins,
  isOpen,
  matchDate,
  slotId,
  teamSubmissionWinnerTeamId,
  timeLabel,
  week
}: ScoreReportPanelProps) {
  const [expanded, setExpanded] = useState(false);

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
        <form action={submitGameResultAction} className="mt-4 grid gap-3 md:grid-cols-[1.1fr_0.8fr_0.8fr_auto]">
          <input name="slotId" type="hidden" value={slotId} />
          <input name="week" type="hidden" value={String(week)} />
          <input name="matchDate" type="hidden" value={matchDate} />
          <input name="timeLabel" type="hidden" value={timeLabel} />
          <input name="homeTeamId" type="hidden" value={homeTeamId} />
          <input name="awayTeamId" type="hidden" value={awayTeamId} />

          <select
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
            defaultValue={teamSubmissionWinnerTeamId ?? ""}
            name="winnerTeamId"
            required
          >
            <option disabled value="">
              Select the winner
            </option>
            <option value={homeTeamId}>{homeTeamName}</option>
            <option value={awayTeamId}>{awayTeamName}</option>
          </select>
          <input
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
            defaultValue={homeTeamWins === null ? "" : String(homeTeamWins)}
            inputMode="numeric"
            max="3"
            min="0"
            name="homeTeamWins"
            placeholder={`${homeTeamName} wins out of 3`}
            required
            type="number"
          />
          <input
            className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
            defaultValue={awayTeamWins === null ? "" : String(awayTeamWins)}
            inputMode="numeric"
            max="3"
            min="0"
            name="awayTeamWins"
            placeholder={`${awayTeamName} wins out of 3`}
            required
            type="number"
          />
          <button
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
            type="submit"
          >
            Save score
          </button>
        </form>
      ) : null}
    </div>
  );
}
