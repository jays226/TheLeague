import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth";
import { getTeamByName } from "@/lib/db";
import { leagueCookieName } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const rawData = await request.json();
    const data = loginSchema.parse(rawData);
    const team = getTeamByName(data.teamName);

    if (!team || !verifyPassword(data.password, team.password_hash)) {
      return NextResponse.json({ error: "Invalid team name or password." }, { status: 401 });
    }

    const response = NextResponse.json({ redirectUrl: "/app" });
    response.cookies.set(leagueCookieName, team.access_token ?? "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
