"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialState = {
  teamName: "",
  playerOneName: "",
  playerOneEmail: "",
  playerOneDuprId: "",
  playerOneType: "general",
  playerTwoName: "",
  playerTwoEmail: "",
  playerTwoDuprId: "",
  playerTwoType: "general",
  password: ""
};

export function SignupForm({
  isWaitlistMode = false,
  isSocialDiscountActive = true,
  socialSquareLink,
  nonSocialSquareLink
}: {
  isWaitlistMode?: boolean;
  isSocialDiscountActive?: boolean;
  socialSquareLink: string;
  nonSocialSquareLink: string;
}) {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof initialState, string>>>(
    {}
  );
  const [isPending, startTransition] = useTransition();

  function updateField(name: keyof typeof initialState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as {
        error?: string;
        fieldErrors?: Partial<Record<keyof typeof initialState, string[]>>;
        redirectUrl?: string;
      };

      if (!response.ok) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(data.fieldErrors ?? {}).map(([key, value]) => [key, value?.[0] ?? ""])
          ) as Partial<Record<keyof typeof initialState, string>>
        );
        setError(data.error || "Something failed while creating your checkout session.");
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      setError("Something failed while creating your team session.");
    });
  }

  return (
    <Card className="p-6 sm:p-8">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="teamName">
            Team name
          </label>
          <Input
            id="teamName"
            placeholder="Dink Responsibly"
            value={form.teamName}
            onChange={(event) => updateField("teamName", event.target.value)}
            required
          />
          {fieldErrors.teamName ? (
            <p className="text-sm text-[hsl(18_88%_45%)]">{fieldErrors.teamName}</p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="playerOneName">
              Player one
            </label>
            <Input
              id="playerOneName"
              placeholder="First and last name"
              value={form.playerOneName}
              onChange={(event) => updateField("playerOneName", event.target.value)}
              required
            />
            {fieldErrors.playerOneName ? (
              <p className="text-sm text-[hsl(18_88%_45%)]">{fieldErrors.playerOneName}</p>
            ) : null}
            <label className="block text-sm font-medium text-foreground" htmlFor="playerOneDuprId">
              Player one DUPR ID
            </label>
            <Input
              id="playerOneDuprId"
              placeholder="Enter DUPR ID"
              value={form.playerOneDuprId}
              onChange={(event) => updateField("playerOneDuprId", event.target.value)}
              required
            />
            {fieldErrors.playerOneDuprId ? (
              <p className="text-sm text-[hsl(18_88%_45%)]">{fieldErrors.playerOneDuprId}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="playerOneEmail">
              UVA email
            </label>
            <Input
              id="playerOneEmail"
              type="email"
              placeholder="abc2de@virginia.edu"
              value={form.playerOneEmail}
              onChange={(event) => updateField("playerOneEmail", event.target.value)}
              required
            />
            {fieldErrors.playerOneEmail ? (
              <p className="text-sm text-[hsl(18_88%_45%)]">{fieldErrors.playerOneEmail}</p>
            ) : null}
            <label className="block text-sm font-medium text-foreground" htmlFor="playerOneType">
              Membership type
            </label>
            <select
              className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              id="playerOneType"
              value={form.playerOneType}
              onChange={(event) => updateField("playerOneType", event.target.value)}
            >
              <option value="general">Non-Social Team — $15/player</option>
              <option value="social">Social — {isSocialDiscountActive ? "$5/player through Oct 6" : "$15/player"}</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="playerTwoName">
              Player two
            </label>
            <Input
              id="playerTwoName"
              placeholder="First and last name"
              value={form.playerTwoName}
              onChange={(event) => updateField("playerTwoName", event.target.value)}
              required
            />
            {fieldErrors.playerTwoName ? (
              <p className="text-sm text-[hsl(18_88%_45%)]">{fieldErrors.playerTwoName}</p>
            ) : null}
            <label className="block text-sm font-medium text-foreground" htmlFor="playerTwoDuprId">
              Player two DUPR ID
            </label>
            <Input
              id="playerTwoDuprId"
              placeholder="Enter DUPR ID"
              value={form.playerTwoDuprId}
              onChange={(event) => updateField("playerTwoDuprId", event.target.value)}
              required
            />
            {fieldErrors.playerTwoDuprId ? (
              <p className="text-sm text-[hsl(18_88%_45%)]">{fieldErrors.playerTwoDuprId}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="playerTwoEmail">
              UVA email
            </label>
            <Input
              id="playerTwoEmail"
              type="email"
              placeholder="xyz9jk@virginia.edu"
              value={form.playerTwoEmail}
              onChange={(event) => updateField("playerTwoEmail", event.target.value)}
              required
            />
            {fieldErrors.playerTwoEmail ? (
              <p className="text-sm text-[hsl(18_88%_45%)]">{fieldErrors.playerTwoEmail}</p>
            ) : null}
            <label className="block text-sm font-medium text-foreground" htmlFor="playerTwoType">
              Membership type
            </label>
            <select
              className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              id="playerTwoType"
              value={form.playerTwoType}
              onChange={(event) => updateField("playerTwoType", event.target.value)}
            >
              <option value="general">Non-Social Team — $15/player</option>
              <option value="social">Social — {isSocialDiscountActive ? "$5/player through Oct 6" : "$15/player"}</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            Team password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="Create a password for returning login"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            required
          />
          {fieldErrors.password ? (
            <p className="text-sm text-[hsl(18_88%_45%)]">{fieldErrors.password}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-secondary/80 p-4 text-sm text-muted-foreground">
          {isWaitlistMode ? (
            <>
              <p>The league is currently full. Register here to join the waitlist.</p>
              <p className="mt-2">If spots open, we will reach out to your team by email.</p>
            </>
          ) : (
            <>
              <p>Choose Social Team or Non-Social Team for each player. Social status is verified against the Social roster. Enter each player&apos;s DUPR ID so match results can be recorded.</p>
              <p className="mt-2">{isSocialDiscountActive ? "Through Oct 6, Social Team players pay $5 and Non-Social Team players pay $15; each team must include at least one Social Team player. After Oct 6, all players pay $15." : "All players pay $15. Social status is still recorded and verified against the Social roster."}</p>
              <p className="mt-2">
                After registering, each player pays their own fee. {isSocialDiscountActive ? <>
                  Social Team players use the <a className="font-semibold text-primary underline" href={socialSquareLink} rel="noreferrer" target="_blank">Social Team payment link</a>; Non-Social Team players use the {" "}
                  <a className="font-semibold text-primary underline" href={nonSocialSquareLink} rel="noreferrer" target="_blank">Non-Social Team payment link</a>.
                </> : <>
                  All players use the <a className="font-semibold text-primary underline" href={nonSocialSquareLink} rel="noreferrer" target="_blank">$15 payment link</a>.
                </>}
              </p>
              <p className="mt-2">Your registration is confirmed once payment from both players is received.</p>
            </>
          )}
        </div>

        {error ? (
          <div className="rounded-2xl border border-[rgba(245,132,79,0.3)] bg-[rgba(245,132,79,0.12)] px-4 py-3 text-sm text-foreground">
            {error}
          </div>
        ) : null}

        <Button
          className={isWaitlistMode ? "w-full bg-[hsl(191_76%_48%)] text-white hover:bg-[hsl(191_76%_42%)]" : "w-full"}
          disabled={isPending}
          type="submit"
        >
          {isPending
            ? isWaitlistMode
              ? "Adding your team to the waitlist..."
              : "Setting up your team..."
            : isWaitlistMode
              ? "Join the waitlist"
              : "Enter the league dashboard"}
        </Button>
      </form>
    </Card>
  );
}
