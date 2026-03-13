"use client";

import { useEffect, useState } from "react";

const deadline = new Date("2026-03-21T23:59:00-04:00").getTime();

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
    <div className="mx-auto mt-5 max-w-2xl rounded-[24px] border border-white/70 bg-white/72 px-5 py-4 shadow-soft backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/65">
        Registration closes Saturday, March 21, 2026 at 11:59 PM
      </p>
      <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
        {[
          ["Days", timeLeft.days],
          ["Hours", timeLeft.hours],
          ["Minutes", timeLeft.minutes],
          ["Seconds", timeLeft.seconds]
        ].map(([label, value]) => (
          <div className="rounded-2xl bg-[rgba(29,96,66,0.06)] px-3 py-3" key={label}>
            <p className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
              {String(value).padStart(2, "0")}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary/65">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
