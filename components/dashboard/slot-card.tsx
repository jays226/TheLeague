"use client";

type SlotCardProps = {
  slot: {
    id: string;
    dayLabel: string;
    timeLabel: string;
    capacity: number;
    reservedCount: number;
    availableSpots: number;
    isFull: boolean;
    teams: string[];
  };
  status: "available" | "full" | "reserved";
  buttonLabel: string;
  disabled: boolean;
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage?: string;
};

export function SlotCard({
  slot,
  status,
  buttonLabel,
  disabled,
  action,
  confirmMessage
}: SlotCardProps) {
  const teams = slot.teams ?? [];

  return (
    <div
      className={`rounded-[24px] border p-5 transition ${
        status === "reserved"
          ? "border-primary bg-[rgba(29,96,66,0.08)]"
          : status === "full"
            ? "border-[rgba(20,68,44,0.08)] bg-[rgba(20,68,44,0.04)] opacity-75"
            : "border-white/70 bg-white/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-primary/65">{slot.dayLabel}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            {slot.timeLabel}
          </h3>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {status}
        </span>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Spots remaining</span>
          <span>
            {slot.availableSpots}/{slot.capacity}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{
              width: `${(slot.reservedCount / slot.capacity) * 100}%`
            }}
          />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.14em] text-primary/60">Teams signed up</p>
        {teams.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No teams confirmed yet.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {teams.map((team) => (
              <span
                className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary"
                key={team}
              >
                {team}
              </span>
            ))}
          </div>
        )}
      </div>

      <form
        action={action}
        className="mt-5"
        onSubmit={(event) => {
          if (confirmMessage && !window.confirm(confirmMessage)) {
            event.preventDefault();
          }
        }}
      >
        <input name="slotId" type="hidden" value={slot.id} />
        <button
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled}
          type="submit"
        >
          {buttonLabel}
        </button>
      </form>
    </div>
  );
}
