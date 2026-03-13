# Clinic OS - Doctor Appointment & Scheduling System

Clinic OS is a full-stack web application for clinic operations: appointment booking, cancellation, rescheduling, role-based dashboards, and automated patient confirmations.

## Product Overview

Clinic reception teams can create and manage appointments while doctors track daily schedules, mark outcomes, and block unavailable slots. The system enforces booking constraints and centralizes all clinic data in MongoDB.

### Core capabilities

- Role-based login for `RECEPTIONIST` and `DOCTOR`
- One-click demo login for judging/demo flow
- Linked account provisioning (`/create-account`) that creates doctor + receptionist under one `clinicId`
- Appointment lifecycle: `SCHEDULED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`
- Automatic overlap prevention for doctor time slots
- Doctor block slot support (weekly and specific-date)
- Patient management and search
- Appointment confirmation and update emails via Resend
- Vercel-compatible serverless architecture

## System Architecture

### High-level architecture

- Frontend: Next.js App Router pages and client components
- Backend: Next.js Server Actions + Route Handlers (`/app/api/...`)
- Authentication: NextAuth credentials provider with JWT sessions
- Database: MongoDB via Mongoose models
- Notifications: Resend email API
- Hosting: Vercel

### Request flow

1. User signs in with credentials.
2. NextAuth validates credentials and injects role + clinic context into session JWT.
3. Dashboard actions (book/cancel/reschedule/block/complete) execute as Server Actions.
4. Actions persist data in MongoDB models.
5. Booking flow triggers patient confirmation email.

### Domain model

- `User`
: fields include `role`, `clinicId`, `clinicName`, and credential hash.
- `Patient`
: belongs to a `clinicId`, stores patient identity/contact details.
- `Appointment`
: links patient + doctor + clinic with start/end timestamps and status.
- `DoctorAvailability`
: stores block windows and availability constraints.

### Scheduling logic

- Slot generation uses clinic slot duration and buffer configuration.
- Conflict checks reject overlapping appointments.
- Blocked doctor windows are excluded from available slots.
- Validation is server-side to prevent UI bypass.

### Security and sensitive configuration

- Secrets are loaded only via environment variables.
- `.env*` files are ignored by git.
- Auth is JWT-based and route access is protected by role checks.
- Sensitive values are not hardcoded in source.

## Tech Stack

- Next.js (App Router)
- TypeScript
- TailwindCSS
- MongoDB + Mongoose
- NextAuth (credentials)
- Resend

## Project Structure

- `src/app`
: pages, route handlers, and server actions.
- `src/components`
: reusable UI and auth components.
- `src/lib`
: auth, database connector, scheduling and email services.
- `src/models`
: Mongoose schemas and indexes.
- `src/types`
: NextAuth type augmentation.

## Environment Variables

Required:

- `MONGODB_URI`
- `AUTH_SECRET`
- `NEXTAUTH_URL`

Email (for patient notifications):

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (must be verified in Resend for real delivery)

Scheduling defaults:

- `CLINIC_SLOT_MINUTES`
- `CLINIC_SLOT_BUFFER_MINUTES`

Demo/seed credentials:

- `SEED_DOCTOR_NAME`
- `SEED_DOCTOR_EMAIL`
- `SEED_DOCTOR_PASSWORD`
- `SEED_RECEPTIONIST_NAME`
- `SEED_RECEPTIONIST_EMAIL`
- `SEED_RECEPTIONIST_PASSWORD`

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Create environment file.

```bash
cp .env.example .env.local
```

3. Fill required variables.

4. Start dev server.

```bash
npm run dev
```

## Deployment (Vercel)

1. Push this repository to GitHub.
2. Import repo in Vercel.
3. Configure all environment variables in Vercel project settings.
4. Deploy.

The app is serverless and does not require a dedicated Node server process.

## Operational Notes

- If MongoDB is temporarily unreachable, demo login fallback allows limited judging access.
- For production, keep Atlas Network Access and DB user permissions correctly configured.
- Use a verified Resend sender domain for reliable patient email delivery.
