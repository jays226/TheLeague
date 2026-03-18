import Image from "next/image";
import Link from "next/link";

import { RegistrationCountdown } from "@/components/registration-countdown";
import { SignupForm } from "@/components/signup-form";
import { Card } from "@/components/ui/card";
import { listSlots, listTeams, type SlotRecord } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let slots: SlotRecord[] = [];
  let approvedTeamCount = 0;

  try {
    slots = await listSlots();
    const teams = await listTeams();
    approvedTeamCount = teams.filter((team) => team.payment_status === "approved").length;
  } catch {
    // Leave the public marketing page available even if the database is temporarily unavailable.
    slots = [];
    approvedTeamCount = 0;
  }

  const totalCapacity = slots.reduce((sum, slot) => sum + Number(slot.capacity), 0);
  const heroCapacity = totalCapacity || 24;
  const heroFillPercent = Math.min((approvedTeamCount / heroCapacity) * 100, 100);
  const earlyPricingActive = approvedTeamCount < 12;

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
                <h1 className="mt-12 text-6xl font-semibold tracking-[-0.07em] text-foreground sm:mt-14 sm:text-7xl lg:text-[6.5rem]">
                  The League
                </h1>
                <div className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                  {earlyPricingActive ? (
                    <>
                      <span className="block text-center font-semibold text-foreground">
                        <span className="line-through text-muted-foreground">$20</span> → $15 per player
                      </span>
                      <span className="block text-center">Teams of 2 • $30 total</span>
                      <span className="mt-1 block text-center text-sm font-medium uppercase tracking-[0.14em] text-primary/70">
                        Early pricing for the first 12 teams • {approvedTeamCount} claimed
                      </span>
                    </>
                  ) : (
                    <span className="block text-center">$20 per player • 2 players per team • $40 total</span>
                  )}
                </div>
                <RegistrationCountdown />
                <div className="mx-auto mt-6 w-full max-w-xl rounded-[28px] border border-[rgba(32,116,74,0.16)] bg-[linear-gradient(135deg,rgba(32,116,74,0.14),rgba(255,255,255,0.96))] px-5 py-5 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                        Live league status
                      </p>
                      <p className="mt-1 text-base font-semibold text-foreground">
                        League spots filled
                      </p>
                    </div>
                    <p className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
                      {approvedTeamCount}/{heroCapacity}
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
                      {heroCapacity - approvedTeamCount > 0
                        ? `${heroCapacity - approvedTeamCount} spots still open`
                        : "The league is currently full"}
                    </p>
                  </div>
                </div>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                  A UVA pickleball league with weekly matches, playoffs, and a cash prize.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                    className="inline-flex min-w-52 items-center justify-center rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-soft transition hover:bg-[hsl(151_58%_18%)]"
                    href="#register"
                  >
                    {earlyPricingActive ? "Claim Your Spot" : "Register Your Team"}
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
                    Pick one weekly one-hour slot: Monday, Tuesday, or Wednesday at 6-7pm or 7-8pm.
                  </p>
                  <p>
                    Each matchup is best two out of three games during that slot.
                  </p>
                  <p>
                    Top teams advance to playoffs for a chance at the $500+ first-place prize.
                  </p>
                  <p>Deadline: March 21. Play runs March 23 through April 27.</p>
                </div>
              </Card>

              <div className="parallax-panel parallax-panel-hero">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white/82 p-5 shadow-soft">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/65">
                      Prize
                    </p>
                    <p className="mt-3 text-lg font-semibold text-foreground">$500+ for first place</p>
                  </div>
                  <div className="rounded-3xl bg-white/82 p-5 shadow-soft">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/65">
                      Fee
                    </p>
                    {earlyPricingActive ? (
                      <p className="mt-3 text-lg font-semibold text-foreground">
                        <span className="line-through">$20</span> $15 per player
                        <br />
                        Teams of 2 • <span className="line-through">$40</span> $30 total
                      </p>
                    ) : (
                      <p className="mt-3 text-lg font-semibold text-foreground">
                        $20 per player • 2 players per team • $40 total
                      </p>
                    )}
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
                    <p className="mt-3 text-lg font-semibold text-foreground">March 23 to April 27</p>
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
                                {slot.day_label} {slot.time_label}
                              </p>
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
                    className="inline-flex min-w-44 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
                    href="#register"
                  >
                    {earlyPricingActive ? "Register Your Team" : "Register Your Team"}
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
                          Registration closes Saturday, March 21, 2026 at 11:59 PM.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Add both players, create a team password, and complete payment to unlock slot selection.
                        </p>
                      </div>
                      <div className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
                        {earlyPricingActive ? (
                          <>
                            <span className="line-through">$20</span> $15/player
                          </>
                        ) : (
                          "$20/player"
                        )}
                      </div>
                    </div>
                    <SignupForm earlyPricingActive={earlyPricingActive} />
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
