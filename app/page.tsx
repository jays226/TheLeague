import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createEmailListSignup } from "@/lib/db";
import { env } from "@/lib/env";

async function joinEmailListAction(formData: FormData) {
  "use server";

  await createEmailListSignup(String(formData.get("email") || ""));
  redirect("/?joined=1");
}

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ joined?: string }>;
}) {
  const params = await searchParams;
  const tournamentFormUrl = env.tournamentFormUrl;

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-court" />
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center justify-center px-5 py-12 sm:px-8 lg:px-10">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-soft">
            <Image
              alt="The League logo"
              className="h-16 w-16 object-contain"
              height={64}
              priority
              src="/logo.png"
              width={64}
            />
          </div>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-foreground sm:text-6xl">
            The League
          </h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
            Regular Season Portal
          </p>
          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
            Log in to view your dashboard, weekly schedule, and match reporting.
          </p>
          <Link
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
            href="/login"
          >
            Login
          </Link>
          <div className="mt-6 w-full max-w-md rounded-3xl border border-[rgba(245,132,79,0.22)] bg-[linear-gradient(135deg,rgba(245,132,79,0.14),rgba(255,255,255,0.9))] p-5 text-left shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/70">
              NEW • Pop-Up Tournament • April 18
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Sudden death tournament from 12 PM-3 PM at Perry Fishburne Tennis Courts in the
              Dell, by Old Dorms.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              $30/team • $130 cash prize • 16 spots available. Your spot is confirmed once Venmo
              payment is received.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Questions? theleagueatuva@gmail.com
            </p>
            {tournamentFormUrl ? (
              <a
                className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
                href={tournamentFormUrl}
                rel="noreferrer"
                target="_blank"
              >
                Tournament info + signup
              </a>
            ) : (
              <p className="mt-4 text-sm font-medium text-primary">
                Add the tournament Google Form link to enable signup here.
              </p>
            )}
          </div>
          <div className="mt-8 w-full max-w-md rounded-3xl border border-white/70 bg-white/75 p-5 text-left shadow-soft">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/70">
              Didn&apos;t get the chance to sign up for the regular season?
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The League is full for this semester. Add your email to join the list and receive
              updates about next semester.
            </p>
            <form action={joinEmailListAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                className="h-11 flex-1 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                name="email"
                placeholder="your@email.com"
                required
                type="email"
              />
              <button
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
                type="submit"
              >
                Join list
              </button>
            </form>
            {params.joined ? (
              <p className="mt-3 text-sm font-medium text-primary">
                You&apos;re on the list. We&apos;ll send updates about next semester.
              </p>
            ) : null}
            <Link
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
              href="https://www.instagram.com/theleagueatuva/"
              rel="noreferrer"
              target="_blank"
            >
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-[linear-gradient(135deg,#f58529,#dd2a7b,#8134af,#515bd4)] text-white">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect height="15" rx="4" stroke="currentColor" strokeWidth="2" width="15" x="4.5" y="4.5" />
                  <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="2" />
                  <circle cx="16.75" cy="7.25" fill="currentColor" r="1" />
                </svg>
              </span>
              <span className="bg-[linear-gradient(90deg,#f58529,#dd2a7b,#8134af)] bg-clip-text text-transparent">
                Follow our Instagram for updates
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
