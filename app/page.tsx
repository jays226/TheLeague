import Image from "next/image";
import Link from "next/link";

import { SignupForm } from "@/components/signup-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-court" />
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-16 pt-6 sm:px-8 lg:px-10">
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
            className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-foreground transition hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            href="#signup"
          >
            Register
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-8 py-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="max-w-2xl">
            <Badge>Spring pilot season</Badge>
            <h1 className="mt-6 text-5xl font-semibold leading-[0.96] tracking-[-0.04em] text-foreground sm:text-6xl">
              Pick your partner. Pick your team. Play for the UVA title.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              The League is a season-long pickleball format for UVA students, built like intramurals
              instead of a one-off tournament. Register your two-person team, send the $40 team fee
              by Venmo, and then manage your requested match windows from the member dashboard.
            </p>
            <p className="mt-4 max-w-xl text-base font-medium text-primary">
              Sign-up deadline: Friday, March 20, 2026 at 11:59 PM.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                className="inline-flex min-w-40 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-[hsl(151_58%_18%)] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                href="#signup"
              >
                Join for $40
              </Link>
              <Link
                className="inline-flex min-w-52 items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                href="/login"
              >
                Already registered? Login here
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["$20 per player", "$40 total per team of two."],
                ["UVA only", "Both emails are checked against @virginia.edu."],
                ["Deadline", "Register by Friday, March 20, 2026 at 11:59 PM."]
              ].map(([title, body]) => (
                <Card className="p-4" key={title}>
                  <p className="text-lg font-semibold text-foreground">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                </Card>
              ))}
            </div>
          </div>

          <div id="signup" className="lg:justify-self-end">
            <Card className="overflow-hidden border-white/80 bg-white/70 p-1">
              <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(247,242,233,0.96))] p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
                      Team registration
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                      Enter the league
                    </h2>
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
      </section>
    </main>
  );
}
