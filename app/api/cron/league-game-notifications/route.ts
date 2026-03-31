import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { processLeagueGameNotifications } from "@/lib/league-game-notifications";

export async function GET(request: Request) {
  if (env.cronSecret) {
    const authorization = request.headers.get("authorization");

    if (authorization !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const summary = await processLeagueGameNotifications();
  return NextResponse.json(summary);
}

