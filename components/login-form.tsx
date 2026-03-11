"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialState = {
  teamName: "",
  password: ""
};

export function LoginForm() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField(name: keyof typeof initialState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as { error?: string; redirectUrl?: string };

      if (!response.ok || !data.redirectUrl) {
        setError(data.error || "Login failed.");
        return;
      }

      window.location.href = data.redirectUrl;
    });
  }

  return (
    <Card className="p-6 sm:p-8">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="loginTeamName">
            Team name
          </label>
          <Input
            id="loginTeamName"
            placeholder="Dink Responsibly"
            value={form.teamName}
            onChange={(event) => updateField("teamName", event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="loginPassword">
            Password
          </label>
          <Input
            id="loginPassword"
            type="password"
            placeholder="Your team password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            required
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-[rgba(245,132,79,0.3)] bg-[rgba(245,132,79,0.12)] px-4 py-3 text-sm text-foreground">
            {error}
          </div>
        ) : null}

        <Button className="w-full" disabled={isPending} type="submit" variant="secondary">
          {isPending ? "Logging in..." : "Log in to team dashboard"}
        </Button>
      </form>
    </Card>
  );
}
