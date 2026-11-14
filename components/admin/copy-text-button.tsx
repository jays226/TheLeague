"use client";

import { useState } from "react";

export function CopyTextButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="inline-flex h-10 items-center justify-center rounded-xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:bg-[hsl(42_40%_86%)]"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }}
      type="button"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
