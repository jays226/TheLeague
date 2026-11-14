import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAdminSession, purgeExpiredAdminSessions } from "@/lib/db";
import { env } from "@/lib/env";
import { getPlayoffAdminData } from "@/lib/playoff-admin-data";
import { adminCookieName, hashAdminSessionToken } from "@/lib/session";

function csvCell(value: string | number) {
  const raw = String(value);
  const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET() {
  const token = (await cookies()).get(adminCookieName)?.value;
  await purgeExpiredAdminSessions();
  if (!env.adminPortalPassword || !token || !(await getAdminSession(hashAdminSessionToken(token)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getPlayoffAdminData();
  const rows: Array<Array<string | number>> = [["Player Name", "Email", "Team", "Time Slot", "Playoff Seed", "Qualification Type"]];
  const seenEmails = new Set<string>();
  for (const seed of data.previewSeeds) {
    const team = data.teamById.get(seed.teamId);
    if (!team) continue;
    const qualificationType = seed.qualificationType === "wild_card" ? "Wild Card" : "Automatic Qualifier";
    for (const player of [
      { name: team.player_one_name, email: team.player_one_email },
      { name: team.player_two_name, email: team.player_two_email }
    ]) {
      const normalizedEmail = player.email.trim().toLowerCase();
      if (normalizedEmail && seenEmails.has(normalizedEmail)) continue;
      if (normalizedEmail) seenEmails.add(normalizedEmail);
      rows.push([player.name, player.email, team.team_name, seed.slotLabel, seed.seed, qualificationType]);
    }
  }

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="the-league-playoff-roster.csv"',
      "Cache-Control": "private, no-store"
    }
  });
}
