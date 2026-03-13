import { addDays, format } from "date-fns";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { sendAppointmentEmail, buildCancelAppointmentUrl } from "@/lib/reminders";
import { appointmentReminderTemplate } from "@/lib/email-templates";
import { AppointmentModel } from "@/models/Appointment";
import { ClinicSettingsModel } from "@/models/ClinicSettings";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization") || "";
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isVercelCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const appointments = await AppointmentModel.find({
    appointmentDate: tomorrow,
    status: "SCHEDULED",
    reminderSentAt: { $exists: false },
  })
    .populate("patientId")
    .populate("doctorId")
    .lean();

  let sent = 0;
  for (const appointment of appointments) {
    const token = appointment.patientCancelToken as string | undefined;
    const patientEmail = appointment.patientId?.email as string | undefined;
    if (!patientEmail || !token) {
      continue;
    }

    const clinicSettings = await ClinicSettingsModel.findOne({ clinicId: appointment.clinicId }).lean();
    const clinic = {
      clinicName: clinicSettings?.clinicName || "Clinic",
      address: [clinicSettings?.addressLine1, clinicSettings?.addressLine2, clinicSettings?.city, clinicSettings?.state, clinicSettings?.postalCode, clinicSettings?.country].filter(Boolean).join(", "),
      phone: clinicSettings?.contactPhone || "",
      email: clinicSettings?.contactEmail || "",
      website: clinicSettings?.website || "",
    };

    const html = appointmentReminderTemplate({
      clinic,
      appointment: {
        patientName: appointment.patientId?.fullName || "Patient",
        doctorName: appointment.doctorId?.name || "Doctor",
        date: appointment.appointmentDate as string,
        startTime: appointment.startTime as string,
        endTime: appointment.endTime as string,
        reason: (appointment.reason as string) || "General consultation",
      },
      cancelUrl: buildCancelAppointmentUrl(token),
    });

    const result = await sendAppointmentEmail({
      to: patientEmail,
      subject: `Reminder: Appointment Tomorrow - ${clinic.clinicName}`,
      html,
    });

    if (!result.skipped) {
      await AppointmentModel.updateOne({ _id: appointment._id }, { reminderSentAt: new Date() });
      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, scanned: appointments.length, sent });
}
