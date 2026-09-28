import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

import { env } from "@/lib/env";
import {
  buildStandingsFromGames,
  generateSlotSchedule,
  type GeneratedLeagueGame,
  type LeagueGameWithResult,
  type PlayoffBracketMatchId,
  type SlotStandings,
  type SlotTeam
} from "@/lib/league-schedule";
import { recurringSlots } from "@/lib/slots";
import { ACTIVE_SEASON_ID } from "@/lib/seasons";
import { getPlayerFeeCents, type PlayerType } from "@/lib/pricing";

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

let bootstrapPromise: Promise<void> | undefined;

async function ensureBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS league_seasons (
          id text PRIMARY KEY,
          name text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        INSERT INTO league_seasons (id, name)
        VALUES ('spring-2026', 'Spring 2026'), ('fall-2026', 'Fall 2026')
        ON CONFLICT (id) DO NOTHING
      `);
      await pool.query(`
        ALTER TABLE teams ADD COLUMN IF NOT EXISTS season_id text
      `);
      await pool.query(`
        UPDATE teams SET season_id = 'spring-2026' WHERE season_id IS NULL
      `);
      await pool.query(`
        ALTER TABLE teams ALTER COLUMN season_id SET DEFAULT 'fall-2026'
      `);
      await pool.query(`
        ALTER TABLE teams ALTER COLUMN season_id SET NOT NULL
      `);
      await pool.query(`
        ALTER TABLE teams ADD CONSTRAINT teams_season_id_fkey
        FOREIGN KEY (season_id) REFERENCES league_seasons(id) NOT VALID
      `).catch((error: { code?: string }) => {
        if (error.code !== "42710") throw error;
      });
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_teams_season_id ON teams (season_id)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_sessions (
          token_hash text PRIMARY KEY,
          created_at timestamptz NOT NULL DEFAULT now(),
          expires_at timestamptz NOT NULL
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_login_attempts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
        ON admin_sessions (expires_at)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_created_at
        ON admin_login_attempts (created_at)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          token_hash text PRIMARY KEY,
          team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          email text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          expires_at timestamptz NOT NULL,
          used_at timestamptz
        )
      `);

      await pool.query(`
        ALTER TABLE password_reset_tokens
        ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE CASCADE
      `);

      await pool.query(`
        ALTER TABLE password_reset_tokens
        ADD COLUMN IF NOT EXISTS email text
      `);

      await pool.query(`
        ALTER TABLE password_reset_tokens
        ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()
      `);

      await pool.query(`
        ALTER TABLE password_reset_tokens
        ADD COLUMN IF NOT EXISTS expires_at timestamptz
      `);

      await pool.query(`
        ALTER TABLE password_reset_tokens
        ADD COLUMN IF NOT EXISTS used_at timestamptz
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_team_id
        ON password_reset_tokens (team_id)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
        ON password_reset_tokens (expires_at)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS game_notification_events (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          notification_type text NOT NULL,
          slot_id text NOT NULL,
          week integer NOT NULL,
          home_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          away_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_game_notification_events_unique
        ON game_notification_events (notification_type, slot_id, week, home_team_id, away_team_id)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS league_games (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          slot_id text NOT NULL,
          day_label text NOT NULL,
          time_label text NOT NULL,
          week integer NOT NULL,
          match_date date NOT NULL,
          date_label text NOT NULL,
          location_label text,
          home_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          away_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await pool.query(`
        ALTER TABLE league_games
        ADD COLUMN IF NOT EXISTS day_label text
      `);

      await pool.query(`
        ALTER TABLE league_games
        ADD COLUMN IF NOT EXISTS time_label text
      `);

      await pool.query(`
        ALTER TABLE league_games
        ADD COLUMN IF NOT EXISTS week integer
      `);

      await pool.query(`
        ALTER TABLE league_games
        ADD COLUMN IF NOT EXISTS match_date date
      `);

      await pool.query(`
        ALTER TABLE league_games
        ADD COLUMN IF NOT EXISTS date_label text
      `);

      await pool.query(`
        ALTER TABLE league_games
        ADD COLUMN IF NOT EXISTS location_label text
      `);

      await pool.query(`
        ALTER TABLE league_games
        ADD COLUMN IF NOT EXISTS home_team_id uuid REFERENCES teams(id) ON DELETE CASCADE
      `);

      await pool.query(`
        ALTER TABLE league_games
        ADD COLUMN IF NOT EXISTS away_team_id uuid REFERENCES teams(id) ON DELETE CASCADE
      `);

      await pool.query(`
        ALTER TABLE league_games
        ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()
      `);

      await pool.query(`
        ALTER TABLE league_games
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_league_games_unique_matchup
        ON league_games (slot_id, week, home_team_id, away_team_id)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_league_games_match_date
        ON league_games (match_date, time_label)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_league_games_slot_id
        ON league_games (slot_id)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS game_results (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          slot_id text NOT NULL,
          week integer NOT NULL,
          match_date date NOT NULL,
          home_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          away_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          winner_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
          home_team_wins integer,
          away_team_wins integer,
          result_type text NOT NULL DEFAULT 'standard',
          forfeiting_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await pool.query(`
        ALTER TABLE game_results
        ADD COLUMN IF NOT EXISTS home_team_wins integer
      `);

      await pool.query(`
        ALTER TABLE game_results
        ADD COLUMN IF NOT EXISTS away_team_wins integer
      `);

      await pool.query(`
        ALTER TABLE game_results
        ADD COLUMN IF NOT EXISTS result_type text NOT NULL DEFAULT 'standard'
      `);

      await pool.query(`
        ALTER TABLE game_results
        ADD COLUMN IF NOT EXISTS forfeiting_team_id uuid REFERENCES teams(id) ON DELETE SET NULL
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS game_result_submissions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          slot_id text NOT NULL,
          week integer NOT NULL,
          match_date date NOT NULL,
          home_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          away_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          submitting_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          winner_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          home_team_wins integer NOT NULL,
          away_team_wins integer NOT NULL,
          result_type text NOT NULL DEFAULT 'standard',
          forfeiting_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await pool.query(`
        ALTER TABLE game_result_submissions
        ADD COLUMN IF NOT EXISTS result_type text NOT NULL DEFAULT 'standard'
      `);

      await pool.query(`
        ALTER TABLE game_result_submissions
        ADD COLUMN IF NOT EXISTS forfeiting_team_id uuid REFERENCES teams(id) ON DELETE SET NULL
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_game_result_submissions_unique_team
        ON game_result_submissions (slot_id, week, home_team_id, away_team_id, submitting_team_id)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_game_result_submissions_slot_id
        ON game_result_submissions (slot_id)
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_game_results_unique_matchup
        ON game_results (slot_id, week, home_team_id, away_team_id)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_game_results_slot_id
        ON game_results (slot_id)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_game_results_winner_team_id
        ON game_results (winner_team_id)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS playoff_game_results (
          matchup_id text PRIMARY KEY,
          winner_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        UPDATE playoff_game_results
        SET matchup_id = 'spring-2026:' || matchup_id
        WHERE position(':' in matchup_id) = 0
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_playoff_game_results_winner_team_id
        ON playoff_game_results (winner_team_id)
      `);

      await pool.query(`
        ALTER TABLE teams
        ADD COLUMN IF NOT EXISTS is_waitlist boolean NOT NULL DEFAULT false
      `);
      await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS player_one_type text NOT NULL DEFAULT 'general'`);
      await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS player_two_type text NOT NULL DEFAULT 'general'`);
      await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS player_one_dupr_id text`);
      await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS player_two_dupr_id text`);
      await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS player_one_fee_cents integer`);
      await pool.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS player_two_fee_cents integer`);
      await pool.query(`UPDATE teams SET player_one_fee_cents = amount_cents / 2 WHERE player_one_fee_cents IS NULL`);
      await pool.query(`UPDATE teams SET player_two_fee_cents = amount_cents / 2 WHERE player_two_fee_cents IS NULL`);
      await pool.query(`ALTER TABLE teams ALTER COLUMN player_one_fee_cents SET NOT NULL`);
      await pool.query(`ALTER TABLE teams ALTER COLUMN player_two_fee_cents SET NOT NULL`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS email_list_signups (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS playoff_seed_overrides (
          season_id text NOT NULL DEFAULT 'spring-2026',
          seed integer NOT NULL,
          team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (season_id, seed)
        )
      `);

      await pool.query(`ALTER TABLE playoff_seed_overrides ADD COLUMN IF NOT EXISTS season_id text`);
      await pool.query(`UPDATE playoff_seed_overrides SET season_id = 'spring-2026' WHERE season_id IS NULL`);
      await pool.query(`ALTER TABLE playoff_seed_overrides ALTER COLUMN season_id SET DEFAULT 'spring-2026'`);
      await pool.query(`ALTER TABLE playoff_seed_overrides ALTER COLUMN season_id SET NOT NULL`);
      await pool.query(`ALTER TABLE playoff_seed_overrides DROP CONSTRAINT IF EXISTS playoff_seed_overrides_pkey`);
      await pool.query(`ALTER TABLE playoff_seed_overrides ADD PRIMARY KEY (season_id, seed)`).catch((error: { code?: string }) => {
        if (error.code !== "42P16") throw error;
      });

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_playoff_seed_overrides_team_id
        ON playoff_seed_overrides (team_id)
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_email_list_signups_email_unique
        ON email_list_signups (lower(email))
      `);
    })();
  }

  await bootstrapPromise;
}

async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  await ensureBootstrap();
  const result = await pool.query<T>(text, values);
  return result.rows;
}

async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  await ensureBootstrap();
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
  season_id: string;
  team_name: string;
  player_one_name: string;
  player_one_email: string;
  player_one_dupr_id: string | null;
  player_two_name: string;
  player_two_email: string;
  player_two_dupr_id: string | null;
  password_hash: string;
  verification_status: unknown;
  payment_status: "pending" | "approved";
  amount_cents: number;
  player_one_type: "social" | "general";
  player_two_type: "social" | "general";
  player_one_fee_cents: number;
  player_two_fee_cents: number;
  is_waitlist: boolean;
  access_token: string | null;
  created_at: string;
  paid_at: string | null;
};

export type CreateTeamInput = {
  id: string;
  teamName: string;
  playerOneName: string;
  playerOneEmail: string;
  playerOneDuprId: string;
  playerOneType: "social" | "general";
  playerTwoName: string;
  playerTwoEmail: string;
  playerTwoDuprId: string;
  playerTwoType: "social" | "general";
  passwordHash: string;
  verificationStatus: string;
  amountCents?: number;
  playerOneFeeCents: number;
  playerTwoFeeCents: number;
  isWaitlist?: boolean;
  accessToken: string;
};

export async function createEmailListSignup(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  await query(
    `
      INSERT INTO email_list_signups (email, created_at)
      VALUES ($1, now())
      ON CONFLICT DO NOTHING
    `,
    [normalizedEmail]
  );
}

export type SlotRecord = {
  id: string;
  day_key: string;
  day_label: string;
  time_label: string;
  time_window_label: string;
  location_label: string;
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

export type LeagueGameResultRecord = {
  id: string;
  slot_id: string;
  week: number;
  match_date: string;
  home_team_id: string;
  away_team_id: string;
  winner_team_id: string | null;
  home_team_wins: number | null;
  away_team_wins: number | null;
  result_type: "standard" | "forfeit";
  forfeiting_team_id: string | null;
  created_at: string;
  updated_at: string;
};

type LeagueGameStoredRecord = {
  id: string;
  slot_id: string;
  day_label: string;
  time_label: string;
  week: number;
  match_date: string;
  date_label: string;
  location_label: string | null;
  home_team_id: string;
  home_team_name: string;
  away_team_id: string;
  away_team_name: string;
  created_at: string;
  updated_at: string;
};

export type LeagueGameSubmissionRecord = {
  id: string;
  slot_id: string;
  week: number;
  match_date: string;
  home_team_id: string;
  away_team_id: string;
  submitting_team_id: string;
  winner_team_id: string;
  home_team_wins: number;
  away_team_wins: number;
  result_type: "standard" | "forfeit";
  forfeiting_team_id: string | null;
  created_at: string;
  updated_at: string;
};

type GameNotificationEventRecord = {
  id: string;
  notification_type: string;
  slot_id: string;
  week: number;
  home_team_id: string;
  away_team_id: string;
  created_at: string;
};

export type LeagueGameRecord = LeagueGameWithResult & {
  id?: string;
  homeTeamWins: number | null;
  awayTeamWins: number | null;
  resultType: "standard" | "forfeit";
  forfeitingTeamId: string | null;
  submissions: LeagueGameSubmissionRecord[];
};

export type AdminTeamRow = TeamRecord & {
  active_slot_id: string | null;
  active_day_label: string | null;
  active_time_label: string | null;
  active_reservation_status: ReservationRecord["status"] | null;
};

export type PlayoffSeedOverrideRecord = {
  seed: number;
  team_id: string;
  created_at: string;
  updated_at: string;
};

export type PlayoffGameResultRecord = {
  matchup_id: PlayoffBracketMatchId;
  winner_team_id: string;
  created_at: string;
  updated_at: string;
};

type PasswordResetTokenRecord = {
  token_hash: string;
  team_id: string;
  email: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
};

function normalizeTeam(row: TeamRecord): TeamRecord {
  return {
    ...row,
    amount_cents: Number(row.amount_cents),
    player_one_fee_cents: Number(row.player_one_fee_cents),
    player_two_fee_cents: Number(row.player_two_fee_cents),
    is_waitlist: Boolean(row.is_waitlist)
  };
}

function hydrateReservation<T extends ReservationRecord>(reservation: T) {
  const slot = recurringSlots.find((entry) => entry.id === reservation.slot_id);

  return {
    ...reservation,
    day_label: slot?.dayLabel,
    time_label: slot?.timeWindowLabel,
    capacity: slot?.capacity
  };
}

export async function createAdminSession(tokenHash: string, expiresAt: Date) {
  await query(
    `
      INSERT INTO admin_sessions (token_hash, expires_at)
      VALUES ($1, $2)
      ON CONFLICT (token_hash)
      DO UPDATE SET expires_at = EXCLUDED.expires_at
    `,
    [tokenHash, expiresAt.toISOString()]
  );
}

export async function getAdminSession(tokenHash: string) {
  const rows = await query<{ token_hash: string; created_at: string; expires_at: string }>(
    `
      SELECT token_hash, created_at, expires_at
      FROM admin_sessions
      WHERE token_hash = $1
        AND expires_at > now()
      LIMIT 1
    `,
    [tokenHash]
  );

  return rows[0];
}

export async function deleteAdminSession(tokenHash: string) {
  await query("DELETE FROM admin_sessions WHERE token_hash = $1", [tokenHash]);
}

export async function purgeExpiredAdminSessions() {
  await query("DELETE FROM admin_sessions WHERE expires_at <= now()");
}

export async function recordAdminLoginFailure() {
  await query("INSERT INTO admin_login_attempts DEFAULT VALUES");
}

export async function clearRecentAdminLoginFailures() {
  await query("DELETE FROM admin_login_attempts");
}

export async function isAdminLoginRateLimited() {
  const rows = await query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM admin_login_attempts
      WHERE created_at > now() - interval '15 minutes'
    `
  );

  return Number(rows[0]?.count || 0) >= 5;
}

export async function createTeam(input: CreateTeamInput) {
  const rows = await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [ACTIVE_SEASON_ID]);
    const countResult = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM teams WHERE season_id = $1",
      [ACTIVE_SEASON_ID]
    );
    const isWaitlist = Boolean(input.isWaitlist) || Number(countResult.rows[0]?.count || 0) >= 24;
    const result = await client.query<TeamRecord>(
      `
      INSERT INTO teams (
        id,
        season_id,
        team_name,
        player_one_name,
        player_one_email,
        player_one_dupr_id,
        player_two_name,
        player_two_email,
        player_two_dupr_id,
        password_hash,
        verification_status,
        payment_status,
        amount_cents,
        player_one_type,
        player_two_type,
        player_one_fee_cents,
        player_two_fee_cents,
        is_waitlist,
        access_token,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, 'pending', $12, $13, $14, $15, $16, $17, $18, now()
      )
      RETURNING *
      `,
      [
        input.id,
        ACTIVE_SEASON_ID,
        input.teamName,
        input.playerOneName,
        input.playerOneEmail,
        input.playerOneDuprId,
        input.playerTwoName,
        input.playerTwoEmail,
        input.playerTwoDuprId,
        input.passwordHash,
        input.verificationStatus,
        input.amountCents ?? input.playerOneFeeCents + input.playerTwoFeeCents,
        input.playerOneType,
        input.playerTwoType,
        input.playerOneFeeCents,
        input.playerTwoFeeCents,
        isWaitlist,
        input.accessToken
      ]
    );
    return result.rows;
  });

  return rows[0] ? normalizeTeam(rows[0]) : undefined;
}

export async function getTeamById(id: string) {
  const rows = await query<TeamRecord>("SELECT * FROM teams WHERE id = $1 AND season_id = $2 LIMIT 1", [id, ACTIVE_SEASON_ID]);
  return rows[0] ? normalizeTeam(rows[0]) : undefined;
}

export async function getTeamByName(teamName: string) {
  const rows = await query<TeamRecord>(
    "SELECT * FROM teams WHERE lower(team_name) = lower($1) AND season_id = $2 LIMIT 1",
    [teamName, ACTIVE_SEASON_ID]
  );
  return rows[0] ? normalizeTeam(rows[0]) : undefined;
}

export async function getTeamByAccessToken(accessToken: string) {
  const rows = await query<TeamRecord>(
    "SELECT * FROM teams WHERE access_token = $1 AND season_id = $2 LIMIT 1",
    [accessToken, ACTIVE_SEASON_ID]
  );
  return rows[0] ? normalizeTeam(rows[0]) : undefined;
}

export async function getTeamByMemberEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await query<TeamRecord>(
    `
      SELECT *
      FROM teams
      WHERE (lower(player_one_email) = lower($1)
         OR lower(player_two_email) = lower($1))
        AND season_id = $2
      LIMIT 1
    `,
    [normalizedEmail, ACTIVE_SEASON_ID]
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
      WHERE season_id = $4 AND (
        team_name = $1
        OR player_one_email IN ($2, $3)
        OR player_two_email IN ($2, $3)
        OR player_one_email = $3
        OR player_two_email = $2
      )
      LIMIT 1
    `,
    [input.teamName, input.playerOneEmail, input.playerTwoEmail, ACTIVE_SEASON_ID]
  );

  return rows[0] ? normalizeTeam(rows[0]) : undefined;
}

export async function listTeams() {
  const rows = await query<TeamRecord>("SELECT * FROM teams WHERE season_id = $1 ORDER BY created_at DESC", [ACTIVE_SEASON_ID]);
  return rows.map(normalizeTeam);
}

export async function listTeamsWithReservations() {
  const teams = await listTeams();
  const reservations = await query<ReservationRecord>(
    `
      SELECT *
      FROM reservations
      WHERE status IN ('pending', 'approved')
        AND team_id IN (SELECT id FROM teams WHERE season_id = $1)
      ORDER BY
        CASE status
          WHEN 'pending' THEN 0
          ELSE 1
        END,
        updated_at DESC
    `,
    [ACTIVE_SEASON_ID]
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
      active_time_label: slot?.timeWindowLabel ?? null,
      active_reservation_status: reservation?.status ?? null
    } satisfies AdminTeamRow;
  });
}

export async function listPlayoffSeedOverrides() {
  return query<PlayoffSeedOverrideRecord>(
    `
      SELECT seed, team_id, created_at, updated_at
      FROM playoff_seed_overrides
      WHERE season_id = $1
      ORDER BY seed ASC
    `,
    [ACTIVE_SEASON_ID]
  );
}

export async function savePlayoffSeedOverrides(overrides: Array<{ seed: number; teamId: string }>) {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM playoff_seed_overrides WHERE season_id = $1", [ACTIVE_SEASON_ID]);

    for (const override of overrides) {
      await client.query(
        `
          INSERT INTO playoff_seed_overrides (season_id, seed, team_id, created_at, updated_at)
          VALUES ($1, $2, $3, now(), now())
        `,
        [ACTIVE_SEASON_ID, override.seed, override.teamId]
      );
    }
  });
}

export async function listPlayoffGameResults() {
  return query<PlayoffGameResultRecord>(
    `
      SELECT substring(matchup_id from length($1) + 2) AS matchup_id, winner_team_id, created_at, updated_at
      FROM playoff_game_results
      WHERE matchup_id LIKE $2
      ORDER BY created_at ASC
    `,
    [ACTIVE_SEASON_ID, `${ACTIVE_SEASON_ID}:%`]
  );
}

export async function savePlayoffGameResult(input: {
  matchupId: PlayoffBracketMatchId;
  winnerTeamId: string | null;
}) {
  if (!input.winnerTeamId) {
    await query("DELETE FROM playoff_game_results WHERE matchup_id = $1", [`${ACTIVE_SEASON_ID}:${input.matchupId}`]);
    return;
  }

  await query(
    `
      INSERT INTO playoff_game_results (matchup_id, winner_team_id, created_at, updated_at)
      VALUES ($1, $2, now(), now())
      ON CONFLICT (matchup_id)
      DO UPDATE SET
        winner_team_id = EXCLUDED.winner_team_id,
        updated_at = now()
    `,
    [`${ACTIVE_SEASON_ID}:${input.matchupId}`, input.winnerTeamId]
  );
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

export async function setTeamWaitlistStatus(teamId: string, isWaitlist: boolean) {
  await withTransaction(async (client) => {
    await client.query(
      `
        UPDATE teams
        SET is_waitlist = $2,
            payment_status = CASE WHEN $2 THEN 'pending' ELSE payment_status END,
            paid_at = CASE WHEN $2 THEN NULL ELSE paid_at END
        WHERE id = $1
      `,
      [teamId, isWaitlist]
    );

    if (isWaitlist) {
      await client.query(
        `
          UPDATE reservations
          SET status = 'cancelled',
              updated_at = now()
          WHERE team_id = $1
            AND status IN ('pending', 'approved')
        `,
        [teamId]
      );
    }
  });
}

export async function createPasswordReset(input: {
  tokenHash: string;
  teamId: string;
  email: string;
  expiresAt: Date;
}) {
  await query("DELETE FROM password_reset_tokens WHERE team_id = $1 OR email = $2", [
    input.teamId,
    input.email.toLowerCase()
  ]);

  await query(
    `
      INSERT INTO password_reset_tokens (
        token_hash,
        team_id,
        email,
        expires_at
      ) VALUES ($1, $2, $3, $4)
    `,
    [input.tokenHash, input.teamId, input.email.toLowerCase(), input.expiresAt.toISOString()]
  );
}

export async function getValidPasswordReset(tokenHash: string) {
  const rows = await query<
    PasswordResetTokenRecord & {
      team_name: string;
    }
  >(
    `
      SELECT prt.*, t.team_name
      FROM password_reset_tokens prt
      JOIN teams t ON t.id = prt.team_id
      WHERE prt.token_hash = $1
        AND prt.used_at IS NULL
        AND prt.expires_at > now()
      LIMIT 1
    `,
    [tokenHash]
  );

  return rows[0];
}

export async function markPasswordResetUsed(tokenHash: string) {
  await query(
    `
      UPDATE password_reset_tokens
      SET used_at = now()
      WHERE token_hash = $1
    `,
    [tokenHash]
  );
}

export async function updateTeamPassword(teamId: string, passwordHash: string) {
  await query(
    `
      UPDATE teams
      SET password_hash = $2
      WHERE id = $1
    `,
    [teamId, passwordHash]
  );
}

export async function createTeamByAdmin(input: {
  id: string;
  teamName: string;
  playerOneName: string;
  playerOneEmail: string;
  playerOneDuprId: string;
  playerTwoName: string;
  playerTwoEmail: string;
  playerTwoDuprId: string;
  playerOneType: PlayerType;
  playerTwoType: PlayerType;
  passwordHash: string;
  paymentStatus: TeamRecord["payment_status"];
  amountCents?: number;
  accessToken: string;
}) {
  await query(
    `
      INSERT INTO teams (
        id,
        season_id,
        team_name,
        player_one_name,
        player_one_email,
        player_one_dupr_id,
        player_two_name,
        player_two_email,
        player_two_dupr_id,
        password_hash,
        verification_status,
        payment_status,
        amount_cents,
        player_one_type,
        player_two_type,
        player_one_fee_cents,
        player_two_fee_cents,
        access_token,
        created_at,
        paid_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '[]'::jsonb, $11, $12, $13, $14, $15, $16, $17, now(),
        CASE WHEN $11 = 'approved' THEN now() ELSE NULL END
      )
    `,
    [
      input.id,
      ACTIVE_SEASON_ID,
      input.teamName,
      input.playerOneName,
      input.playerOneEmail,
      input.playerOneDuprId,
      input.playerTwoName,
      input.playerTwoEmail,
      input.playerTwoDuprId,
      input.passwordHash,
      input.paymentStatus,
      input.amountCents ?? getPlayerFeeCents(input.playerOneType) + getPlayerFeeCents(input.playerTwoType),
      input.playerOneType,
      input.playerTwoType,
      getPlayerFeeCents(input.playerOneType),
      getPlayerFeeCents(input.playerTwoType),
      input.accessToken
    ]
  );
}

export async function updateTeamByAdmin(input: {
  teamId: string;
  teamName: string;
  playerOneName: string;
  playerOneEmail: string;
  playerOneDuprId?: string;
  playerOneType: PlayerType;
  playerTwoName: string;
  playerTwoEmail: string;
  playerTwoDuprId?: string;
  playerTwoType: PlayerType;
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
        player_one_type = $5,
        player_two_name = $6,
        player_two_email = $7,
        player_two_type = $8,
        password_hash = $9,
        payment_status = $10,
        amount_cents = $11,
        player_one_fee_cents = $12,
        player_two_fee_cents = $13,
        player_one_dupr_id = COALESCE($14, player_one_dupr_id),
        player_two_dupr_id = COALESCE($15, player_two_dupr_id),
        paid_at = CASE
          WHEN $10 = 'approved' THEN COALESCE(paid_at, now())
          ELSE NULL
        END
      WHERE id = $1
    `,
    [
      input.teamId,
      input.teamName,
      input.playerOneName,
      input.playerOneEmail,
      input.playerOneType,
      input.playerTwoName,
      input.playerTwoEmail,
      input.playerTwoType,
      input.passwordHash || currentTeam.password_hash,
      input.paymentStatus,
      getPlayerFeeCents(input.playerOneType, new Date(currentTeam.created_at)) +
        getPlayerFeeCents(input.playerTwoType, new Date(currentTeam.created_at)),
      getPlayerFeeCents(input.playerOneType, new Date(currentTeam.created_at)),
      getPlayerFeeCents(input.playerTwoType, new Date(currentTeam.created_at)),
      input.playerOneDuprId ?? null,
      input.playerTwoDuprId ?? null
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
        AND t.season_id = $2
      ORDER BY t.team_name ASC
    `,
    [slotId, ACTIVE_SEASON_ID]
  );
}

async function listApprovedSlotTeamsDetailed(slotId: string) {
  return query<{ id: string; team_name: string }>(
    `
      SELECT t.id, t.team_name
      FROM reservations r
      JOIN teams t ON t.id = r.team_id
      WHERE r.slot_id = $1
        AND r.status = 'approved'
        AND t.season_id = $2
      ORDER BY t.team_name ASC
    `,
    [slotId, ACTIVE_SEASON_ID]
  );
}

async function listGameResults() {
  return query<LeagueGameResultRecord>(
    `
      SELECT *
      FROM game_results
      WHERE home_team_id IN (SELECT id FROM teams WHERE season_id = $1)
      ORDER BY slot_id ASC, week ASC, match_date ASC
    `,
    [ACTIVE_SEASON_ID]
  );
}

async function listGameResultSubmissions() {
  return query<LeagueGameSubmissionRecord>(
    `
      SELECT *
      FROM game_result_submissions
      WHERE home_team_id IN (SELECT id FROM teams WHERE season_id = $1)
      ORDER BY slot_id ASC, week ASC, updated_at DESC
    `,
    [ACTIVE_SEASON_ID]
  );
}

async function listStoredLeagueGames() {
  return query<LeagueGameStoredRecord>(
    `
      SELECT
        g.id,
        g.slot_id,
        g.day_label,
        g.time_label,
        g.week,
        g.match_date::text,
        g.date_label,
        g.location_label,
        g.home_team_id,
        home.team_name AS home_team_name,
        g.away_team_id,
        away.team_name AS away_team_name,
        g.created_at,
        g.updated_at
      FROM league_games g
      JOIN teams home ON home.id = g.home_team_id
      JOIN teams away ON away.id = g.away_team_id
      WHERE home.season_id = $1 AND away.season_id = $1
      ORDER BY g.match_date ASC, g.time_label ASC, g.slot_id ASC, g.week ASC, home.team_name ASC
    `,
    [ACTIVE_SEASON_ID]
  );
}

async function syncLeagueGames() {
  const slotGames = await Promise.all(
    recurringSlots.map(async (slot) => {
      const teams = (await listApprovedSlotTeamsDetailed(slot.id)).map(
        (team) =>
          ({
            id: team.id,
            teamName: team.team_name
          }) satisfies SlotTeam
      );

      return generateSlotSchedule(slot.id, teams);
    })
  );

  const generatedGames = slotGames.flat();

  await withTransaction(async (client) => {
    await client.query(
      "DELETE FROM league_games WHERE home_team_id IN (SELECT id FROM teams WHERE season_id = $1)",
      [ACTIVE_SEASON_ID]
    );

    for (const game of generatedGames) {
      await client.query(
        `
          INSERT INTO league_games (
            slot_id,
            day_label,
            time_label,
            week,
            match_date,
            date_label,
            location_label,
            home_team_id,
            away_team_id,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
        `,
        [
          game.slotId,
          game.dayLabel,
          game.timeLabel,
          game.week,
          game.matchDate,
          game.dateLabel,
          game.locationLabel,
          game.homeTeamId,
          game.awayTeamId
        ]
      );
    }
  });
}

function resolveLeagueGameResult(
  scheduledGame: GeneratedLeagueGame,
  adminResult: LeagueGameResultRecord | undefined,
  submissions: LeagueGameSubmissionRecord[]
) {
  if (adminResult?.winner_team_id) {
    return {
      winnerTeamId: adminResult.winner_team_id,
      homeTeamWins: adminResult.home_team_wins,
      awayTeamWins: adminResult.away_team_wins,
      resultType: adminResult.result_type,
      forfeitingTeamId: adminResult.forfeiting_team_id
    };
  }

  if (submissions.length < 2) {
    return {
      winnerTeamId: null,
      homeTeamWins: null,
      awayTeamWins: null,
      resultType: "standard" as const,
      forfeitingTeamId: null
    };
  }

  const [firstSubmission, ...otherSubmissions] = submissions;
  const isAgreement = otherSubmissions.every(
    (submission) =>
      submission.winner_team_id === firstSubmission.winner_team_id &&
      submission.home_team_wins === firstSubmission.home_team_wins &&
      submission.away_team_wins === firstSubmission.away_team_wins &&
      submission.result_type === firstSubmission.result_type &&
      submission.forfeiting_team_id === firstSubmission.forfeiting_team_id
  );

  if (!isAgreement) {
    return {
      winnerTeamId: null,
      homeTeamWins: null,
      awayTeamWins: null,
      resultType: "standard" as const,
      forfeitingTeamId: null
    };
  }

  return {
    winnerTeamId: firstSubmission.winner_team_id,
    homeTeamWins: firstSubmission.home_team_wins,
    awayTeamWins: firstSubmission.away_team_wins,
    resultType: firstSubmission.result_type,
    forfeitingTeamId: firstSubmission.forfeiting_team_id
  };
}

export async function listSlots() {
  const counts = await query<{ slot_id: string; count: string }>(
    `
      SELECT slot_id, COUNT(*)::text AS count
      FROM reservations
      WHERE status = 'approved'
        AND team_id IN (SELECT id FROM teams WHERE season_id = $1)
      GROUP BY slot_id
    `,
    [ACTIVE_SEASON_ID]
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
      time_window_label: slot.timeWindowLabel,
      location_label: slot.locationLabel,
      sort_order: slot.sortOrder,
      capacity: slot.capacity,
      reserved_count: reservedCount,
      available_spots: availableSpots,
      is_full: availableSpots <= 0 ? 1 : 0,
      teams: teamMap.get(slot.id) || []
    } satisfies SlotRecord;
  });
}

export async function listLeagueGames() {
  await syncLeagueGames();

  const scheduledGames = await listStoredLeagueGames();
  const results = await listGameResults();
  const submissions = await listGameResultSubmissions();
  const resultMap = new Map(
    results.map((result) => [
      `${result.slot_id}:${result.week}:${result.home_team_id}:${result.away_team_id}`,
      result
    ])
  );
  const submissionMap = new Map<string, LeagueGameSubmissionRecord[]>();

  for (const submission of submissions) {
    const key = `${submission.slot_id}:${submission.week}:${submission.home_team_id}:${submission.away_team_id}`;
    const current = submissionMap.get(key) || [];
    current.push(submission);
    submissionMap.set(key, current);
  }

  return scheduledGames
    .map((game) => {
      const scheduledGame = {
        slotId: game.slot_id,
        dayLabel: game.day_label,
        timeLabel: game.time_label,
        week: Number(game.week),
        matchDate: game.match_date,
        dateLabel: game.date_label,
        locationLabel: game.location_label,
        homeTeamId: game.home_team_id,
        homeTeamName: game.home_team_name,
        awayTeamId: game.away_team_id,
        awayTeamName: game.away_team_name
      } satisfies GeneratedLeagueGame;
      const key = `${scheduledGame.slotId}:${scheduledGame.week}:${scheduledGame.homeTeamId}:${scheduledGame.awayTeamId}`;
      const result = resultMap.get(key);
      const gameSubmissions = submissionMap.get(key) || [];
      const resolvedResult = resolveLeagueGameResult(scheduledGame, result, gameSubmissions);

      return {
        ...scheduledGame,
        id: result?.id,
        winnerTeamId: resolvedResult.winnerTeamId,
        homeTeamWins: resolvedResult.homeTeamWins,
        awayTeamWins: resolvedResult.awayTeamWins,
        resultType: resolvedResult.resultType,
        forfeitingTeamId: resolvedResult.forfeitingTeamId,
        submissions: gameSubmissions
      } satisfies LeagueGameRecord;
    })
    .sort((left, right) => {
      const leftOrder = recurringSlots.find((slot) => slot.id === left.slotId)?.sortOrder ?? 0;
      const rightOrder = recurringSlots.find((slot) => slot.id === right.slotId)?.sortOrder ?? 0;

      return left.week - right.week || leftOrder - rightOrder || left.homeTeamName.localeCompare(right.homeTeamName);
    });
}

export async function listLeagueGamesForTeam(teamId: string) {
  const games = await listLeagueGames();
  return games.filter((game) => game.homeTeamId === teamId || game.awayTeamId === teamId);
}

export async function listLeagueStandings() {
  const games = await listLeagueGames();
  return buildStandingsFromGames(games) satisfies SlotStandings[];
}

export async function saveLeagueGameResult(input: {
  slotId: string;
  week: number;
  matchDate: string;
  homeTeamId: string;
  awayTeamId: string;
  winnerTeamId: string | null;
  homeTeamWins?: number | null;
  awayTeamWins?: number | null;
  resultType?: "standard" | "forfeit";
  forfeitingTeamId?: string | null;
}) {
  if (!input.winnerTeamId) {
    await query(
      `
        DELETE FROM game_results
        WHERE slot_id = $1
          AND week = $2
          AND home_team_id = $3
          AND away_team_id = $4
      `,
      [input.slotId, input.week, input.homeTeamId, input.awayTeamId]
    );
    return;
  }

  if (input.winnerTeamId !== input.homeTeamId && input.winnerTeamId !== input.awayTeamId) {
    throw new Error("Winner must be one of the scheduled teams.");
  }

  await query(
    `
      INSERT INTO game_results (
        slot_id,
        week,
        match_date,
        home_team_id,
        away_team_id,
        winner_team_id,
        home_team_wins,
        away_team_wins,
        result_type,
        forfeiting_team_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
      ON CONFLICT (slot_id, week, home_team_id, away_team_id)
      DO UPDATE SET
        winner_team_id = EXCLUDED.winner_team_id,
        home_team_wins = EXCLUDED.home_team_wins,
        away_team_wins = EXCLUDED.away_team_wins,
        result_type = EXCLUDED.result_type,
        forfeiting_team_id = EXCLUDED.forfeiting_team_id,
        match_date = EXCLUDED.match_date,
        updated_at = now()
    `,
    [
      input.slotId,
      input.week,
      input.matchDate,
      input.homeTeamId,
      input.awayTeamId,
      input.winnerTeamId,
      input.homeTeamWins ?? null,
      input.awayTeamWins ?? null,
      input.resultType ?? "standard",
      input.forfeitingTeamId ?? null
    ]
  );
}

export async function submitLeagueGameResult(input: {
  slotId: string;
  week: number;
  matchDate: string;
  homeTeamId: string;
  awayTeamId: string;
  submittingTeamId: string;
  winnerTeamId: string;
  homeTeamWins: number;
  awayTeamWins: number;
  resultType?: "standard" | "forfeit";
  forfeitingTeamId?: string | null;
}) {
  await query(
    `
      INSERT INTO game_result_submissions (
        slot_id,
        week,
        match_date,
        home_team_id,
        away_team_id,
        submitting_team_id,
        winner_team_id,
        home_team_wins,
        away_team_wins,
        result_type,
        forfeiting_team_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now())
      ON CONFLICT (slot_id, week, home_team_id, away_team_id, submitting_team_id)
      DO UPDATE SET
        winner_team_id = EXCLUDED.winner_team_id,
        home_team_wins = EXCLUDED.home_team_wins,
        away_team_wins = EXCLUDED.away_team_wins,
        result_type = EXCLUDED.result_type,
        forfeiting_team_id = EXCLUDED.forfeiting_team_id,
        match_date = EXCLUDED.match_date,
        updated_at = now()
    `,
    [
      input.slotId,
      input.week,
      input.matchDate,
      input.homeTeamId,
      input.awayTeamId,
      input.submittingTeamId,
      input.winnerTeamId,
      input.homeTeamWins,
      input.awayTeamWins,
      input.resultType ?? "standard",
      input.forfeitingTeamId ?? null
    ]
  );
}

export async function getGameNotificationEvent(input: {
  notificationType: string;
  slotId: string;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
}) {
  const rows = await query<GameNotificationEventRecord>(
    `
      SELECT *
      FROM game_notification_events
      WHERE notification_type = $1
        AND slot_id = $2
        AND week = $3
        AND home_team_id = $4
        AND away_team_id = $5
      LIMIT 1
    `,
    [input.notificationType, input.slotId, input.week, input.homeTeamId, input.awayTeamId]
  );

  return rows[0];
}

export async function createGameNotificationEvent(input: {
  notificationType: string;
  slotId: string;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
}) {
  await query(
    `
      INSERT INTO game_notification_events (
        notification_type,
        slot_id,
        week,
        home_team_id,
        away_team_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, now())
      ON CONFLICT (notification_type, slot_id, week, home_team_id, away_team_id)
      DO NOTHING
    `,
    [input.notificationType, input.slotId, input.week, input.homeTeamId, input.awayTeamId]
  );
}

export function getSlotById(slotId: string) {
  return recurringSlots.find((slot) => slot.id === slotId);
}

export async function getReservationById(id: string) {
  const rows = await query<ReservationRecord>(
    "SELECT * FROM reservations WHERE id = $1 AND team_id IN (SELECT id FROM teams WHERE season_id = $2) LIMIT 1",
    [id, ACTIVE_SEASON_ID]
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
        AND team_id IN (SELECT id FROM teams WHERE season_id = $1)
    `,
    [ACTIVE_SEASON_ID]
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

  if (team.is_waitlist) {
    throw new Error("Your team is currently on the waitlist. We will reach out if spots open.");
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
        AND team_id IN (SELECT id FROM teams WHERE season_id = $2)
    `,
    [input.slotId, ACTIVE_SEASON_ID]
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

  if (team.is_waitlist) {
    throw new Error("Waitlisted teams cannot hold a slot.");
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
        AND team_id IN (SELECT id FROM teams WHERE season_id = $3)
    `,
    [slotId, teamId, ACTIVE_SEASON_ID]
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
      WHERE t.season_id = $1
      ORDER BY
        CASE r.status
          WHEN 'pending' THEN 0
          WHEN 'approved' THEN 1
          ELSE 2
        END,
        r.updated_at DESC
    `,
    [ACTIVE_SEASON_ID]
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
        AND team_id IN (SELECT id FROM teams WHERE season_id = $3)
    `,
    [reservation.slot_id, reservationId, ACTIVE_SEASON_ID]
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
