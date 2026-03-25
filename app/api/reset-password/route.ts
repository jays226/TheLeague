import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth";
import { getValidPasswordReset, markPasswordResetUsed, updateTeamPassword } from "@/lib/db";
import { hashPasswordResetToken } from "@/lib/session";
import { resetPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const rawData = await request.json();
    const data = resetPasswordSchema.parse(rawData);
    const tokenHash = hashPasswordResetToken(data.token);
    const resetRecord = await getValidPasswordReset(tokenHash);

    if (!resetRecord) {
      return NextResponse.json(
        { error: "This password reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    await updateTeamPassword(resetRecord.team_id, hashPassword(data.password));
    await markPasswordResetUsed(tokenHash);

    return NextResponse.json({ redirectUrl: "/login" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
