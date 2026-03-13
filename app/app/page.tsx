import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { cancelReservationAction, logoutTeamAction, reserveSlotAction } from "@/app/app/actions";
import { ReservationBanner } from "@/components/dashboard/reservation-banner";
import { SlotCard } from "@/components/dashboard/slot-card";
import { SummaryStats } from "@/components/dashboard/summary-stats";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getActiveReservationForTeam,
  getPendingReservationForTeam,
  getReservationStats,
  getTeamByAccessToken,
  listReservationsForTeam,
  listSlots,
  type ReservationRecord,
  type SlotRecord
} from "@/lib/db";
import { env } from "@/lib/env";
import { formatCurrency } from "@/lib/utils";
import { leagueCookieName } from "@/lib/session";

function groupSlotsByDay(
  slots: SlotRecord[],
  activeReservation: Awaited<ReturnType<typeof getActiveReservationForTeam>>
) {
  const grouped = new Map<
    string,
    Array<{
      id: string;
      dayLabel: string;
      timeLabel: string;
      capacity: number;
      reservedCount: number;
      availableSpots: number;
      isFull: boolean;
      teams: string[];
      status: "available" | "full" | "reserved";
    }>
  >();

  for (const slot of slots) {
    const status =
      activeReservation?.slot_id === slot.id
        ? "reserved"
        : slot.is_full
          ? "full"
          : "available";

    const entry = {
      id: slot.id,
      dayLabel: slot.day_label,
      timeLabel: slot.time_label,
      capacity: slot.capacity,
      reservedCount: Number(slot.reserved_count),
      availableSpots: Number(slot.available_spots),
      isFull: Boolean(slot.is_full),
      teams: slot.teams,
      status
    } as const;

    const current = grouped.get(slot.day_label) || [];
    current.push(entry);
    grouped.set(slot.day_label, current);
  }

  return Array.from(grouped.entries());
}

export default async function AppPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string; tone?: "success" | "error" }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(leagueCookieName)?.value;

  if (!accessToken) {
    redirect("/");
  }

  const team = await getTeamByAccessToken(accessToken);

  if (!team) {
    redirect("/");
  }

  const activeReservation = await getActiveReservationForTeam(team.id);
  const pendingReservation = await getPendingReservationForTeam(team.id);
  const reservationHistory = (await listReservationsForTeam(team.id)) as ReservationRecord[];
  const slots = (await listSlots()) as SlotRecord[];
  const stats = await getReservationStats();
  const groupedSlots = groupSlotsByDay(slots, activeReservation);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f3eb_0%,#eef3ee_100%)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
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
              <Badge>Dashboard</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
                {team.team_name}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                Track payment status, view the weekly slot board, and manage your team&apos;s one
                active reservation from a single dashboard.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {team.payment_status === "approved" ? (
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl bg-white/75 px-5 text-sm font-semibold text-foreground transition hover:bg-white"
                href="/schedule"
              >
                Schedule
              </Link>
            ) : null}
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition hover:bg-[hsl(42_40%_86%)]"
              href="/"
            >
              Home
            </Link>
            <form action={logoutTeamAction}>
              <button
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
                type="submit"
              >
                Log out
              </button>
            </form>
          </div>
        </header>

        <Card
          className={
            team.payment_status === "approved"
              ? "border-[rgba(32,116,74,0.18)] bg-[linear-gradient(135deg,rgba(32,116,74,0.14),rgba(255,255,255,0.94))] p-6"
              : "border-[rgba(245,132,79,0.2)] bg-[linear-gradient(135deg,rgba(245,132,79,0.14),rgba(255,255,255,0.92))] p-6"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-primary/65">
                {team.payment_status === "approved" ? "Venmo payment accepted!" : "Venmo paywall"}
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {team.payment_status === "approved"
                  ? "Your team payment has been approved and your account is ready for scheduling."
                  : "Pay $40 total, or $20 per player, as soon as you enter the portal."}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {team.payment_status === "approved"
                  ? "You can view slots immediately below. Any future switch request will still need admin approval."
                  : "Send the payment to `@theleague_uva` and include your team name in the note so the admin can approve your account quickly."}
              </p>
            </div>
            {team.payment_status === "approved" ? (
              <div className="rounded-2xl bg-white/85 px-4 py-3 text-sm font-semibold text-primary shadow-soft">
                Venmo payment accepted!
              </div>
            ) : env.venmoLink ? (
              <a
                className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
                href={env.venmoLink}
                rel="noreferrer"
                target="_blank"
              >
                Open Venmo link
              </a>
            ) : (
              <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-muted-foreground">
                Add `NEXT_PUBLIC_VENMO_LINK` in `.env.local`.
              </div>
            )}
          </div>
        </Card>

        {params.message ? (
          <ReservationBanner
            body={params.message}
            title={params.tone === "error" ? "Action failed" : "Action saved"}
            tone={params.tone === "error" ? "warning" : "success"}
          />
        ) : null}

        <SummaryStats
          stats={[
            {
              label: "Total slots",
              value: String(stats.totalSlots),
              hint: "Weekly recurring signup windows"
            },
            {
              label: "Reservations",
              value: String(stats.totalReservations),
              hint: "Pending and approved teams"
            },
            {
              label: "Available spots",
              value: String(stats.availableSpots),
              hint: "Remaining open capacity this week"
            }
          ]}
        />

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            {activeReservation ? (
              <ReservationBanner
                action={
                  <form action={cancelReservationAction}>
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition hover:bg-[hsl(42_40%_86%)]"
                      type="submit"
                    >
                      Cancel reservation
                    </button>
                  </form>
                }
                body={`${activeReservation.day_label} at ${activeReservation.time_label} is your current confirmed slot.`}
                title="Current selected slot"
                tone="success"
              />
            ) : (
              <ReservationBanner
                body="You do not have an active slot yet. Choose an open card below to sign up."
                title="No current reservation"
              />
            )}

            {pendingReservation ? (
              <ReservationBanner
                body={`${pendingReservation.day_label} at ${pendingReservation.time_label} is waiting for admin approval as your requested switch.`}
                title="Pending change request"
                tone="warning"
              />
            ) : null}

            {groupedSlots.map(([day, daySlots]) => (
              <Card className="p-6" key={day}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.16em] text-primary/65">
                      Weekly schedule
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                      {day}
                    </h2>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    {daySlots.length} slots
                  </span>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {daySlots.map((slot: (typeof daySlots)[number]) => (
                    <SlotCard
                      action={reserveSlotAction}
                      buttonLabel={
                        team.payment_status !== "approved"
                          ? "Await payment approval"
                          : slot.status === "reserved"
                            ? "Currently reserved"
                            : activeReservation
                              ? pendingReservation
                                ? "Change pending"
                                : "Request switch"
                              : "Sign up"
                      }
                      disabled={
                        team.payment_status !== "approved" ||
                        slot.status === "reserved" ||
                        slot.status === "full" ||
                        Boolean(pendingReservation)
                      }
                      confirmMessage={
                        !activeReservation
                          ? "Are you sure you want to sign up? You must request to change to a different slot later."
                          : undefined
                      }
                      key={slot.id}
                      slot={slot}
                      status={slot.status}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-5">
            <Card className="p-6">
              <p className="text-sm uppercase tracking-[0.16em] text-primary/65">Team status</p>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-white/80 p-4">
                  <p className="text-sm text-muted-foreground">League fee</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {formatCurrency(team.amount_cents)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">$20 per player</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {team.payment_status === "approved"
                      ? "Venmo payment approved"
                      : "Venmo payment pending admin review"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-4">
                  <p className="text-sm text-muted-foreground">Upcoming game</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {activeReservation
                      ? `${activeReservation.day_label} at ${activeReservation.time_label}`
                      : "No upcoming slot booked"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {activeReservation
                      ? "Status: approved"
                      : "Select a slot once your team payment is approved."}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm uppercase tracking-[0.16em] text-primary/65">
                Reservation history
              </p>
              <div className="mt-5 space-y-3">
                {reservationHistory.length === 0 ? (
                  <div className="rounded-2xl bg-white/80 p-4 text-sm text-muted-foreground">
                    No reservation activity yet.
                  </div>
                ) : (
                  reservationHistory.map((reservation: ReservationRecord) => (
                    <div className="rounded-2xl bg-white/80 p-4" key={reservation.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">
                          {reservation.day_label} at {reservation.time_label}
                        </p>
                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                          {reservation.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
