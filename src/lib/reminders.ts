import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY?.trim();
const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export type ClinicMailDetails = {
  clinicName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
};

export function buildCancelAppointmentUrl(token: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000";
  return `${base}/api/appointments/cancel?token=${encodeURIComponent(token)}`;
}

export function buildRescheduleRequestUrl(token: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000";
  return `${base}/appointment-reschedule?token=${encodeURIComponent(token)}`;
}

export async function sendAppointmentEmail(params: {
  to?: string;
  subject: string;
  html: string;
}) {
  const to = params.to?.trim();
  if (!to || !resend || !fromEmail) {
    return { skipped: true, reason: "missing-config-or-recipient" };
  }

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject: params.subject,
      html: params.html,
    });

    if (result.error) {
      console.error("Appointment email provider error", result.error);
      return { skipped: true, reason: "provider-error" };
    }
  } catch (error) {
    console.error("Appointment email failed", error);
    return { skipped: true, reason: "provider-error" };
  }

  return { skipped: false, reason: null };
}
