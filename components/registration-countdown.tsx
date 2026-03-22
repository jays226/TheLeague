"use client";

import { useEffect, useState } from "react";

const deadline = new Date("2026-03-26T23:59:00-04:00").getTime();

function getTimeLeft() {
  const diff = Math.max(deadline - Date.now(), 0);
  const totalSeconds = Math.floor(diff / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: diff <= 0
  };
}

export function RegistrationCountdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  if (timeLeft.expired) {
    return (
      <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-[rgba(245,132,79,0.24)] bg-white/70 px-5 py-4 text-center shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/65">
          Registration countdown
        </p>
        <p className="mt-2 text-lg font-semibold text-foreground">
          Registration deadline has passed.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-5 max-w-2xl rounded-[24px] border border-white/70 bg-white/72 px-4 py-4 text-center shadow-soft backdrop-blur sm:px-5">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/65 sm:text-xs sm:tracking-[0.16em]">
        Registration closes Thursday, March 26, 2026 at 11:59 PM
      </p>
      <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
        {[
          ["Days", timeLeft.days],
          ["Hrs", timeLeft.hours],
          ["Min", timeLeft.minutes],
          ["Sec", timeLeft.seconds]
        ].map(([label, value]) => (
          <div
            className="flex min-w-0 flex-col items-center justify-center rounded-2xl bg-[rgba(29,96,66,0.06)] px-2 py-3 text-center sm:px-3"
            key={label}
          >
            <p className="text-xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
              {String(value).padStart(2, "0")}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/65 sm:text-xs sm:tracking-[0.16em]">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
