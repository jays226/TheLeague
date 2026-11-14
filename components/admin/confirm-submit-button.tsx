"use client";

import type { ReactNode } from "react";

export function ConfirmSubmitButton({
  children,
  className,
  confirmation
}: {
  children: ReactNode;
  className: string;
  confirmation: string;
}) {
  return (
    <button
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
      type="submit"
    >
      {children}
    </button>
  );
}
