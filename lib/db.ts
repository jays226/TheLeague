import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

import { env } from "@/lib/env";
import { recurringSlots } from "@/lib/slots";

if (!env.databaseUrl) {
  throw new Error("Missing DATABASE_URL. Supabase/Postgres is required for this deployment.");
}

declare global {
  // eslint-disable-next-line no-var
  var __leaguePool: Pool | undefined;
}

const pool =
  global.__leaguePool ||
  new Pool({
    connectionString: env.databaseUrl,
    ssl: env.databaseUrl.includes("localhost")
      ? false
      : {
          rejectUnauthorized: false
        }
  });

if (process.env.NODE_ENV !== "production") {
  global.__leaguePool = pool;
}

async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  const result = await pool.query<T>(text, values);
  return result.rows;
}

async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type TeamRecord = {
  id: string;
  team_name: string;
  player_one_name: string;
  player_one_email: string;
  player_two_name: string;
  player_two_email: string;
  password_hash: string;
  verification_status: unknown;
  payment_status: "pending" | "approved";
  amount_cents: number;
  access_token: string | null;
  created_at: string;
  paid_at: string | null;
};

export type CreateTeamInput = {
  id: string;
  teamName: string;
  playerOneName: string;
  playerOneEmail: string;
  playerTwoName: string;
  playerTwoEmail: string;
  passwordHash: string;
  verificationStatus: string;
  accessToken: string;
};

export type SlotRecord = {
  id: string;
  day_key: string;
  day_label: string;
  time_label: string;
  sort_order: number;
  capacity: number;
  reserved_count: number;
  available_spots: number;
  is_full: number;
  teams: string[];
};

export type ReservationRecord = {
  id: string;
  team_id: string;
  slot_id: string;
  status: "pending" | "approved" | "cancelled" | "rejected";
  created_at: string;
  updated_at: string;
  team_name?: string;
  day_label?: string;
  time_label?: string;
  capacity?: number;
};

export type AdminTeamRow = TeamRecord & {
  active_slot_id: string | null;
  active_day_label: string | null;
  active_time_label: string | null;
  active_reservation_status: ReservationRecord["status"] | null;
};

function normalizeTeam(row: TeamRecord): TeamRecord {
  return {
    ...row,
    amount_cents: Number(row.amount_cents)
  };
}

function hydrateReservation<T extends ReservationRecord>(reservation: T) {
  const slot = recurringSlots.find((entry) => entry.id === reservation.slot_id);

  return {
    ...reservation,
    day_label: slot?.dayLabel,
    time_label: slot?.timeLabel,
    capacity: slot?.capacity
  };
}

export async function createTeam(input: CreateTeamInput) {
  const rows = await query<TeamRecord>(
    `
      INSERT INTO teams (
        id,
        team_name,
        player_one_name,
        player_one_email,
        player_two_name,
        player_two_email,
        password_hash,
        verification_status,
        payment_status,
        amount_cents,
        access_token,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'pending', 4000, $9, now()
      )
      RETURNING *
    `,
    [
      input.id,
      input.teamName,
      input.playerOneName,
      input.playerOneEmail,
      input.playerTwoName,
      input.playerTwoEmail,
      input.passwordHash,
      input.verificationStatus,
      input.accessToken
    ]
  );

  return rows[0] ? normalizeTeam(rows[0]) : undefined;
}

export async function getTeamById(id: string) {
  const rows = await query<TeamRecord>("SELECT * FROM teams WHERE id = $1 LIMIT 1", [id]);
  return rows[0] ? normalizeTeam(rows[0]) : undefined;
}

export async function getTeamByName(teamName: string) {
  const rows = await query<TeamRecord>(
    "SELECT * FROM teams WHERE lower(team_name) = lower($1) LIMIT 1",
    [teamName]
  );
  return rows[0] ? normalizeTeam(rows[0]) : undefined;
}

export async function getTeamByAccessToken(accessToken: string) {
  const rows = await query<TeamRecord>(
    "SELECT * FROM teams WHERE access_token = $1 LIMIT 1",
    [accessToken]
  );
  return rows[0] ? normalizeTeam(rows[0]) : undefined;
}

export async function getExistingConflict(input: {
  teamName: string;
  playerOneEmail: string;
  playerTwoEmail: string;
}) {
  const rows = await query<TeamRecord>(
    `
      SELECT *
      FROM teams
      WHERE team_name = $1
        OR player_one_email IN ($2, $3)
        OR player_two_email IN ($2, $3)
        OR player_one_email = $3
        OR player_two_email = $2
      LIMIT 1
    `,
    [input.teamName, input.playerOneEmail, input.playerTwoEmail]
  );

  return rows[0] ? normalizeTeam(rows[0]) : undefined;
}

export async function listTeams() {
  const rows = await query<TeamRecord>("SELECT * FROM teams ORDER BY created_at DESC");
  return rows.map(normalizeTeam);
}

export async function listTeamsWithReservations() {
  const teams = await listTeams();
  const reservations = await query<ReservationRecord>(
    `
      SELECT *
      FROM reservations
      WHERE status IN ('pending', 'approved')
      ORDER BY
        CASE status
          WHEN 'pending' THEN 0
          ELSE 1
        END,
        updated_at DESC
    `
  );

  const reservationMap = new Map<string, ReservationRecord>();

  for (const reservation of reservations) {
    if (!reservationMap.has(reservation.team_id)) {
      reservationMap.set(reservation.team_id, reservation);
    }
  }

  return teams.map((team) => {
    const reservation = reservationMap.get(team.id);
    const slot = recurringSlots.find((entry) => entry.id === reservation?.slot_id);

    return {
      ...team,
      active_slot_id: reservation?.slot_id ?? null,
      active_day_label: slot?.dayLabel ?? null,
      active_time_label: slot?.timeLabel ?? null,
      active_reservation_status: reservation?.status ?? null
    } satisfies AdminTeamRow;
  });
}

export async function approveTeamPayment(teamId: string) {
  await query(
    `
      UPDATE teams
      SET payment_status = 'approved',
          paid_at = COALESCE(paid_at, now())
      WHERE id = $1
    `,
    [teamId]
  );
}

export async function createTeamByAdmin(input: {
  id: string;
  teamName: string;
  playerOneName: string;
  playerOneEmail: string;
  playerTwoName: string;
  playerTwoEmail: string;
  passwordHash: string;
  paymentStatus: TeamRecord["payment_status"];
  amountCents?: number;
  accessToken: string;
}) {
  await query(
    `
      INSERT INTO teams (
        id,
        team_name,
        player_one_name,
        player_one_email,
        player_two_name,
        player_two_email,
        password_hash,
        verification_status,
        payment_status,
        amount_cents,
        access_token,
        created_at,
        paid_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, '[]'::jsonb, $8, $9, $10, now(),
        CASE WHEN $8 = 'approved' THEN now() ELSE NULL END
      )
    `,
    [
      input.id,
      input.teamName,
      input.playerOneName,
      input.playerOneEmail,
      input.playerTwoName,
      input.playerTwoEmail,
      input.passwordHash,
      input.paymentStatus,
      input.amountCents ?? 4000,
      input.accessToken
    ]
  );
}

export async function updateTeamByAdmin(input: {
  teamId: string;
  teamName: string;
  playerOneName: string;
  playerOneEmail: string;
  playerTwoName: string;
  playerTwoEmail: string;
  paymentStatus: TeamRecord["payment_status"];
  passwordHash?: string;
}) {
  const currentTeam = await getTeamById(input.teamId);

  if (!currentTeam) {
    throw new Error("Team not found.");
  }

  await query(
    `
      UPDATE teams
      SET
        team_name = $2,
        player_one_name = $3,
        player_one_email = $4,
        player_two_name = $5,
        player_two_email = $6,
        password_hash = $7,
        payment_status = $8,
        paid_at = CASE
          WHEN $8 = 'approved' THEN COALESCE(paid_at, now())
          ELSE NULL
        END
      WHERE id = $1
    `,
    [
      input.teamId,
      input.teamName,
      input.playerOneName,
      input.playerOneEmail,
      input.playerTwoName,
      input.playerTwoEmail,
      input.passwordHash || currentTeam.password_hash,
      input.paymentStatus
    ]
  );
}

export async function deleteTeamByAdmin(teamId: string) {
  await query("DELETE FROM teams WHERE id = $1", [teamId]);
}

export async function listApprovedTeamsForSlot(slotId: string) {
  return query<{ team_name: string }>(
    `
      SELECT t.team_name
      FROM reservations r
      JOIN teams t ON t.id = r.team_id
      WHERE r.slot_id = $1
        AND r.status = 'approved'
      ORDER BY t.team_name ASC
    `,
    [slotId]
  );
}

export async function listSlots() {
  const counts = await query<{ slot_id: string; count: string }>(
    `
      SELECT slot_id, COUNT(*)::text AS count
      FROM reservations
      WHERE status = 'approved'
      GROUP BY slot_id
    `
  );

  const countMap = new Map(counts.map((row) => [row.slot_id, Number(row.count)]));
  const teamEntries = await Promise.all(
    recurringSlots.map(async (slot) => ({
      slotId: slot.id,
      teams: (await listApprovedTeamsForSlot(slot.id)).map((team) => team.team_name)
    }))
  );
  const teamMap = new Map(teamEntries.map((entry) => [entry.slotId, entry.teams]));

  return recurringSlots.map((slot) => {
    const reservedCount = countMap.get(slot.id) || 0;
    const availableSpots = Math.max(slot.capacity - reservedCount, 0);

    return {
      id: slot.id,
      day_key: slot.dayKey,
      day_label: slot.dayLabel,
      time_label: slot.timeLabel,
      sort_order: slot.sortOrder,
      capacity: slot.capacity,
      reserved_count: reservedCount,
      available_spots: availableSpots,
      is_full: availableSpots <= 0 ? 1 : 0,
      teams: teamMap.get(slot.id) || []
    } satisfies SlotRecord;
  });
}

export function getSlotById(slotId: string) {
  return recurringSlots.find((slot) => slot.id === slotId);
}

export async function getReservationById(id: string) {
  const rows = await query<ReservationRecord>(
    "SELECT * FROM reservations WHERE id = $1 LIMIT 1",
    [id]
  );
  return rows[0];
}

export async function getActiveReservationForTeam(teamId: string) {
  const rows = await query<ReservationRecord>(
    `
      SELECT *
      FROM reservations
      WHERE team_id = $1
        AND status = 'approved'
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [teamId]
  );

  return rows[0] ? hydrateReservation(rows[0]) : undefined;
}

export async function getPendingReservationForTeam(teamId: string) {
  const rows = await query<ReservationRecord>(
    `
      SELECT *
      FROM reservations
      WHERE team_id = $1
        AND status = 'pending'
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [teamId]
  );

  return rows[0] ? hydrateReservation(rows[0]) : undefined;
}

export async function listReservationsForTeam(teamId: string) {
  const rows = await query<ReservationRecord>(
    `
      SELECT *
      FROM reservations
      WHERE team_id = $1
      ORDER BY
        CASE status
          WHEN 'approved' THEN 0
          WHEN 'pending' THEN 1
          ELSE 2
        END,
        updated_at DESC
    `,
    [teamId]
  );

  return rows.map(hydrateReservation);
}

export async function getReservationStats() {
  const totalCapacity = recurringSlots.reduce((sum, slot) => sum + slot.capacity, 0);
  const rows = await query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM reservations
      WHERE status = 'approved'
    `
  );

  const totalReservations = Number(rows[0]?.count || 0);

  return {
    totalSlots: recurringSlots.length,
    totalReservations,
    availableSpots: totalCapacity - totalReservations
  };
}

export async function reserveSlot(input: { id: string; teamId: string; slotId: string }) {
  const team = await getTeamById(input.teamId);

  if (!team || team.payment_status !== "approved") {
    throw new Error("Your team must be payment-approved before signing up for a slot.");
  }

  const slot = getSlotById(input.slotId);

  if (!slot) {
    throw new Error("That slot is no longer available.");
  }

  const currentReservation = await getActiveReservationForTeam(input.teamId);
  const pendingReservation = await getPendingReservationForTeam(input.teamId);

  if (currentReservation?.slot_id === input.slotId) {
    throw new Error("Your team is already signed up for that slot.");
  }

  if (pendingReservation) {
    throw new Error("Your team already has a pending change request.");
  }

  const countRows = await query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM reservations
      WHERE slot_id = $1
        AND status = 'approved'
    `,
    [input.slotId]
  );

  if (Number(countRows[0]?.count || 0) >= slot.capacity) {
    throw new Error("That slot is full.");
  }

  await query(
    `
      INSERT INTO reservations (
        id,
        team_id,
        slot_id,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, now(), now())
    `,
    [input.id, input.teamId, input.slotId, currentReservation ? "pending" : "approved"]
  );
}

export async function cancelActiveReservation(teamId: string) {
  const pendingReservation = await getPendingReservationForTeam(teamId);
  const currentReservation = pendingReservation || (await getActiveReservationForTeam(teamId));

  if (!currentReservation) {
    throw new Error("Your team does not have an active reservation.");
  }

  await query(
    `
      UPDATE reservations
      SET status = 'cancelled',
          updated_at = now()
      WHERE id = $1
    `,
    [currentReservation.id]
  );
}

export async function moveTeamReservation(teamId: string, slotId: string | null) {
  const team = await getTeamById(teamId);

  if (!team) {
    throw new Error("Team not found.");
  }

  const currentReservation = await getActiveReservationForTeam(teamId);
  const pendingReservation = await getPendingReservationForTeam(teamId);

  if (!slotId) {
    if (pendingReservation) {
      await query(
        `
          UPDATE reservations
          SET status = 'cancelled',
              updated_at = now()
          WHERE id = $1
        `,
        [pendingReservation.id]
      );
      return;
    }

    if (!currentReservation) {
      return;
    }

    await cancelActiveReservation(teamId);
    return;
  }

  const slot = getSlotById(slotId);

  if (!slot) {
    throw new Error("Target slot not found.");
  }

  if (currentReservation?.slot_id === slotId || pendingReservation?.slot_id === slotId) {
    return;
  }

  const countRows = await query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM reservations
      WHERE slot_id = $1
        AND status = 'approved'
        AND team_id != $2
    `,
    [slotId, teamId]
  );

  if (Number(countRows[0]?.count || 0) >= slot.capacity) {
    throw new Error("That destination slot is full.");
  }

  await withTransaction(async (client) => {
    if (pendingReservation) {
      await client.query(
        `
          UPDATE reservations
          SET status = 'cancelled',
              updated_at = now()
          WHERE id = $1
        `,
        [pendingReservation.id]
      );
    }

    await client.query(
      `
        INSERT INTO reservations (
          id,
          team_id,
          slot_id,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, now(), now())
      `,
      [
        crypto.randomUUID(),
        teamId,
        slotId,
        currentReservation ? "pending" : team.payment_status === "approved" ? "approved" : "pending"
      ]
    );
  });
}

export async function listAllReservations() {
  const rows = await query<ReservationRecord & { team_name: string }>(
    `
      SELECT r.*, t.team_name
      FROM reservations r
      JOIN teams t ON t.id = r.team_id
      ORDER BY
        CASE r.status
          WHEN 'pending' THEN 0
          WHEN 'approved' THEN 1
          ELSE 2
        END,
        r.updated_at DESC
    `
  );

  return rows.map(hydrateReservation);
}

export async function approveReservation(reservationId: string) {
  const reservation = await getReservationById(reservationId);

  if (!reservation || reservation.status === "cancelled" || reservation.status === "rejected") {
    throw new Error("Reservation not found.");
  }

  const slot = getSlotById(reservation.slot_id);

  if (!slot) {
    throw new Error("Slot not found.");
  }

  const countRows = await query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM reservations
      WHERE slot_id = $1
        AND status = 'approved'
        AND id != $2
    `,
    [reservation.slot_id, reservationId]
  );

  if (Number(countRows[0]?.count || 0) >= slot.capacity) {
    throw new Error("This slot is already full.");
  }

  const currentApproved = await getActiveReservationForTeam(reservation.team_id);

  await withTransaction(async (client) => {
    if (currentApproved && currentApproved.id !== reservationId) {
      await client.query(
        `
          UPDATE reservations
          SET status = 'cancelled',
              updated_at = now()
          WHERE id = $1
        `,
        [currentApproved.id]
      );
    }

    await client.query(
      `
        UPDATE reservations
        SET status = 'approved',
            updated_at = now()
        WHERE id = $1
      `,
      [reservationId]
    );
  });
}

export async function rejectReservation(reservationId: string) {
  await query(
    `
      UPDATE reservations
      SET status = 'rejected',
          updated_at = now()
      WHERE id = $1
    `,
    [reservationId]
  );
}
