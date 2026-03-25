import { NextResponse } from "next/server";

import { createPasswordReset, getTeamByMemberEmail } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email-notifications";
import { createPasswordResetToken, hashPasswordResetToken } from "@/lib/session";
import { forgotPasswordSchema } from "@/lib/validation";

const successMessage =
  "If that email matches a registered team, a password reset link has been sent.";

export async function POST(request: Request) {
  try {
    const rawData = await request.json();
    const data = forgotPasswordSchema.parse(rawData);
    const normalizedEmail = data.email.trim().toLowerCase();
    const team = await getTeamByMemberEmail(normalizedEmail);

    if (team) {
      const token = createPasswordResetToken();
      const tokenHash = hashPasswordResetToken(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const resetUrl = `${appUrl}/reset-password?token=${token}`;

      await createPasswordReset({
        tokenHash,
        teamId: team.id,
        email: normalizedEmail,
        expiresAt
      });

      await sendPasswordResetEmail({
        team,
        recipientEmail: normalizedEmail,
        resetUrl
      });
    }

    return NextResponse.json({ message: successMessage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
