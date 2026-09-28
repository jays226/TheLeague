import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { hashPassword } from "@/lib/auth";
import { createTeam, listTeams } from "@/lib/db";
import { sendAdminSignupAlert, sendWelcomeRegistrationEmail } from "@/lib/email-notifications";
import { verifyEmails } from "@/lib/email-verification";
import { ensureNoExistingTeam } from "@/lib/registration";
import { createAccessToken, createId, leagueCookieName } from "@/lib/session";
import { signupSchema } from "@/lib/validation";
import { getPlayerFeeCents, isSocialDiscountActive } from "@/lib/pricing";

export async function POST(request: Request) {
  try {
    const rawData = await request.json();
    const data = signupSchema.parse(rawData);
    await ensureNoExistingTeam(data);
    if (isSocialDiscountActive() && data.playerOneType !== "social" && data.playerTwoType !== "social") {
      return NextResponse.json(
        { error: "At least one team member must be designated as a Social Team player through October 4." },
        { status: 400 }
      );
    }

    const registeredTeams = await listTeams();
    const isWaitlist = registeredTeams.length >= 24;
    const playerOneFeeCents = getPlayerFeeCents(data.playerOneType);
    const playerTwoFeeCents = getPlayerFeeCents(data.playerTwoType);

    const verification = await verifyEmails([data.playerOneEmail, data.playerTwoEmail]);

    if (!verification.ok) {
      return NextResponse.json(
        {
          error: "At least one UVA email could not be verified as deliverable."
        },
        { status: 400 }
      );
    }

    const team = await createTeam({
      id: createId(),
      teamName: data.teamName.trim(),
      playerOneName: data.playerOneName.trim(),
      playerOneEmail: data.playerOneEmail.toLowerCase(),
      playerOneType: data.playerOneType,
      playerTwoName: data.playerTwoName.trim(),
      playerTwoEmail: data.playerTwoEmail.toLowerCase(),
      playerTwoType: data.playerTwoType,
      passwordHash: hashPassword(data.password),
      verificationStatus: JSON.stringify(verification.results),
      amountCents: playerOneFeeCents + playerTwoFeeCents,
      playerOneFeeCents,
      playerTwoFeeCents,
      isWaitlist,
      accessToken: createAccessToken()
    });

    if (!team) {
      throw new Error("Unable to create your team.");
    }

    try {
      await sendWelcomeRegistrationEmail(team);
    } catch (error) {
      console.error("Welcome registration email failed", error);
    }

    try {
      await sendAdminSignupAlert(team);
    } catch (error) {
      console.error("Admin signup alert failed", error);
    }

    const response = NextResponse.json({ redirectUrl: "/app" });
    response.cookies.set(leagueCookieName, team?.access_token ?? "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      const flattened = error.flatten();

      return NextResponse.json(
        {
          error: "Please fix the highlighted fields and try again.",
          fieldErrors: flattened.fieldErrors
        },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
