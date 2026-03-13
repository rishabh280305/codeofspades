# Clinic OS - Full Clinic Workflow Platform

Clinic OS is a production-ready clinic workflow application built for real front-desk and doctor operations. It handles appointment scheduling, patient data, cancellations, reschedule requests, reminders, role-based dashboards, and AI-assisted doctor workflows from one system.

The platform is optimized for two operational roles:

- Receptionist: patient intake, appointment lifecycle management, notifications, approvals
- Doctor: schedule management, consultation workflows, files, summaries, analytics

---

## 1. Product Scope

Clinic OS supports the complete lifecycle from booking to consultation closure and post-booking communication.

### Appointment lifecycle states

- SCHEDULED
- COMPLETED
- CANCELLED
- NO_SHOW

### Role-specific experiences

Receptionist experience includes:

- Upcoming appointments queue
- Cancelled appointments queue
- Patient search and profile editing
- Booking workflows with slot lookup
- Reschedule/cancel/no-show control panel
- Notifications (patient cancellation + patient reschedule request)
- Patient history explorer

Doctor experience includes:

- Daily schedule
- Cancelled appointments view
- Patient history view
- File uploads per patient (reports, scans, prescriptions, documents)
- AI schedule briefing
- AI patient summary (based on past records and uploaded files)
- Analytics dashboard
- Clinic settings management

Patient communication experience includes:

- Appointment confirmation email
- Reminder email (auto day-before via cron)
- Cancel appointment link
- Reschedule request link
- Confirmation email after receptionist approves a patient reschedule request

---

## 2. System Architecture

### Runtime architecture

- Frontend: Next.js App Router pages and client components
- Backend: Next.js Route Handlers + Server Actions
- Auth: NextAuth Credentials provider with JWT session strategy
- Data layer: MongoDB with Mongoose models
- Email transport: Resend API
- AI: OpenAI for summaries, ElevenLabs for spoken output
- Hosting: Vercel serverless deployment

### Architectural style

The app follows a modular monolith pattern:

- UI and API in one Next.js repo
- Route Handlers for external-style API endpoints
- Server Actions for authenticated role-bound operations
- Shared libraries in `src/lib` for scheduling, auth, email, AI, and DB utilities

### Request flow at runtime

1. User signs in through credentials.
2. `auth.ts` validates user and enriches JWT/session with role and clinic context.
3. Role-gated pages call `requireRole`/`requireSession` before rendering data.
4. Queries pull clinic-scoped data from MongoDB.
5. Server Actions mutate state with server-side validation.
6. Email and notification side effects are triggered after mutation.
7. Revalidation updates affected dashboard pages.

---

## 3. Core Domain Model

### User

Represents authenticated clinic staff:

- name, email, passwordHash
- role: DOCTOR or RECEPTIONIST
- clinicId, clinicName

### Patient

Clinic-scoped patient identity:

- fullName, phone, email
- notes
- clinicId

### Appointment

Primary transactional record for scheduling and outcomes:

- patientId, doctorId, createdById, clinicId
- appointmentDate, startTime, endTime, startAt, endAt
- reason, notes, cancellationReason, status
- patientCancelToken (secure patient email action token)
- reminderSentAt
- reschedule request fields:
	- rescheduleRequestStatus (NONE/PENDING/APPROVED/REJECTED)
	- requestedAppointmentDate
	- requestedStartTime
	- requestedEndTime
	- requestedAt
	- rescheduleApprovedAt

### DoctorAvailability

Stores both available windows and blocked windows:

- doctorId, clinicId
- dayOfWeek and/or specificDate
- startTime, endTime
- isBlocked flag and label

### PatientFile

Stores uploaded clinical files:

- clinicId, patientId, doctorId
- file metadata (name, mimeType, size, category)
- base64 payload

### ClinicSettings

Clinic-level communication and profile config:

- clinic name and address lines
- city/state/postal/country
- contact phone/email
- website
- opening/closing time
- timezone and cancellation policy

### Notification

In-app staff notifications:

- clinicId
- recipientRole
- type, title, message
- appointmentId reference
- isRead

---

## 4. Scheduling and Conflict Engine

Scheduling logic lives in `src/lib/appointments.ts` and enforces all slot-level integrity.

### Key invariants

- Overlapping active appointments are blocked.
- Blocked availability windows are always excluded.
- Slot generation is deterministic by:
	- appointment date
	- slot duration (`CLINIC_SLOT_MINUTES`)
	- optional buffer (`CLINIC_SLOT_BUFFER_MINUTES`)

### Conflict checks

Conflict check evaluates:

- active appointment overlap (`SCHEDULED`, `COMPLETED`)
- blocked availability overlap

This is server-side, so UI bypass does not bypass safety checks.

---

## 5. Communication Workflows

### Email templates

Professional HTML templates are generated in `src/lib/email-templates.ts`:

- appointment confirmation
- appointment reminder
- appointment cancellation

### Email sending behavior

Transport utility in `src/lib/reminders.ts`:

- validates required config and recipient
- handles provider-side API error payloads
- handles thrown exceptions

### Patient email action links

Tokenized links are generated for:

- cancel appointment
- request reschedule

The token is stored in appointment (`patientCancelToken`) and used to resolve the target appointment securely.

---

## 6. Patient Reschedule Request Workflow

This is now a complete request-approval pipeline.

### Step-by-step flow

1. Patient clicks "Request Reschedule" from email.
2. Patient lands on a tokenized page (`/appointment-reschedule`).
3. Patient selects date and sees only available slots.
4. Patient submits selected slot.
5. Backend validates slot against current availability/conflicts.
6. Appointment stores request as `PENDING` with requested date/time fields.
7. Receptionist notification is generated (`type: RESCHEDULE_REQUEST`).
8. Receptionist approves request from Notifications tab.
9. Backend revalidates slot at approval time.
10. Appointment is updated and marked approved.
11. Patient receives reschedule confirmation email.

This two-phase validation (request-time and approval-time) prevents stale slot acceptance.

---

## 7. AI and Voice Features

### OpenAI usage

- AI schedule briefing for doctor day-start context
- AI patient summary that combines history and uploaded file context

### ElevenLabs usage

- High-quality spoken output for AI schedule briefing

### Safety and access

- AI and TTS endpoints are role-protected (doctor only)
- API keys are loaded from environment variables only

---

## 8. API Surface (High Level)

### Auth

- `api/auth/[...nextauth]`

### Appointment actions

- `api/appointments/cancel` (patient link flow)
- `api/appointments/reschedule-request` (patient slot request submission)
- `api/appointments/slots` (slot utilities)

### AI

- `api/ai/schedule-summary`
- `api/ai/patient-summary`

### Files

- `api/patient-files`
- `api/patient-files/[fileId]`

### Voice

- `api/tts`

### Ops/Cron

- `api/cron/appointment-reminders`

---

## 9. Dashboard Information Architecture

### Receptionist navigation

- Appointments
- Book
- Patients
- Notifications
- Cancelled
- History

### Doctor navigation

- Schedule
- Clinic Settings
- Analytics
- Cancelled
- History

This split keeps upcoming workflows clean while preserving audit and historical visibility.

---

## 10. Security and Multi-tenant Controls

### Access control

- Session checks via NextAuth
- Role gating with `requireRole`
- Protected server actions and APIs

### Data isolation

All business queries are clinic-scoped using `clinicId`.

### Secret handling

- Secrets are env-driven (`process.env`)
- `.env*` ignored by git with `.env.example` as safe template

### Tokenized patient actions

Patient email links rely on per-appointment token rather than exposing IDs in public links.

---

## 11. Environment Variables

### Required core

- `MONGODB_URI`
- `AUTH_SECRET`
- `NEXTAUTH_URL`

### Email

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

### AI

- `OPENAI_API_KEY`

### Voice

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`

### Public URL and automation

- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET` (optional if non-Vercel scheduler calls cron endpoint)

### Scheduling controls

- `CLINIC_SLOT_MINUTES`
- `CLINIC_SLOT_BUFFER_MINUTES`

### Seed/demo

- `SEED_DOCTOR_NAME`
- `SEED_DOCTOR_EMAIL`
- `SEED_DOCTOR_PASSWORD`
- `SEED_RECEPTIONIST_NAME`
- `SEED_RECEPTIONIST_EMAIL`
- `SEED_RECEPTIONIST_PASSWORD`

---

## 12. Local Development

1. Install dependencies.

```bash
npm install
```

2. Create local env file from template.

```bash
copy .env.example .env.local
```

3. Fill all required env values.

4. Run development server.

```bash
npm run dev
```

---

## 13. Deployment and Operations

### Vercel deployment

1. Push repository to GitHub.
2. Import project in Vercel.
3. Configure environment variables in Vercel project settings.
4. Deploy.

### Automated reminders

`vercel.json` config runs:

- path: `/api/cron/appointment-reminders`
- schedule: `0 9 * * *` (daily)

### Production readiness checklist

- MongoDB Atlas network + user permissions configured
- Resend domain verified for real-world recipient delivery
- OpenAI and ElevenLabs keys configured
- NEXT_PUBLIC_APP_URL points to production domain

---

## 14. Known Operational Considerations

- Email delivery to arbitrary external recipients requires a verified sender domain in Resend.
- Reminder cron skips already-reminded appointments via `reminderSentAt`.
- Reschedule requests are intentionally approval-gated by receptionist to avoid automated slot reassignment surprises.

---

## 15. Repository Structure

- `src/app` - pages, route handlers, and server actions
- `src/components` - reusable UI building blocks
- `src/lib` - auth, db, scheduling, reminders, AI, utilities
- `src/models` - Mongoose schemas and indexes
- `src/types` - type augmentations and shared declarations

Clinic OS is designed to be practical for day-to-day clinic operations, while still maintaining strict server-side data integrity, role safety, and extensibility for future modules.
