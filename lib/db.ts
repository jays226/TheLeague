import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { env } from "@/lib/env";
import { recurringSlots } from "@/lib/slots";

const dbFile = path.resolve(process.cwd(), env.dbPath);
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile, {
  timeout: 5000
});

db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

db.exec(`
  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    team_name TEXT NOT NULL,
    player_one_name TEXT NOT NULL,
    player_one_email TEXT NOT NULL,
    player_two_name TEXT NOT NULL,
    player_two_email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    verification_status TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    amount_cents INTEGER NOT NULL DEFAULT 4000,
    access_token TEXT,
    created_at TEXT NOT NULL,
    paid_at TEXT
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_team_name
  ON teams(team_name);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_access_token
  ON teams(access_token);

  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    slot_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(team_id) REFERENCES teams(id)
  );
`);

export type TeamRecord = {
  id: string;
  team_name: string;
  player_one_name: string;
  player_one_email: string;
  player_two_name: string;
  player_two_email: string;
  password_hash: string;
  verification_status: string;
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

export function createTeam(input: CreateTeamInput) {
  db.prepare(
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
        @id,
        @team_name,
        @player_one_name,
        @player_one_email,
        @player_two_name,
        @player_two_email,
        @password_hash,
        @verification_status,
        'pending',
        4000,
        @access_token,
        @created_at
      )
    `
  ).run({
    id: input.id,
    team_name: input.teamName,
    player_one_name: input.playerOneName,
    player_one_email: input.playerOneEmail,
    player_two_name: input.playerTwoName,
    player_two_email: input.playerTwoEmail,
    password_hash: input.passwordHash,
    verification_status: input.verificationStatus,
    access_token: input.accessToken,
    created_at: new Date().toISOString()
  });

  return getTeamById(input.id);
}

export function getTeamById(id: string) {
  return db.prepare("SELECT * FROM teams WHERE id = ?").get(id) as TeamRecord | undefined;
}

export function getTeamByName(teamName: string) {
  return db
    .prepare("SELECT * FROM teams WHERE lower(team_name) = lower(?)")
    .get(teamName) as TeamRecord | undefined;
}

export function getTeamByAccessToken(accessToken: string) {
  return db
    .prepare("SELECT * FROM teams WHERE access_token = ?")
    .get(accessToken) as TeamRecord | undefined;
}

export function getExistingConflict(input: {
  teamName: string;
  playerOneEmail: string;
  playerTwoEmail: string;
}) {
  return db
    .prepare(
      `
        SELECT *
        FROM teams
        WHERE team_name = ?
          OR player_one_email IN (?, ?)
          OR player_two_email IN (?, ?)
          OR player_one_email = ?
          OR player_two_email = ?
        LIMIT 1
      `
    )
    .get(
      input.teamName,
      input.playerOneEmail,
      input.playerTwoEmail,
      input.playerOneEmail,
      input.playerTwoEmail,
      input.playerTwoEmail,
      input.playerOneEmail
    ) as TeamRecord | undefined;
}

export function listTeams() {
  return db.prepare("SELECT * FROM teams ORDER BY created_at DESC").all() as TeamRecord[];
}

export function listTeamsWithReservations() {
  const teams = listTeams();
  const activeReservations = db
    .prepare(
      `
        SELECT *
        FROM reservations
        WHERE status IN ('pending', 'approved')
        ORDER BY updated_at DESC
      `
    )
    .all() as ReservationRecord[];

  const reservationMap = new Map<string, ReservationRecord>();

  for (const reservation of activeReservations) {
    if (!reservationMap.has(reservation.team_id)) {
      reservationMap.set(reservation.team_id, reservation);
    }
  }

  return teams.map((team) => {
    const reservation = reservationMap.get(team.id);
    const slot = reservation ? getSlotById(reservation.slot_id) : undefined;

    return {
      ...team,
      active_slot_id: reservation?.slot_id ?? null,
      active_day_label: slot?.dayLabel ?? null,
      active_time_label: slot?.timeLabel ?? null,
      active_reservation_status: reservation?.status ?? null
    } satisfies AdminTeamRow;
  });
}

export function listApprovedTeamsForSlot(slotId: string) {
  return db
    .prepare(
      `
        SELECT t.team_name
        FROM reservations r
        JOIN teams t ON t.id = r.team_id
        WHERE r.slot_id = ?
          AND r.status = 'approved'
        ORDER BY t.team_name ASC
      `
    )
    .all(slotId) as Array<{ team_name: string }>;
}

export function approveTeamPayment(teamId: string) {
  db.prepare(
    `
      UPDATE teams
      SET payment_status = 'approved',
          paid_at = ?
      WHERE id = ?
    `
  ).run(new Date().toISOString(), teamId);
}

export function createTeamByAdmin(input: {
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
  db.prepare(
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
        @id,
        @team_name,
        @player_one_name,
        @player_one_email,
        @player_two_name,
        @player_two_email,
        @password_hash,
        '[]',
        @payment_status,
        @amount_cents,
        @access_token,
        @created_at,
        @paid_at
      )
    `
  ).run({
    id: input.id,
    team_name: input.teamName,
    player_one_name: input.playerOneName,
    player_one_email: input.playerOneEmail,
    player_two_name: input.playerTwoName,
    player_two_email: input.playerTwoEmail,
    password_hash: input.passwordHash,
    payment_status: input.paymentStatus,
    amount_cents: input.amountCents ?? 4000,
    access_token: input.accessToken,
    created_at: new Date().toISOString(),
    paid_at: input.paymentStatus === "approved" ? new Date().toISOString() : null
  });
}

export function updateTeamByAdmin(input: {
  teamId: string;
  teamName: string;
  playerOneName: string;
  playerOneEmail: string;
  playerTwoName: string;
  playerTwoEmail: string;
  paymentStatus: TeamRecord["payment_status"];
  passwordHash?: string;
}) {
  const currentTeam = getTeamById(input.teamId);

  if (!currentTeam) {
    throw new Error("Team not found.");
  }

  db.prepare(
    `
      UPDATE teams
      SET
        team_name = @team_name,
        player_one_name = @player_one_name,
        player_one_email = @player_one_email,
        player_two_name = @player_two_name,
        player_two_email = @player_two_email,
        password_hash = @password_hash,
        payment_status = @payment_status,
        paid_at = @paid_at
      WHERE id = @team_id
    `
  ).run({
    team_id: input.teamId,
    team_name: input.teamName,
    player_one_name: input.playerOneName,
    player_one_email: input.playerOneEmail,
    player_two_name: input.playerTwoName,
    player_two_email: input.playerTwoEmail,
    password_hash: input.passwordHash || currentTeam.password_hash,
    payment_status: input.paymentStatus,
    paid_at:
      input.paymentStatus === "approved"
        ? currentTeam.paid_at || new Date().toISOString()
        : null
  });
}

export function deleteTeamByAdmin(teamId: string) {
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM reservations WHERE team_id = ?").run(teamId);
    db.prepare("DELETE FROM teams WHERE id = ?").run(teamId);
  });

  transaction();
}

export function listSlots() {
  const approvedCounts = db
    .prepare(
      `
        SELECT slot_id, COUNT(*) AS count
        FROM reservations
        WHERE status = 'approved'
        GROUP BY slot_id
      `
    )
    .all() as Array<{ slot_id: string; count: number }>;

  const countMap = new Map(approvedCounts.map((row) => [row.slot_id, Number(row.count)]));
  const teamMap = new Map(
    recurringSlots.map((slot) => [
      slot.id,
      listApprovedTeamsForSlot(slot.id).map((team) => team.team_name)
    ])
  );

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
    };
  });
}

export function getSlotById(slotId: string) {
  return recurringSlots.find((slot) => slot.id === slotId);
}

export function getReservationById(id: string) {
  return db.prepare("SELECT * FROM reservations WHERE id = ?").get(id) as
    | ReservationRecord
    | undefined;
}

function hydrateReservation<T extends ReservationRecord>(reservation: T) {
  const slot = getSlotById(reservation.slot_id);

  return {
    ...reservation,
    day_label: slot?.dayLabel,
    time_label: slot?.timeLabel,
    capacity: slot?.capacity
  };
}

export function getActiveReservationForTeam(teamId: string) {
  const reservation = db
    .prepare(
      `
        SELECT *
        FROM reservations
        WHERE team_id = ?
          AND status = 'approved'
        ORDER BY updated_at DESC
        LIMIT 1
      `
    )
    .get(teamId) as ReservationRecord | undefined;

  return reservation ? hydrateReservation(reservation) : undefined;
}

export function getPendingReservationForTeam(teamId: string) {
  const reservation = db
    .prepare(
      `
        SELECT *
        FROM reservations
        WHERE team_id = ?
          AND status = 'pending'
        ORDER BY updated_at DESC
        LIMIT 1
      `
    )
    .get(teamId) as ReservationRecord | undefined;

  return reservation ? hydrateReservation(reservation) : undefined;
}

export function listReservationsForTeam(teamId: string) {
  const reservations = db
    .prepare(
      `
        SELECT *
        FROM reservations
        WHERE team_id = ?
        ORDER BY
          CASE status
            WHEN 'approved' THEN 0
            WHEN 'pending' THEN 1
            ELSE 2
          END,
          updated_at DESC
      `
    )
    .all(teamId) as ReservationRecord[];

  return reservations.map(hydrateReservation);
}

export function getReservationStats() {
  const totalCapacity = recurringSlots.reduce((sum, slot) => sum + slot.capacity, 0);
  const activeReservations = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM reservations
        WHERE status = 'approved'
      `
    )
    .get() as { count: number };

  return {
    totalSlots: recurringSlots.length,
    totalReservations: activeReservations.count,
    availableSpots: totalCapacity - activeReservations.count
  };
}

export function reserveSlot(input: { id: string; teamId: string; slotId: string }) {
  const team = getTeamById(input.teamId);

  if (!team || team.payment_status !== "approved") {
    throw new Error("Your team must be payment-approved before signing up for a slot.");
  }

  const slot = getSlotById(input.slotId);

  if (!slot) {
    throw new Error("That slot is no longer available.");
  }

  const currentReservation = getActiveReservationForTeam(input.teamId);
  const pendingReservation = getPendingReservationForTeam(input.teamId);

  if (currentReservation?.slot_id === input.slotId) {
    throw new Error("Your team is already signed up for that slot.");
  }

  if (pendingReservation) {
    throw new Error("Your team already has a pending change request.");
  }

  const reservedCount = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM reservations
        WHERE slot_id = ?
          AND status = 'approved'
      `
    )
    .get(input.slotId) as { count: number };

  if (reservedCount.count >= slot.capacity) {
    throw new Error("That slot is full.");
  }

  const now = new Date().toISOString();

  db.prepare(
    `
      INSERT INTO reservations (
        id,
        team_id,
        slot_id,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(
    input.id,
    input.teamId,
    input.slotId,
    currentReservation ? "pending" : "approved",
    now,
    now
  );
}

export function cancelActiveReservation(teamId: string) {
  const pendingReservation = getPendingReservationForTeam(teamId);
  const currentReservation = pendingReservation || getActiveReservationForTeam(teamId);

  if (!currentReservation) {
    throw new Error("Your team does not have an active reservation.");
  }

  db.prepare(
    `
      UPDATE reservations
      SET status = 'cancelled',
          updated_at = ?
      WHERE id = ?
    `
  ).run(new Date().toISOString(), currentReservation.id);
}

export function moveTeamReservation(teamId: string, slotId: string | null) {
  const team = getTeamById(teamId);

  if (!team) {
    throw new Error("Team not found.");
  }

  const currentReservation = getActiveReservationForTeam(teamId);
  const pendingReservation = getPendingReservationForTeam(teamId);

  if (!slotId) {
    if (!currentReservation && !pendingReservation) {
      return;
    }

    if (pendingReservation) {
      db.prepare(
        `
          UPDATE reservations
          SET status = 'cancelled',
              updated_at = ?
          WHERE id = ?
        `
      ).run(new Date().toISOString(), pendingReservation.id);
    } else {
      cancelActiveReservation(teamId);
    }
    return;
  }

  const slot = getSlotById(slotId);

  if (!slot) {
    throw new Error("Target slot not found.");
  }

  if (currentReservation?.slot_id === slotId || pendingReservation?.slot_id === slotId) {
    return;
  }

  const reservedCount = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM reservations
        WHERE slot_id = ?
          AND status = 'approved'
          AND team_id != ?
      `
    )
    .get(slotId, teamId) as { count: number };

  if (reservedCount.count >= slot.capacity) {
    throw new Error("That destination slot is full.");
  }

  const now = new Date().toISOString();
  const transaction = db.transaction(() => {
    if (pendingReservation) {
      db.prepare(
        `
          UPDATE reservations
          SET status = 'cancelled',
              updated_at = ?
          WHERE id = ?
        `
      ).run(now, pendingReservation.id);
    }

    db.prepare(
      `
        INSERT INTO reservations (
          id,
          team_id,
          slot_id,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `
    ).run(
      cryptoRandomId(),
      teamId,
      slotId,
      currentReservation ? "pending" : team.payment_status === "approved" ? "approved" : "pending",
      now,
      now
    );
  });

  transaction();
}

export function listAllReservations() {
  const reservations = db
    .prepare(
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
    )
    .all() as ReservationRecord[];

  return reservations.map(hydrateReservation);
}

export function approveReservation(reservationId: string) {
  const reservation = getReservationById(reservationId);

  if (!reservation || reservation.status === "cancelled" || reservation.status === "rejected") {
    throw new Error("Reservation not found.");
  }

  const slot = getSlotById(reservation.slot_id);

  if (!slot) {
    throw new Error("Slot not found.");
  }

  const reservedCount = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM reservations
        WHERE slot_id = ?
          AND status = 'approved'
          AND id != ?
      `
    )
    .get(reservation.slot_id, reservationId) as { count: number };

  if (reservedCount.count >= slot.capacity) {
    throw new Error("This slot is already full.");
  }

  const currentApproved = getActiveReservationForTeam(reservation.team_id);
  const now = new Date().toISOString();
  const transaction = db.transaction(() => {
    if (currentApproved && currentApproved.id !== reservationId) {
      db.prepare(
        `
          UPDATE reservations
          SET status = 'cancelled',
              updated_at = ?
          WHERE id = ?
        `
      ).run(now, currentApproved.id);
    }

    db.prepare(
      `
        UPDATE reservations
        SET status = 'approved',
            updated_at = ?
        WHERE id = ?
      `
    ).run(now, reservationId);
  });

  transaction();
}

export function rejectReservation(reservationId: string) {
  db.prepare(
    `
      UPDATE reservations
      SET status = 'rejected',
          updated_at = ?
      WHERE id = ?
    `
  ).run(new Date().toISOString(), reservationId);
}

function cryptoRandomId() {
  return crypto.randomUUID();
}
