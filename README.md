# Clinic OS - Full Clinic Workflow Platform

Clinic OS is a production-ready clinic workflow application built for real front-desk and doctor operations. It handles appointment scheduling, patient data, cancellations, reschedule requests, reminders, role-based dashboards, WhatsApp booking integration, AI-assisted workflows, and comprehensive feedback collection from one system.

The platform is optimized for two operational roles:

- **Receptionist**: patient intake, appointment lifecycle management, notifications, approvals, feedback dashboard
- **Doctor**: schedule management, consultation workflows, file uploads, AI-powered patient summaries with medical image analysis, AI analytics chat for business insights, feedback tracking

### Key Capabilities

- ✅ Multi-channel booking: Email/Web + WhatsApp via Twilio
- ✅ AI-powered workflows: Patient summaries with medical image analysis, schedule briefings, analytics insights
- ✅ Patient feedback collection: Star ratings, link-based submissions, duplicate prevention
- ✅ Real-time notifications: Appointment confirmations, reminders, cancellations
- ✅ Doctor analytics: Business metrics chat with AI insights
- ✅ Medical file management: Upload and analyze patient reports, scans, prescriptions
- ✅ Appointment lifecycle: Full state machine from booking to completion with feedback

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
- Feedback dashboard with average ratings and per-appointment reviews
- WhatsApp booking management and confirmations

Doctor experience includes:

- Daily schedule with AI schedule briefing
- Cancelled appointments view
- Patient history view
- File uploads per patient (reports, scans, prescriptions, documents)
- AI patient summary with medical image analysis (X-rays, CT scans, etc.)
- AI analytics chat for business metrics and insights
- Analytics dashboard
- Appointment feedback tracking and ratings
- Clinic settings management

Patient communication experience includes:

- Appointment confirmation (Email + SMS validation)
- WhatsApp booking via Twilio messaging
- Reminder email (auto day-before via cron)
- Cancel appointment link (email + WhatsApp)
- Reschedule request link (email + WhatsApp)
- Feedback collection link (one-time submission enforced)
- Confirmation email after receptionist approves a patient reschedule request

---

## 2. System Architecture

### Runtime architecture

- **Frontend**: Next.js 16.1.6 with App Router server components and client components
- **Backend**: Next.js Route Handlers + Server Actions
- **Auth**: NextAuth with JWT session strategy
- **Data layer**: MongoDB with Mongoose models
- **Email transport**: Resend API for transactional emails
- **Messaging**: Twilio WhatsApp API for booking flow and notifications
- **AI**: OpenAI GPT-4o for patient summaries, schedule briefings, and analytics insights
- **Voice**: ElevenLabs for text-to-speech output
- **File Storage**: Base64 payload storage in MongoDB (PatientFile model)
- **Hosting**: Vercel serverless deployment

### Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16.1.6 (Turbopack) | Full-stack React with SSR |
| **Language** | TypeScript | Type-safe codebase with strict mode |
| **Auth** | NextAuth.js | User authentication & sessions |
| **Database** | MongoDB Atlas + Mongoose | Document storage & ORM |
| **Email** | Resend API | Transactional email delivery |
| **Messaging** | Twilio WhatsApp API | Booking & notifications via WhatsApp |
| **AI Analysis** | OpenAI GPT-4o | Medical image analysis, summaries, metrics |
| **Voice Output** | ElevenLabs | High-quality TTS for briefings |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **UI Components** | React + ShadcN/UI patterns | Component library |
| **Form Handling** | Server Actions | Type-safe form submissions |
| **Real-time Updates** | Next.js revalidatePath | ISR and dynamic page updates |
| **Deployment** | Vercel | Serverless hosting & functions |
| **Environment** | Dotenv | Configuration management |

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
- **Feedback fields**: feedbackRating (1-5), feedbackComment, feedbackSubmittedAt (prevents duplicate submissions)
- reschedule request fields:
	- rescheduleRequestStatus (NONE/PENDING/APPROVED/REJECTED)
	- requestedAppointmentDate
	- requestedStartTime
	- requestedEndTime
	- requestedAt
	- rescheduleApprovedAt

### WhatsAppBookingSession

Tracks Twilio WhatsApp booking conversation state:

- patientId, clinicId
- phoneNumber
- conversationState (AWAITING_DOCTOR_SELECTION, AWAITING_DATE, AWAITING_TIME, AWAITING_REASON, COMPLETED)
- selectedDoctorId, selectedDate, selectedTime, selectedReason
- sessionCreatedAt, lastMessageAt (for timeout detection)

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
- type (RESCHEDULE_REQUEST, PATIENT_CANCELLED, FEEDBACK_RECEIVED, WHATSAPP_BOOKING), title, message
- appointmentId reference
- isRead
- createdAt

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

### OpenAI GPT-4o usage

- **AI Schedule Briefing**: Daily doctor briefing on upcoming appointments with context summary
- **AI Patient Summary**: Multi-pass medical analysis combining patient history + file context with dedicated medical image analysis pass
  - Component 1: Image Analyzer - Examines uploaded medical files (X-rays, CT scans, reports) with radiology-focused prompts
  - Component 2: Main Summary - Synthesizes patient history and image findings into clinical brief
  - Component 3: Fallback Handler - Ensures deterministic output even on model refusal
- **AI Analytics Chat**: Doctor-facing chatbot for clinic business metrics (busiest slots, completion rates, no-shows)

### Medical Image Analysis

- Dedicated first-pass analyzer with radiology-style prompts
- Extracts and reports concrete findings from uploaded files
- Mandatory "Image Findings" section in generated summaries
- Temperature: 0.1-0.2 for deterministic, clinically-focused output
- Prevents generic disclaimers; enforces specific observations

### ElevenLabs usage

- High-quality spoken output for AI schedule briefing with natural language

### Patient Feedback System

- **Feedback Collection**: Link-based form with 1-5 star ratings and optional comments
- **One-Time Submission**: Duplicate prevention enforced at database level
- **Feedback Dashboard**: Clinic-wide view with average rating, total responses, per-appointment reviews
- **Email + WhatsApp Links**: Consistent feedback URLs across all communication channels
- **Doctor View**: Appointment detail shows patient star rating inline

### WhatsApp Integration (Twilio)

- **Booking Channel**: Patients can book appointments via WhatsApp messaging
- **Intent Detection**: Tight command matching (`["book", "book appointment", "start booking"]`) prevents accidental re-booking
- **State Machine**: Deterministic conversation flow tracking clinic hours, doctor availability, patient slots
- **Multi-match Resilience**: Normalizes last-10 phone number matches for patient lookup
- **Notification Parity**: WhatsApp bookings trigger same confirmations, reminders, and feedback links as receptionist/email bookings
- **Link Consistency**: Cancel/reschedule/feedback links use centralized URL builder for domain normalization

### Safety and access

- AI and TTS endpoints are role-protected (doctor only)
- API keys are loaded from environment variables only
- Image analysis respects PHI boundaries with local processing

---

## 8. API Surface (High Level)

### Auth

- `api/auth/[...nextauth]`

### Appointment actions

- `api/appointments/cancel` (patient link flow)
- `api/appointments/reschedule-request` (patient slot request submission)
- `api/appointments/slots` (slot utilities)
- `api/appointments/feedback` (POST: submit star rating + comment, GET: check duplicate)

### AI

- `api/ai/schedule-summary` (doctor-only: day briefing)
- `api/ai/patient-summary` (doctor-only: medical analysis with image parsing)
- `api/ai/analytics-chat` (doctor-only: business metrics Q&A)

### Messaging

- `api/whatsapp/booking` (Twilio webhook: booking state machine)

### Files

- `api/patient-files` (upload/list clinical files)
- `api/patient-files/[fileId]` (download/preview)

### Voice

- `api/tts` (text-to-speech)

### Ops/Cron

- `api/cron/appointment-reminders` (scheduled daily email reminders)

### Demo/Seed

- `api/demo-credentials` (optional: returns seed user credentials for testing)

---

## 9. Dashboard Information Architecture

### Receptionist navigation

- Appointments (with WhatsApp booking queue)
- Book (manual + WhatsApp booking confirmation)
- Patients
- Notifications
- Cancelled
- History
- Feedback (clinic-wide ratings dashboard)

### Doctor navigation

- Schedule (with AI briefing)
- Clinic Settings
- Analytics (with AI insights chat)
- Cancelled
- History
- Feedback (patient ratings dashboard)

This split keeps upcoming workflows clean while preserving audit and historical visibility. Both roles have real-time access to patient feedback and ratings.

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

### AI & Voice

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`

### WhatsApp Messaging (Twilio)

- `TWILIO_ACCOUNT_SID` (Twilio account identifier)
- `TWILIO_AUTH_TOKEN` (Twilio authentication)
- `TWILIO_WHATSAPP_PHONE` (WhatsApp-enabled Twilio number, e.g., `+1234567890`)

### Public URL and automation

- `APPOINTMENT_PUBLIC_BASE_URL` (preferred: patient-facing link domain)
- `NEXT_PUBLIC_APP_URL` (fallback: public app URL)
- `CRON_SECRET` (optional if non-Vercel scheduler calls cron endpoint)

### Scheduling controls

- `CLINIC_SLOT_MINUTES` (appointment duration, default: 30)
- `CLINIC_SLOT_BUFFER_MINUTES` (buffer between appointments, default: 5)

### Seed/demo

- `SEED_DOCTOR_NAME`, `SEED_DOCTOR_EMAIL`, `SEED_DOCTOR_PASSWORD`
- `SEED_RECEPTIONIST_NAME`, `SEED_RECEPTIONIST_EMAIL`, `SEED_RECEPTIONIST_PASSWORD`

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
- Twilio WhatsApp API configured with webhook endpoint
- `APPOINTMENT_PUBLIC_BASE_URL` points to production domain (e.g., `https://codeofspades.vercel.app`)
- Clinic settings updated with real clinic info (name, hours, timezone)

---

## 14. Known Operational Considerations

- **Email delivery**: Arbitrary external recipients require verified sender domain in Resend.
- **Reminders**: Cron skips already-reminded appointments via `reminderSentAt` flag.
- **Reschedule workflow**: Intentionally approval-gated to prevent automated slot reassignment surprises.
- **WhatsApp booking**: Intent detection is strict (`["book", "book appointment", ...]`) to prevent feedback text from re-triggering booking flow.
- **Feedback submissions**: Duplicate prevention enforced at database level; `feedbackSubmittedAt` timestamp blocks second submission.
- **Medical image analysis**: AI uses dedicated first-pass analyzer to extract findings before main summary; falls back to formatted output on refusal.
- **URL normalization**: All patient-facing links (cancel, reschedule, feedback) use centralized `getAppBaseUrl()` builder to ensure domain consistency.
- **Notification resilience**: Appointment completion succeeds even if notification sends fail (try/catch wrapped); patient has fallback feedback email option.

---

## 15. Repository Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── patient-summary/        (medical analysis with image parsing)
│   │   │   ├── schedule-summary/       (doctor briefing)
│   │   │   └── analytics-chat/         (business metrics Q&A)
│   │   ├── appointments/
│   │   │   ├── cancel/                 (patient cancellation flow)
│   │   │   ├── feedback/              (feedback submission endpoint)
│   │   │   ├── reschedule-request/    (patient reschedule request)
│   │   │   └── slots/                 (slot availability utilities)
│   │   ├── whatsapp/
│   │   │   └── booking/               (Twilio webhook for WhatsApp booking)
│   │   ├── auth/[...nextauth]/        (NextAuth endpoints)
│   │   ├── patient-files/             (clinical file upload/download)
│   │   ├── tts/                       (text-to-speech)
│   │   └── cron/
│   │       └── appointment-reminders/ (scheduled email reminders)
│   ├── dashboard/
│   │   ├── doctor/
│   │   │   ├── schedule/
│   │   │   ├── analytics/
│   │   │   ├── history/
│   │   │   └── ...
│   │   ├── receptionist/
│   │   │   ├── appointments/
│   │   │   ├── book/
│   │   │   ├── patients/
│   │   │   └── ...
│   │   └── feedback/                  (clinic-wide ratings dashboard)
│   ├── appointment-feedback/          (public feedback form page)
│   ├── appointment-cancel/
│   ├── appointment-reschedule/
│   └── ...
├── components/
│   ├── doctor/
│   │   ├── AnalyticsAiChat.tsx       (chatbot UI)
│   │   ├── PatientFilesPanel.tsx
│   │   └── ...
│   └── auth/
├── lib/
│   ├── auth.ts                       (NextAuth configuration)
│   ├── db.ts                         (MongoDB connection)
│   ├── appointments.ts               (scheduling logic)
│   ├── email-templates.ts            (HTML email generation)
│   ├── reminders.ts                  (email sending + feedback link builder)
│   ├── app-url.ts                    (centralized URL builder)
│   ├── openai.ts                     (AI integration)
│   └── ...
├── models/
│   ├── User.ts
│   ├── Patient.ts
│   ├── Appointment.ts                (includes feedback fields)
│   ├── WhatsAppBookingSession.ts     (booking state)
│   ├── PatientFile.ts
│   └── ...
├── types/
│   └── next-auth.d.ts
└── ...
```

Clinic OS is designed to be practical for day-to-day clinic operations, while still maintaining strict server-side data integrity, role safety, and extensibility for future modules.
