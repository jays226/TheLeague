import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function ReservationBanner({
  title,
  body,
  tone = "neutral",
  action
}: {
  title: string;
  body: string;
  tone?: "neutral" | "success" | "warning";
  action?: ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "bg-primary text-primary-foreground"
      : tone === "warning"
        ? "bg-[rgba(245,132,79,0.14)] text-foreground"
        : "bg-white/80 text-foreground";

  return (
    <Card className={`p-6 ${toneClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] opacity-75">{title}</p>
          <p className="mt-2 text-lg font-semibold">{body}</p>
        </div>
        {action}
      </div>
    </Card>
  );
}
