# The League MVP

Full-stack MVP for a UVA pickleball league signup funnel:

- marketing landing page plus shadcn-style UI patterns
- team signup form for two UVA students
- returning-team login from the landing page
- email verification before registration
- Square-based entry fees with manual payment approval
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

- `NEXT_PUBLIC_SQUARE_LINK` (defaults to the Fall 2026 Square checkout link)
- `ADMIN_PORTAL_PASSWORD`
- `EMAIL_VERIFICATION_API_KEY` if you want real deliverability checks
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` if you want payment approval emails sent automatically
- the deployed production URL for `NEXT_PUBLIC_APP_URL`

## Notes

- Teams are created immediately with `payment_status = pending`, then admins manually mark Square payments as approved.
- Team records and league data are stored in Postgres. Existing records are assigned to Spring 2026; new registrations belong to Fall 2026.
- Members can only request timeslots after their payment is approved.
- When an admin approves a team payment, the app can email both team members if SMTP is configured.
- Fall 2026 regular season runs October 12 through November 4, with the playoff tournament on Sunday, November 8.
- Weekly slots are Monday through Wednesday, 5:00–5:45 PM at Snyder Courts and 6:00–6:45 PM at Perry Courts.
- Social players pay $5 per player through October 5; General players pay $15. After October 5, all players pay $15. Teams registering through October 5 need at least one Social member, verified against the Social roster.
- Fall 2026 is capped at 24 teams across six weekly slots, with capacity for 4 teams per slot.
- Playoff prizes: $250 for 1st place, $100 for 2nd, and $50 for 3rd.
- Social pricing ends Monday, October 5, 2026 at 11:59 PM EDT.
- Every slot has capacity for 4 teams.
- Each team can have one active reservation at a time; switching slots automatically replaces the old one.
- Every reservation starts as `pending` until an admin approves or rejects it.
- The app expects `DATABASE_URL` to point at a hosted Postgres database such as Supabase.
- `EMAIL_VERIFICATION_MODE=mock` accepts valid `@virginia.edu` addresses without calling an external API.
- The admin dashboard lives at `/admin` and is protected by `ADMIN_PORTAL_PASSWORD`.
