import "server-only";

import type { TeamRecord } from "@/lib/db";
import { env } from "@/lib/env";

async function getTransporter() {
  if (!env.smtpHost || !env.smtpPort || !env.smtpUser || !env.smtpPass || !env.smtpFrom) {
    return null;
  }

  const { default: nodemailer } = await import("nodemailer");

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

export async function sendWelcomeRegistrationEmail(team: TeamRecord) {
  const transporter = await getTransporter();

  if (!transporter) {
    console.warn("Welcome email skipped: SMTP env vars are not configured.");
    return;
  }

  const recipients = [team.player_one_email, team.player_two_email];
  const subject = "Welcome to the League!";
  const venmoLink = env.venmoLink || "https://venmo.com/u/theleague_uva";

  await transporter.sendMail({
    from: env.smtpFrom,
    to: recipients.join(", "),
    subject,
    text: [
      `Welcome to The League, ${team.team_name}!`,
      "",
      "Your team has been registered successfully for The League.",
      "",
      "To gain access to sign up for a time slot, send the team fee of $40 total.",
      "",
      `Pay @theleague_uva here: ${venmoLink}`,
      "",
      "Reply to this email with any questions!",
      "",
      "The League"
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #173525; max-width: 640px; margin: 0 auto;">
        <div style="border: 1px solid rgba(29,96,66,0.12); border-radius: 18px; overflow: hidden; background: #ffffff;">
          <div style="padding: 24px 24px 12px; background: linear-gradient(180deg, #eef3ee 0%, #ffffff 100%);">
            <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #4d6a5c; font-weight: 700;">
              The League
            </p>
            <h2 style="margin: 0; font-size: 28px; line-height: 1.15; color: #173525;">
              Welcome to the League!
            </h2>
          </div>
          <div style="padding: 8px 24px 24px;">
            <p>Your team <strong>${team.team_name}</strong> is officially registered for The League.</p>
            <p>To gain access to sign up for a time slot, send the team fee of <strong>$40 total</strong>.</p>
            <p>
              <strong>Pay <a href="${venmoLink}" style="color: #1d6042; text-decoration: none;">@theleague_uva</a></strong>
              <br />
              <span style="color: #5a6d62;">${venmoLink}</span>
            </p>
            <p>Reply to this email with any questions!</p>
            <p style="margin-top: 24px;">The League</p>
          </div>
        </div>
      </div>
    `
  });
}
