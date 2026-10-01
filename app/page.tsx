import Image from "next/image";
import Link from "next/link";

import { RegistrationCountdown } from "@/components/registration-countdown";
import { SignupForm } from "@/components/signup-form";
import { Card } from "@/components/ui/card";
import { listSlots, listTeams, type SlotRecord } from "@/lib/db";
import { env } from "@/lib/env";
import { isSocialDiscountActive } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const socialDiscountActive = isSocialDiscountActive();
  let slots: SlotRecord[] = [];
  let registeredTeamCount = 0;
  let registrationCount = 0;

  try {
    slots = await listSlots();
    const teams = await listTeams();
    const activeTeams = teams.filter((team) => !team.is_waitlist);
    registeredTeamCount = activeTeams.filter((team) => team.payment_status === "approved").length;
    registrationCount = activeTeams.length;
  } catch {
    // Leave the public marketing page available even if the database is temporarily unavailable.
    slots = [];
    registeredTeamCount = 0;
    registrationCount = 0;
  }

  const totalCapacity = slots.reduce((sum, slot) => sum + Number(slot.capacity), 0);
  const heroCapacity = totalCapacity || 24;
  const heroFillPercent = Math.min((registeredTeamCount / heroCapacity) * 100, 100);
  const leagueIsFull = registrationCount >= heroCapacity;
  const openRegistrationSpots = Math.max(heroCapacity - registeredTeamCount, 0);

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-20 bg-court" />
      <div className="parallax-grid absolute inset-0 -z-10 opacity-60" />
      <div className="parallax-orb parallax-orb-left" />
      <div className="parallax-orb parallax-orb-right" />

      <div className="landing-snap">
        <section className="landing-panel">
          <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pt-6 sm:px-8 lg:px-10">
            <header className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-soft">
                  <Image
                    alt="The League logo"
                    className="h-12 w-12 object-contain"
                    height={48}
                    priority
                    src="/logo.png"
                    width={48}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/75">
                    The League
                  </p>
                  <p className="text-sm text-muted-foreground">UVA Student Pickleball League</p>
                </div>
              </div>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white/60 px-5 text-sm font-semibold text-foreground transition hover:bg-white/80"
                href="/login"
              >
                Login
              </Link>
            </header>

            <div className="flex flex-1 items-center justify-center py-10">
              <div className="landing-hero-card relative w-full max-w-4xl text-center">
                <div className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:mt-14 sm:gap-x-4">
                  <h1 className="whitespace-nowrap text-5xl font-semibold tracking-[-0.07em] text-foreground sm:text-6xl lg:text-[5.5rem]">
                    The League
                  </h1>
                  <span aria-hidden="true" className="text-4xl font-light text-primary/55 sm:text-5xl">
                    ×
                  </span>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Image
                      alt="UVA Pickleball Club logo"
                      className="h-14 w-14 object-contain sm:h-[4.5rem] sm:w-[4.5rem]"
                      height={1080}
                      priority
                      src="/uva-pickleball-club-logo.svg"
                      width={1080}
                    />
                    <span className="whitespace-nowrap text-xl font-semibold tracking-[-0.04em] text-foreground sm:text-2xl lg:text-3xl">
                      UVA Pickleball Club
                    </span>
                  </div>
                </div>
                <div className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                  <span className="block text-center">
                    Fall 2026 • Social Team: {socialDiscountActive ? <><strong>$5/player</strong> through Oct 7; </> : <><strong>$15/player</strong>; </>}Non-Social Team: <strong>$15/player</strong>
                  </span>
                </div>
                <RegistrationCountdown />
                <div className="mx-auto mt-6 w-full max-w-xl rounded-[28px] border border-[rgba(32,116,74,0.16)] bg-[linear-gradient(135deg,rgba(32,116,74,0.14),rgba(255,255,255,0.96))] px-5 py-5 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                        Live league status
                      </p>
                      <p className="mt-1 text-base font-semibold text-foreground">
                        Teams registered
                      </p>
                    </div>
                    <p className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
                      {registeredTeamCount}/{heroCapacity}
                    </p>
                  </div>
                  <div className="mt-4 h-3.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-[rgba(32,116,74,0.08)]">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${heroFillPercent}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <p className="font-medium text-foreground">
                      {heroFillPercent.toFixed(0)}% full
                    </p>
                    <p className="text-muted-foreground">
                      {openRegistrationSpots > 0
                        ? `${openRegistrationSpots} spots still open`
                        : "The league is currently full"}
                    </p>
                  </div>
                </div>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                  A UVA pickleball league with weekly matches from <strong>October 12</strong> through <strong>November 4</strong> and a playoff tournament on <strong>Sunday, November 8</strong>.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                    className={`inline-flex min-w-52 items-center justify-center rounded-2xl px-6 py-4 text-base font-semibold shadow-soft transition ${
                      leagueIsFull
                        ? "bg-[hsl(191_76%_48%)] text-white hover:bg-[hsl(191_76%_42%)]"
                        : "bg-primary text-primary-foreground hover:bg-[hsl(151_58%_18%)]"
                    }`}
                    href="#register"
                  >
                    {leagueIsFull ? "Join the Waitlist" : "Claim Your Spot"}
                  </Link>
                  <Link
                    className="inline-flex min-w-52 items-center justify-center rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-accent-foreground transition hover:opacity-90"
                    href="#about"
                  >
                    League details
                  </Link>
                </div>
                <p className="mt-10 text-sm font-medium uppercase tracking-[0.18em] text-primary/60">
                  Scroll to continue
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-panel" id="about">
          <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-12 sm:px-8 lg:px-10">
            <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <Card className="parallax-panel p-6 lg:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
                  What is The League?
                </p>
                <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-foreground">
                  A semester-long UVA pickleball league.
                </h2>
                <div className="mt-6 space-y-4 text-base leading-7 text-muted-foreground">
                  <p>
                    Pick one weekly 45-minute slot, Monday through Wednesday: 5:00–5:45 PM at Snyder Courts or 6:00–6:45 PM at Perry Courts.
                  </p>
                  <p>
                    Each matchup is best two out of three games during that slot.
                  </p>
                  <p>
                    The regular season runs October 12 through November 4, followed by the playoff tournament on November 8.
                  </p>
                  <p>Social pricing ends October 7. The league is limited to 24 teams.</p>
                </div>
              </Card>

              <div className="parallax-panel parallax-panel-hero">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white/82 p-5 shadow-soft">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/65">
                      Prize money
                    </p>
                    <p className="mt-3 text-lg font-semibold text-foreground">
                      1st place: $50 · 2nd place: $150 · 3rd place: $100
                    </p>
                  </div>
                  <div className="rounded-3xl bg-white/82 p-5 shadow-soft">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/65">
                      Fee
                    </p>
                    <p className="mt-3 text-lg font-semibold text-foreground">
                      {socialDiscountActive
                        ? "Through October 7, Social Team players pay $5 and Non-Social Team players pay $15. Each team needs one Social Team player; after October 7, everyone pays $15."
                        : "All players pay $15 each. Social status is still recorded and checked against the Social roster."}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-white/82 p-5 shadow-soft">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/65">
                      Format
                    </p>
                    <p className="mt-3 text-lg font-semibold text-foreground">
                      Best two out of three games each week.
                    </p>
                  </div>
                  <div className="rounded-3xl bg-white/82 p-5 shadow-soft">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/65">
                      Season
                    </p>
                    <p className="mt-3 text-lg font-semibold text-foreground">October 12 to November 4</p>
                  </div>
                </div>
                <div className="mt-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/65">
                    Time Slots
                  </p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {slots.length > 0 ? (
                    slots.map((slot) => {
                      const reservedCount = Number(slot.reserved_count);
                      const capacity = Number(slot.capacity);
                      const remaining = Math.max(capacity - reservedCount, 0);
                      const fillPercent = Math.min((reservedCount / capacity) * 100, 100);
                      const status =
                        remaining === 0
                          ? { label: "Full", classes: "bg-[rgba(184,72,48,0.14)] text-[hsl(12_62%_34%)]" }
                          : remaining === 1
                            ? {
                                label: "Almost full",
                                classes: "bg-[rgba(245,132,79,0.16)] text-[hsl(22_78%_37%)]"
                              }
                            : {
                                label: "Open",
                                classes: "bg-[rgba(32,116,74,0.14)] text-[hsl(148_46%_28%)]"
                              };

                      return (
                        <div
                          className="rounded-2xl border border-white/70 bg-white/82 px-4 py-4 text-sm text-foreground shadow-soft"
                          key={slot.id}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold text-foreground">
                                {slot.day_label} {slot.time_window_label}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">{slot.location_label}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {remaining > 0
                                  ? `${remaining} spot${remaining === 1 ? "" : "s"} left`
                                  : "No spots remaining"}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${status.classes}`}
                            >
                              {status.label}
                            </span>
                          </div>

                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-primary/60">
                              <span>
                                {reservedCount} of {capacity} teams filled
                              </span>
                              <span>{remaining} open</span>
                            </div>
                            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary/80">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${fillPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/70 bg-white/70 px-4 py-3 text-sm text-muted-foreground sm:col-span-2">
                      Slot availability will appear here once the schedule is loaded.
                    </div>
                  )}
                </div>
                <div className="mt-6 flex flex-wrap gap-4">
                  <Link
                    className={`inline-flex min-w-44 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition ${
                      leagueIsFull
                        ? "bg-[hsl(191_76%_48%)] text-white hover:bg-[hsl(191_76%_42%)]"
                        : "bg-primary text-primary-foreground hover:bg-[hsl(151_58%_18%)]"
                    }`}
                    href="#register"
                  >
                    {leagueIsFull ? "Join the Waitlist" : "Register Your Team"}
                  </Link>
                  <Link
                    className="inline-flex min-w-44 items-center justify-center rounded-xl bg-white/70 px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-white/90"
                    href="/login"
                  >
                    Already registered? Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-panel" id="register">
          <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-12 sm:px-8 lg:px-10">
            <div className="grid w-full gap-6">
              <div className="parallax-panel">
                <Card className="overflow-hidden border-white/80 bg-white/70 p-1">
                  <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(247,242,233,0.96))] p-5 sm:p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
                          Team registration
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                          Register for The League
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Social pricing ends Wednesday, October 7, 2026 at 11:59 PM EDT.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Each team must include at least one Social Team player until Oct 7.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {leagueIsFull
                            ? "Add both players and create a team password to join the waitlist. We will reach out if spots open."
                            : socialDiscountActive
                              ? "Add both players, choose each player’s team type, and create a team password. At least one player must be designated Social Team through October 7."
                              : "Add both players, choose each player’s membership type, and create a team password. Social status will be checked against the roster."}
                        </p>
                      </div>
                      <div className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
                        {socialDiscountActive ? "$5–$15/player" : "$15/player"}
                      </div>
                    </div>
                    <SignupForm
                      isWaitlistMode={leagueIsFull}
                      isSocialDiscountActive={socialDiscountActive}
                      socialSquareLink={env.socialSquareLink}
                      nonSocialSquareLink={env.nonSocialSquareLink}
                    />
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
