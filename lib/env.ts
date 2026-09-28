export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  socialSquareLink:
    process.env.NEXT_PUBLIC_SOCIAL_SQUARE_LINK ||
    process.env.NEXT_PUBLIC_SQUARE_LINK ||
    "https://square.link/u/0MjJczgc",
  nonSocialSquareLink:
    process.env.NEXT_PUBLIC_NON_SOCIAL_SQUARE_LINK || "https://square.link/u/hkvqu0aA",
  databaseUrl: process.env.DATABASE_URL,
  emailVerificationApiKey: process.env.EMAIL_VERIFICATION_API_KEY,
  emailVerificationMode: process.env.EMAIL_VERIFICATION_MODE || "mock",
  adminPortalPassword: process.env.ADMIN_PORTAL_PASSWORD,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM,
  cronSecret: process.env.CRON_SECRET
};
