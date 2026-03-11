import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
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
            href="/"
          >
            Back to signup
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-xl">
            <Badge>Returning teams</Badge>
            <h1 className="mt-6 text-5xl font-semibold leading-[0.96] tracking-[-0.04em] text-foreground sm:text-6xl">
              Log back in and manage your team.
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Use your team name and password to reopen the dashboard, check payment status, and
              manage your weekly slot reservation.
            </p>
            <div className="mt-6 inline-flex items-center gap-4 rounded-[28px] border border-white/70 bg-white/70 p-4 shadow-soft">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-[rgba(29,96,66,0.08)]">
                <Image
                  alt="The League logo"
                  className="h-14 w-14 object-contain"
                  height={56}
                  src="/logo.png"
                  width={56}
                />
              </div>
              <p className="max-w-xs text-sm text-muted-foreground">
                Same team, same dashboard, same weekly slot board.
              </p>
            </div>
          </div>

          <div className="lg:justify-self-end">
            <Card className="overflow-hidden border-[rgba(29,96,66,0.18)] bg-white/80 p-1 shadow-soft">
              <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(238,243,238,0.98),rgba(255,255,255,0.92))] p-5 sm:p-6">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    Team login
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                    Access your dashboard
                  </h2>
                </div>
                <LoginForm />
              </div>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
