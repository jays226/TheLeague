import "server-only";

import type { TeamRecord } from "@/lib/db";
import { env } from "@/lib/env";

async function getTransporter() {
  if (!env.smtpHost || !env.smtpPort || !env.smtpUser || !env.smtpPass || !env.smtpFrom) {
    return null;
  }

  const nodemailer = await import("nodemailer");

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: Number(env.smtpPort),
    secure: Number(env.smtpPort) === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });
}

export async function sendPaymentApprovedEmail(team: TeamRecord) {
  const transporter = await getTransporter();

  if (!transporter) {
    console.warn("Payment approval email skipped: SMTP env vars are not configured.");
    return;
  }

  const recipients = [team.player_one_email, team.player_two_email];
  const subject = `The League payment approved for ${team.team_name}`;
  const dashboardUrl = `${env.appUrl}/login`;

  await transporter.sendMail({
    from: env.smtpFrom,
    to: recipients.join(", "),
    subject,
    text: [
      `Your team payment for ${team.team_name} has been approved.`,
      "",
      "You can now log in and sign up for a weekly slot:",
      dashboardUrl,
      "",
      "If you already have a slot, future switches will require admin approval.",
      "",
      "The League"
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #173525;">
        <h2 style="margin-bottom: 12px;">Payment approved</h2>
        <p>Your team payment for <strong>${team.team_name}</strong> has been approved.</p>
        <p>You can now log in and sign up for a weekly slot.</p>
        <p>
          <a href="${dashboardUrl}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#1d6042;color:#f7f2e9;text-decoration:none;font-weight:600;">
            Open team dashboard
          </a>
        </p>
        <p>If you already have a slot, future switches will require admin approval.</p>
        <p style="margin-top: 20px;">The League</p>
      </div>
    `
  });
}
