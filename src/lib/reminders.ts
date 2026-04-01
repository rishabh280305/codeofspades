import { Resend } from "resend";
import { getAppBaseUrl } from "@/lib/app-url";

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
  const base = getAppBaseUrl();
  return `${base}/api/appointments/cancel?token=${encodeURIComponent(token)}`;
}

export function buildRescheduleRequestUrl(token: string) {
  const base = getAppBaseUrl();
  return `${base}/appointment-reschedule?token=${encodeURIComponent(token)}`;
}

export function buildFeedbackUrl(token: string) {
  const base = getAppBaseUrl();
  return `${base}/appointment-feedback?token=${encodeURIComponent(token)}`;
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
