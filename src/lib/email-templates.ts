type ClinicInfo = {
  clinicName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
};

type AppointmentInfo = {
  patientName: string;
  doctorName: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
};

function shell(title: string, preheader: string, content: string, clinic: ClinicInfo) {
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#121212;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #d6deed;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#0b3d91;color:#ffffff;padding:18px 24px;">
                <p style="margin:0;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.9;">${preheader}</p>
                <h1 style="margin:6px 0 0 0;font-size:22px;line-height:1.3;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">${content}</td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#f2f6ff;border-top:1px solid #d6deed;color:#23314f;">
                <p style="margin:0 0 8px 0;font-size:14px;font-weight:700;">${clinic.clinicName}</p>
                <p style="margin:0;font-size:12px;line-height:1.6;">
                  ${clinic.address || "Address not configured"}<br/>
                  ${clinic.phone || ""} ${clinic.email ? `| ${clinic.email}` : ""}<br/>
                  ${clinic.website || ""}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function detailsBlock(appt: AppointmentInfo) {
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d6deed;border-radius:8px;background:#fbfcff;">
    <tr><td style="padding:14px 16px;font-size:14px;"><strong>Patient:</strong> ${appt.patientName}</td></tr>
    <tr><td style="padding:0 16px 14px 16px;font-size:14px;"><strong>Doctor:</strong> ${appt.doctorName}</td></tr>
    <tr><td style="padding:0 16px 14px 16px;font-size:14px;"><strong>Date:</strong> ${appt.date}</td></tr>
    <tr><td style="padding:0 16px 14px 16px;font-size:14px;"><strong>Time:</strong> ${appt.startTime} - ${appt.endTime}</td></tr>
    <tr><td style="padding:0 16px 14px 16px;font-size:14px;"><strong>Reason:</strong> ${appt.reason || "General consultation"}</td></tr>
  </table>`;
}

export function appointmentConfirmationTemplate(params: {
  clinic: ClinicInfo;
  appointment: AppointmentInfo;
  cancelUrl: string;
  rescheduleUrl?: string;
}) {
  const content = `
    <p style="margin:0 0 12px 0;font-size:15px;">Dear ${params.appointment.patientName},</p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">Your appointment has been successfully scheduled. Please find the details below.</p>
    ${detailsBlock(params.appointment)}
    <p style="margin:16px 0 0 0;font-size:14px;line-height:1.6;">Need to make a change? You can cancel or request a reschedule below:</p>
    <p style="margin:10px 0 0 0;display:flex;gap:8px;flex-wrap:wrap;">
      <a href="${params.cancelUrl}" style="display:inline-block;padding:10px 14px;background:#9b1c1c;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;">Cancel Appointment</a>
      ${params.rescheduleUrl ? `<a href="${params.rescheduleUrl}" style="display:inline-block;padding:10px 14px;background:#0b3d91;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;">Request Reschedule</a>` : ""}
    </p>
    <p style="margin:14px 0 0 0;font-size:12px;color:#586b8f;">Please arrive 10 minutes before your scheduled time.</p>
  `;

  return shell("Appointment Confirmation", "Confirmed Appointment", content, params.clinic);
}

export function appointmentReminderTemplate(params: {
  clinic: ClinicInfo;
  appointment: AppointmentInfo;
  cancelUrl: string;
  rescheduleUrl?: string;
}) {
  const content = `
    <p style="margin:0 0 12px 0;font-size:15px;">Dear ${params.appointment.patientName},</p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">This is a reminder for your appointment scheduled for tomorrow.</p>
    ${detailsBlock(params.appointment)}
    <p style="margin:16px 0 0 0;font-size:14px;line-height:1.6;">If you can no longer attend, you may cancel or request a reschedule:</p>
    <p style="margin:10px 0 0 0;display:flex;gap:8px;flex-wrap:wrap;">
      <a href="${params.cancelUrl}" style="display:inline-block;padding:10px 14px;background:#9b1c1c;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;">Cancel Appointment</a>
      ${params.rescheduleUrl ? `<a href="${params.rescheduleUrl}" style="display:inline-block;padding:10px 14px;background:#0b3d91;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;">Request Reschedule</a>` : ""}
    </p>
  `;

  return shell("Appointment Reminder", "Appointment Tomorrow", content, params.clinic);
}

export function appointmentCancelledTemplate(params: {
  clinic: ClinicInfo;
  appointment: AppointmentInfo;
  reason: string;
}) {
  const content = `
    <p style="margin:0 0 12px 0;font-size:15px;">Dear ${params.appointment.patientName},</p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">Your appointment has been cancelled.</p>
    ${detailsBlock(params.appointment)}
    <p style="margin:16px 0 0 0;font-size:14px;"><strong>Cancellation reason:</strong> ${params.reason || "No reason provided"}</p>
  `;

  return shell("Appointment Cancelled", "Cancellation Notice", content, params.clinic);
}

export function appointmentConfirmationWhatsAppText(params: {
  clinic: ClinicInfo;
  appointment: AppointmentInfo;
  cancelUrl: string;
  rescheduleUrl?: string;
}) {
  return [
    `Appointment confirmed - ${params.clinic.clinicName}`,
    `Patient: ${params.appointment.patientName}`,
    `Doctor: ${params.appointment.doctorName}`,
    `Date: ${params.appointment.date}`,
    `Time: ${params.appointment.startTime} - ${params.appointment.endTime}`,
    `Reason: ${params.appointment.reason || "General consultation"}`,
    `Cancel: ${params.cancelUrl}`,
    params.rescheduleUrl ? `Reschedule: ${params.rescheduleUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function appointmentReminderWhatsAppText(params: {
  clinic: ClinicInfo;
  appointment: AppointmentInfo;
  cancelUrl: string;
  rescheduleUrl?: string;
}) {
  return [
    `Reminder from ${params.clinic.clinicName}`,
    `Appointment tomorrow with ${params.appointment.doctorName}`,
    `Date: ${params.appointment.date}`,
    `Time: ${params.appointment.startTime} - ${params.appointment.endTime}`,
    `Cancel: ${params.cancelUrl}`,
    params.rescheduleUrl ? `Reschedule: ${params.rescheduleUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function appointmentCancelledWhatsAppText(params: {
  clinic: ClinicInfo;
  appointment: AppointmentInfo;
  reason: string;
}) {
  return [
    `Appointment cancelled - ${params.clinic.clinicName}`,
    `Doctor: ${params.appointment.doctorName}`,
    `Date: ${params.appointment.date}`,
    `Time: ${params.appointment.startTime} - ${params.appointment.endTime}`,
    `Reason: ${params.reason || "No reason provided"}`,
  ].join("\n");
}

export function appointmentFeedbackTemplate(params: {
  clinic: ClinicInfo;
  appointment: AppointmentInfo;
  feedbackUrl?: string;
}) {
  const content = `
    <p style="margin:0 0 12px 0;font-size:15px;">Dear ${params.appointment.patientName},</p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">Thank you for visiting us today. We hope your consultation with ${params.appointment.doctorName} was helpful.</p>
    ${detailsBlock(params.appointment)}
    <p style="margin:16px 0 0 0;font-size:14px;line-height:1.6;">We would love your feedback to keep improving care quality.</p>
    ${
      params.feedbackUrl
        ? `<p style="margin:10px 0 0 0;"><a href="${params.feedbackUrl}" style="display:inline-block;padding:10px 14px;background:#0b3d91;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;">Share Feedback</a></p>`
        : ""
    }
  `;

  return shell("Thank You For Visiting", "Share Feedback", content, params.clinic);
}

export function appointmentFeedbackWhatsAppText(params: {
  clinic: ClinicInfo;
  appointment: AppointmentInfo;
  feedbackUrl?: string;
}) {
  return [
    `Thank you for visiting ${params.clinic.clinicName}.`,
    `Appointment completed with ${params.appointment.doctorName}`,
    `Date: ${params.appointment.date}`,
    `Time: ${params.appointment.startTime} - ${params.appointment.endTime}`,
    "Please share feedback using this secure form:",
    params.feedbackUrl ? `Feedback: ${params.feedbackUrl}` : "Feedback form link unavailable. Please contact clinic.",
  ].join("\n");
}

export function appointmentPaymentRequestTemplate(params: {
  clinic: ClinicInfo;
  appointment: AppointmentInfo;
  paymentUrl: string;
  amount: number;
  currency?: string;
}) {
  const currency = (params.currency || "INR").toUpperCase();
  const content = `
    <p style="margin:0 0 12px 0;font-size:15px;">Dear ${params.appointment.patientName},</p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">Your consultation is completed. You can pay securely online using Stripe.</p>
    ${detailsBlock(params.appointment)}
    <p style="margin:16px 0 0 0;font-size:14px;"><strong>Amount Due:</strong> ${currency} ${params.amount.toFixed(2)}</p>
    <p style="margin:10px 0 0 0;"><a href="${params.paymentUrl}" style="display:inline-block;padding:10px 14px;background:#0b3d91;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;">Pay Securely via Stripe</a></p>
    <p style="margin:14px 0 0 0;font-size:12px;color:#586b8f;">If you need help with payment, reply to this message or contact the clinic reception.</p>
  `;

  return shell("Payment Link for Your Appointment", "Secure payment link", content, params.clinic);
}

export function appointmentPaymentRequestWhatsAppText(params: {
  clinic: ClinicInfo;
  appointment: AppointmentInfo;
  paymentUrl: string;
  amount: number;
  currency?: string;
}) {
  const currency = (params.currency || "INR").toUpperCase();
  return [
    `Payment request from ${params.clinic.clinicName}`,
    `Doctor: ${params.appointment.doctorName}`,
    `Date: ${params.appointment.date}`,
    `Time: ${params.appointment.startTime} - ${params.appointment.endTime}`,
    `Amount due: ${currency} ${params.amount.toFixed(2)}`,
    "Pay securely with Stripe:",
    params.paymentUrl,
  ].join("\n");
}
