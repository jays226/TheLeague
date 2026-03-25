"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setError(data.error || "Unable to send reset email.");
        return;
      }

      setMessage(
        data.message || "If that email matches a registered team, a password reset link has been sent."
      );
    });
  }

  return (
    <Card className="p-6 sm:p-8">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="forgotPasswordEmail">
            Team member email
          </label>
          <Input
            id="forgotPasswordEmail"
            placeholder="player@virginia.edu"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-[rgba(245,132,79,0.3)] bg-[rgba(245,132,79,0.12)] px-4 py-3 text-sm text-foreground">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-[rgba(32,116,74,0.2)] bg-[rgba(32,116,74,0.08)] px-4 py-3 text-sm text-foreground">
            {message}
          </div>
        ) : null}

        <Button className="w-full" disabled={isPending} type="submit" variant="secondary">
          {isPending ? "Sending reset link..." : "Email reset link"}
        </Button>

        <div className="text-center">
          <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/login">
            Back to login
          </Link>
        </div>
      </form>
    </Card>
  );
}
