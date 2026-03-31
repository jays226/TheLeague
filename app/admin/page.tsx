import { cookies } from "next/headers";
import Link from "next/link";

import {
  approveReservationAction,
  approveTeamPaymentAction,
  createTeamAction,
  deleteTeamAction,
  loginAction,
  moveTeamReservationAction,
  logoutAction,
  rejectReservationAction,
  setTeamWaitlistAction,
  updateTeamAction
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  type AdminTeamRow,
  getAdminSession,
  getReservationStats,
  listAllReservations,
  listSlots,
  purgeExpiredAdminSessions,
  listTeamsWithReservations,
  type ReservationRecord,
  type SlotRecord
} from "@/lib/db";
import { env } from "@/lib/env";
import { adminCookieName, hashAdminSessionToken } from "@/lib/session";

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(adminCookieName)?.value;

  await purgeExpiredAdminSessions();

  const isAuthed =
    !!env.adminPortalPassword &&
    !!sessionToken &&
    !!(await getAdminSession(hashAdminSessionToken(sessionToken)));

  if (!isAuthed) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8f3eb_0%,#eef3ee_100%)] px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-md">
          <Card className="p-8">
            <Badge>Admin portal</Badge>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-foreground">
              League control room
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Review Venmo payments and manually approve pending slot reservations.
            </p>
            <form action={loginAction} className="mt-6 space-y-4">
              <input
                className="flex h-12 w-full rounded-xl border border-border bg-white/80 px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                name="password"
                placeholder="Admin password"
                type="password"
              />
              {params.error ? (
                <div className="rounded-2xl border border-[rgba(245,132,79,0.3)] bg-[rgba(245,132,79,0.12)] px-4 py-3 text-sm text-foreground">
                  {params.error === "rate-limit"
                    ? "Too many failed attempts. Try again in 15 minutes."
                    : "Invalid admin password."}
                </div>
              ) : null}
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
                type="submit"
              >
                Enter admin portal
              </button>
            </form>
          </Card>
        </div>
      </main>
    );
  }

  const teams = (await listTeamsWithReservations()) as AdminTeamRow[];
  const slots = (await listSlots()) as SlotRecord[];
  const reservations = (await listAllReservations()) as ReservationRecord[];
  const stats = await getReservationStats();
  const waitlistTeams = [...teams]
    .filter((team) => team.is_waitlist)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f3eb_0%,#eef3ee_100%)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge>Admin portal</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
              The League operations desk
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Approve payments, review reservation demand, and manage the weekly recurring slot
              board.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-white/75 px-5 text-sm font-semibold text-foreground transition hover:bg-white"
              href="/admin/games"
            >
              Weekly games
            </Link>
            <form action={logoutAction}>
              <button
                className="inline-flex h-11 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition hover:bg-[hsl(42_40%_86%)]"
                type="submit"
              >
                Log out
              </button>
            </form>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Total slots", String(stats.totalSlots)],
            ["Reservations", String(stats.totalReservations)],
            ["Available spots", String(stats.availableSpots)]
          ].map(([label, value]) => (
            <Card className="p-5" key={label}>
              <p className="text-sm uppercase tracking-[0.16em] text-primary/65">{label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                {value}
              </p>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-primary/65">Waitlist order</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {waitlistTeams.length === 0
                  ? "No teams are currently on the waitlist."
                  : `${waitlistTeams.length} team${waitlistTeams.length === 1 ? "" : "s"} on the waitlist`}
              </p>
            </div>
            {waitlistTeams.length > 0 ? (
              <span className="rounded-full bg-[rgba(245,132,79,0.16)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(22_78%_37%)]">
                Oldest to newest
              </span>
            ) : null}
          </div>

          {waitlistTeams.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {waitlistTeams.map((team, index) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/80 p-4"
                  key={team.id}
                >
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      #{index + 1} {team.team_name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {team.player_one_email} • {team.player_two_email}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Joined {new Date(team.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-6">
            <p className="text-sm uppercase tracking-[0.16em] text-primary/65">Add team</p>
            <form action={createTeamAction} className="mt-5 grid gap-3">
              <input
                className="h-11 rounded-xl border border-border bg-white/80 px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                name="teamName"
                placeholder="Team name"
                required
              />
              <input
                className="h-11 rounded-xl border border-border bg-white/80 px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                name="playerOneName"
                placeholder="Player one name"
                required
              />
              <input
                className="h-11 rounded-xl border border-border bg-white/80 px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                name="playerOneEmail"
                placeholder="player1@virginia.edu"
                required
                type="email"
              />
              <input
                className="h-11 rounded-xl border border-border bg-white/80 px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                name="playerTwoName"
                placeholder="Player two name"
                required
              />
              <input
                className="h-11 rounded-xl border border-border bg-white/80 px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                name="playerTwoEmail"
                placeholder="player2@virginia.edu"
                required
                type="email"
              />
              <input
                className="h-11 rounded-xl border border-border bg-white/80 px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                name="password"
                placeholder="Temporary password"
                required
                type="password"
              />
              <select
                className="h-11 rounded-xl border border-border bg-white/80 px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                defaultValue="pending"
                name="paymentStatus"
              >
                <option value="pending">Pending payment</option>
                <option value="approved">Payment approved</option>
              </select>
              <button
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
                type="submit"
              >
                Add team
              </button>
            </form>
          </Card>

          <Card className="p-6">
            <p className="text-sm uppercase tracking-[0.16em] text-primary/65">Team payments</p>
            <div className="mt-5 space-y-3">
              {teams.length === 0 ? (
                <div className="rounded-2xl bg-white/80 p-4 text-sm text-muted-foreground">
                  No teams registered yet.
                </div>
              ) : (
                teams.map((team: AdminTeamRow) => (
                  <div className="rounded-2xl bg-white/80 p-4" key={team.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{team.team_name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {team.player_one_name} and {team.player_two_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Current slot:{" "}
                          {team.active_day_label && team.active_time_label
                            ? `${team.active_day_label} at ${team.active_time_label}`
                            : "None"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {team.is_waitlist ? (
                          <span className="rounded-full bg-[rgba(245,132,79,0.16)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(22_78%_37%)]">
                            Waitlist
                          </span>
                        ) : null}
                        {team.payment_status === "approved" ? (
                          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                            Approved
                          </span>
                        ) : (
                          <form action={approveTeamPaymentAction}>
                            <input name="teamId" type="hidden" value={team.id} />
                            <button
                              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
                              type="submit"
                            >
                              Mark paid
                            </button>
                          </form>
                        )}
                        <form action={setTeamWaitlistAction}>
                          <input name="teamId" type="hidden" value={team.id} />
                          <input name="isWaitlist" type="hidden" value={team.is_waitlist ? "0" : "1"} />
                          <button
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-[rgba(245,132,79,0.12)]"
                            type="submit"
                          >
                            {team.is_waitlist ? "Remove waitlist" : "Add to waitlist"}
                          </button>
                        </form>
                        <form action={deleteTeamAction}>
                          <input name="teamId" type="hidden" value={team.id} />
                          <button
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-[rgba(245,132,79,0.16)] px-4 text-sm font-semibold text-foreground transition hover:bg-[rgba(245,132,79,0.24)]"
                            type="submit"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>

                    <form action={updateTeamAction} className="mt-4 grid gap-3 md:grid-cols-2">
                      <input name="teamId" type="hidden" value={team.id} />
                      <input
                        className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                        defaultValue={team.team_name}
                        name="teamName"
                        required
                      />
                      <select
                        className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                        defaultValue={team.payment_status}
                        name="paymentStatus"
                      >
                        <option value="pending">Pending payment</option>
                        <option value="approved">Payment approved</option>
                      </select>
                      <input
                        className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                        defaultValue={team.player_one_name}
                        name="playerOneName"
                        required
                      />
                      <input
                        className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                        defaultValue={team.player_one_email}
                        name="playerOneEmail"
                        required
                        type="email"
                      />
                      <input
                        className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                        defaultValue={team.player_two_name}
                        name="playerTwoName"
                        required
                      />
                      <input
                        className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                        defaultValue={team.player_two_email}
                        name="playerTwoEmail"
                        required
                        type="email"
                      />
                      <input
                        className="h-11 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring md:col-span-2"
                        name="password"
                        placeholder="Leave blank to keep existing password"
                        type="password"
                      />
                      <button
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition hover:bg-[hsl(42_40%_86%)] md:col-span-2"
                        type="submit"
                      >
                        Save team changes
                      </button>
                    </form>

                    <form action={moveTeamReservationAction} className="mt-3 flex flex-wrap gap-3">
                      <input name="teamId" type="hidden" value={team.id} />
                      <select
                        className="h-11 min-w-56 rounded-xl border border-border bg-white px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                        defaultValue={team.active_slot_id || ""}
                        name="slotId"
                      >
                        <option value="">No slot assigned</option>
                        {slots.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {slot.day_label} at {slot.time_label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
                        type="submit"
                      >
                        Move team slot
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-sm uppercase tracking-[0.16em] text-primary/65">Slot board</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {slots.map((slot: SlotRecord) => (
                <div className="rounded-2xl bg-white/80 p-4" key={slot.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      {slot.day_label} at {slot.time_label}
                    </p>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                      {slot.available_spots > 0 ? "Open" : "Full"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {slot.available_spots}/{slot.capacity} spots left
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <p className="text-sm uppercase tracking-[0.16em] text-primary/65">Reservation queue</p>
          <div className="mt-5 space-y-3">
            {reservations.length === 0 ? (
              <div className="rounded-2xl bg-white/80 p-4 text-sm text-muted-foreground">
                No reservation activity yet.
              </div>
            ) : (
              reservations.map((reservation: ReservationRecord) => (
                <div className="rounded-2xl bg-white/80 p-4" key={reservation.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {reservation.team_name} - {reservation.day_label} at {reservation.time_label}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Status: {reservation.status}
                      </p>
                    </div>
                    {reservation.status === "pending" ? (
                      <div className="flex gap-3">
                        <form action={approveReservationAction}>
                          <input name="reservationId" type="hidden" value={reservation.id} />
                          <button
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[hsl(151_58%_18%)]"
                            type="submit"
                          >
                            Approve
                          </button>
                        </form>
                        <form action={rejectReservationAction}>
                          <input name="reservationId" type="hidden" value={reservation.id} />
                          <button
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:bg-[hsl(42_40%_86%)]"
                            type="submit"
                          >
                            Reject
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                        {reservation.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
