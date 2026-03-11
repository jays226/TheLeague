import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost";
};

export function Button({
  className,
  variant = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        variant === "default" &&
          "bg-primary text-primary-foreground shadow-soft hover:bg-[hsl(151_58%_18%)]",
        variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-[hsl(42_40%_86%)]",
        variant === "ghost" && "bg-transparent text-foreground hover:bg-white/60",
        className
      )}
      {...props}
    />
  );
}
