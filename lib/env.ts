export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  venmoLink: process.env.NEXT_PUBLIC_VENMO_LINK || "",
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
