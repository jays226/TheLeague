# The League MVP

Full-stack MVP for a UVA pickleball league signup funnel:

- marketing landing page plus shadcn-style UI patterns
- team signup form for two UVA students
- returning-team login from the landing page
- email verification before registration
- Venmo-based $100 paywall with manual payment approval
- password-protected admin portal for payments and timeslots
- Supabase/Postgres persistence for registrations
- FusionPlay-style member dashboard for weekly slot signup

## Stack

- Next.js App Router
- Tailwind CSS
- Postgres via `pg`
- Abstract Email Validation API in production, mock mode for local development

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in the values.

3. Start the app:

```bash
npm run dev
```

## Required credentials

You still need to provide:

- `NEXT_PUBLIC_VENMO_LINK`
- `ADMIN_PORTAL_PASSWORD`
- `EMAIL_VERIFICATION_API_KEY` if you want real deliverability checks
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` if you want payment approval emails sent automatically
- the deployed production URL for `NEXT_PUBLIC_APP_URL`

## Notes

- Teams are created immediately with `payment_status = pending`, then admins manually mark Venmo payments as approved.
- Each team now stores a password hash in SQLite and can log back in from the homepage.
- Members can only request timeslots after their payment is approved.
- When an admin approves a team payment, the app can email both team members if SMTP is configured.
- The recurring weekly schedule is the fixed six-slot board:
  Monday 6 PM, Monday 7 PM, Tuesday 6 PM, Tuesday 7 PM, Wednesday 6 PM, Wednesday 7 PM.
- Every slot has capacity for 4 teams.
- Each team can have one active reservation at a time; switching slots automatically replaces the old one.
- Every reservation starts as `pending` until an admin approves or rejects it.
- The app expects `DATABASE_URL` to point at a hosted Postgres database such as Supabase.
- `EMAIL_VERIFICATION_MODE=mock` accepts valid `@virginia.edu` addresses without calling an external API.
- The admin dashboard lives at `/admin` and is protected by `ADMIN_PORTAL_PASSWORD`.
