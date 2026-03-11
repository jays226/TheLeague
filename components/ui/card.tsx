import * as React from "react";

import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/70 bg-card text-card-foreground shadow-soft backdrop-blur",
        className
      )}
      {...props}
    />
  );
}
