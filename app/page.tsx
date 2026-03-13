import Image from "next/image";
import Link from "next/link";

import { SignupForm } from "@/components/signup-form";
import { Card } from "@/components/ui/card";
import { listSlots, type SlotRecord } from "@/lib/db";

export default async function HomePage() {
  let slots: SlotRecord[] = [];

  try {
    slots = await listSlots();
  } catch {
    // Leave the public marketing page available even if the database is temporarily unavailable.
    slots = [];
  }

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
              <div className="landing-hero-card w-full max-w-4xl text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary/70">
                  The League
                </p>
                <h1 className="mt-6 text-6xl font-semibold tracking-[-0.07em] text-foreground sm:text-7xl lg:text-[6.5rem]">
                  The League
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                  UVA&apos;s weekly pickleball league built for teams, standings, and a playoff run.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                    className="inline-flex min-w-52 items-center justify-center rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-soft transition hover:bg-[hsl(151_58%_18%)]"
                    href="#register"
                  >
                    Register for $40
                  </Link>
                  <Link
                    className="inline-flex min-w-52 items-center justify-center rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-accent-foreground transition hover:opacity-90"
                    href="#about"
                  >
                    What is the league?
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
                    Teams choose one weekly one-hour time slot: Monday, Tuesday, or Wednesday from
                    6-7pm or 7-8pm.
                  </p>
                  <p>Win two out of three games against your opponent each week.</p>
                  <p>
                    Top teams advance to the playoff tournament for a chance at the first-place cash
                    prize of $500 or more.
                  </p>
                  <p>Deadline to register is March 20. Play starts March 23 and runs through April 27.</p>
                </div>
              </Card>

              <div className="parallax-panel parallax-panel-hero">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["Prize", "$500+ for first place"],
                    ["Fee", "$40 per team ($20 per person)"],
                    ["Format", "Win two out of three games against your opponent each week"],
                    ["Season", "March 23 through April 27"]
                  ].map(([title, body]) => (
                    <div className="rounded-3xl bg-white/82 p-5 shadow-soft" key={title}>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/65">
                        {title}
                      </p>
                      <p className="mt-3 text-lg font-semibold text-foreground">{body}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/65">
                    Time Slots
                  </p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {slots.length > 0 ? (
                    slots.map((slot) => (
                      <div
                        className="rounded-2xl border border-white/70 bg-white/78 px-4 py-3 text-sm font-semibold text-foreground shadow-soft"
                        key={slot.id}
                      >
                        {slot.day_label} {slot.time_label} ({slot.reserved_count}/{slot.capacity})
                      </div>
                    ))
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
                    Register for $40
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
            <div className="grid w-full gap-6 lg:grid-cols-[0.82fr_1.18fr]">
              <Card className="parallax-panel p-6 lg:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
                  Registration
                </p>
                <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-foreground">
                  Enter the league.
                </h2>
                <div className="mt-6 space-y-4 text-base leading-7 text-muted-foreground">
                  <p>Registration fee for each team is $40 total, or $20 per person.</p>
                  <p>Deadline to register is Friday, March 20, 2026 at 11:59 PM.</p>
                  <p>Once approved, your team can lock a weekly slot and manage scheduling in the dashboard.</p>
                </div>
              </Card>

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
                          Add both players, set a team password, and pay the $40 team fee.
                        </p>
                      </div>
                      <div className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
                        $40 total
                      </div>
                    </div>
                    <SignupForm />
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
