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
  const subject = `${team.team_name}, your League entry is confirmed`;
  const dashboardUrl = `${env.appUrl}/login`;

  await transporter.sendMail({
    from: env.smtpFrom,
    to: recipients.join(", "),
    subject,
    text: [
      "You're all set!",
      "",
      `Thanks for your payment. Your team ${team.team_name} is now officially entered in The League.`,
      "",
      "You can now log in to your team dashboard to sign up for your weekly match time:",
      "",
      dashboardUrl,
      "",
      "Game locations, court assignments, and instructions for accessing your full schedule will be sent out on Sunday, March 22nd.",
      "",
      "You can log in to your dashboard anytime to view updates, and we'll also send important announcements to this email.",
      "",
      "If you already selected a time slot, note that future changes may require admin approval.",
      "",
      "Thanks for joining The League - we're excited to have you on the courts soon.",
      "",
      "The League"
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #173525;">
        <h2 style="margin-bottom: 12px;">You're all set!</h2>
        <p>
          Thanks for your payment. Your team <strong>${team.team_name}</strong> is now officially entered in <strong>The League</strong>.
        </p>
        <p>
          You can now log in to your team dashboard to sign up for your weekly match time.
        </p>
        <p>
          <a href="${dashboardUrl}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#1d6042;color:#f7f2e9;text-decoration:none;font-weight:600;">
            Open team dashboard
          </a>
        </p>
        <p>
          Game locations, court assignments, and instructions for accessing your full schedule will be sent out on <strong>Sunday, March 22nd</strong>.
        </p>
        <p>
          You can log in to your dashboard anytime to view updates, and we’ll also send important announcements to this email.
        </p>
        <p>
          If you already selected a time slot, note that future changes may require admin approval.
        </p>
        <p style="margin-top: 20px;">
          Thanks for joining The League — we’re excited to have you on the courts soon.
        </p>
        <p style="font-weight: 600;">The League</p>
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
  const subject = `${team.team_name}, one more step to enter The League`;
  const venmoLink = env.venmoLink || "https://venmo.com/u/theleague_uva";

  await transporter.sendMail({
    from: env.smtpFrom,
    to: recipients.join(", "),
    subject,
    text: [
      `Hi ${team.team_name},`,
      "",
      "Thanks for registering for The League! Your team has been successfully created.",
      "",
      "There's just one final step to complete your entry.",
      "",
      "Submit the team entry fee of $40 total ($20 per player) to activate your team and unlock access to select your weekly match time.",
      "",
      `Pay @theleague_uva here: ${venmoLink}`,
      "",
      "Once your payment is received and approved, your team dashboard will unlock and you'll be able to sign up for your weekly time slot.",
      "",
      "Game locations, court assignments, and instructions for accessing your full schedule will be sent out on Sunday, March 22nd.",
      "",
      "You'll also be able to log in to your dashboard to view updates, and we'll continue sending important information to this email.",
      "",
      "If you have any questions, feel free to reply to this email.",
      "",
      "Thanks again for joining The League!",
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
              One more step to enter The League
            </h2>
          </div>
          <div style="padding: 8px 24px 24px;">
            <p>Hi <strong>${team.team_name}</strong>,</p>
            <p>
              Thanks for registering for <strong>The League</strong>! Your team has been successfully created.
            </p>
            <p>
              There’s just one final step to complete your entry.
            </p>
            <p>
              Submit the team entry fee of <strong>$40 total ($20 per player)</strong> to activate your team and unlock access to select your weekly match time.
            </p>
            <p>
              <strong>Pay <a href="${venmoLink}" style="color: #1d6042; text-decoration: none;">@theleague_uva</a></strong>
              <br />
              <span style="color: #5a6d62;">${venmoLink}</span>
            </p>
            <p>
              Once your payment is received and approved, your team dashboard will unlock and you'll be able to sign up for your weekly match time.
            </p>
            <p>
              Game locations, court assignments, and instructions for accessing your schedule will be sent out on <strong>Sunday, March 22nd</strong>.
            </p>
            <p>
              You can log in to your dashboard anytime to view updates, and we’ll also continue sending important information to this email.
            </p>
            <p>If you have any questions, feel free to reply to this email.</p>
            <p>Thanks again for joining The League!</p>
            <p style="margin-top: 24px; font-weight: 600;">The League</p>
          </div>
        </div>
      </div>
    `
  });
}
