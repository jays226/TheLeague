import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getTeamByAccessToken } from "@/lib/db";
import { leagueCookieName } from "@/lib/session";

export default async function SchedulePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(leagueCookieName)?.value;

  if (!accessToken) {
    redirect("/");
  }

  const team = await getTeamByAccessToken(accessToken);

  if (!team) {
    redirect("/");
  }

  if (team.payment_status !== "approved" || team.is_waitlist) {
    redirect("/app");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f3eb_0%,#eef3ee_100%)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-soft">
              <Image
                alt="The League logo"
                className="h-14 w-14 object-contain"
                height={56}
                priority
                src="/logo.png"
                width={56}
              />
            </div>
            <div>
              <Badge>Schedule</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
                {team.team_name}
              </h1>
            </div>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition hover:bg-[hsl(42_40%_86%)]"
            href="/app"
          >
            Back to dashboard
          </Link>
        </header>

        <Card className="p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary/65">
            Team schedule
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">
            Will be updated once schedules are finalized
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Check back here after the league organizers finalize matchups and weekly court assignments.
          </p>
        </Card>
      </div>
    </main>
  );
}
