import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { connectToDatabase } from "@/lib/db";
import { getAvailableSlots } from "@/lib/appointments";
import { AppointmentModel } from "@/models/Appointment";
import { NotificationModel } from "@/models/Notification";

export async function POST(request: Request) {
  const appUrl = getAppBaseUrl();

  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim();
  const appointmentDate = String(formData.get("appointmentDate") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();

  if (!token || !appointmentDate || !startTime) {
    return NextResponse.redirect(`${appUrl}/appointment-reschedule?token=${encodeURIComponent(token)}&status=invalid`);
  }

  await connectToDatabase();

  const appointment = await AppointmentModel.findOne({
    patientCancelToken: token,
    status: "SCHEDULED",
  })
    .populate("patientId")
    .populate("doctorId");

  if (!appointment) {
    return NextResponse.redirect(`${appUrl}/appointment-reschedule?token=${encodeURIComponent(token)}&status=invalid`);
  }

  const slots = await getAvailableSlots({
    doctorId: String(appointment.doctorId?._id),
    appointmentDate,
    slotMinutes: Number(process.env.CLINIC_SLOT_MINUTES ?? 30),
    bufferMinutes: Number(process.env.CLINIC_SLOT_BUFFER_MINUTES ?? 0),
  });

  const selected = slots.find((slot) => slot.startTime === startTime);
  if (!selected) {
    return NextResponse.redirect(
      `${appUrl}/appointment-reschedule?token=${encodeURIComponent(token)}&date=${encodeURIComponent(appointmentDate)}&status=slot-missing`,
    );
  }

  appointment.rescheduleRequestStatus = "PENDING";
  appointment.requestedAppointmentDate = appointmentDate;
  appointment.requestedStartTime = selected.startTime;
  appointment.requestedEndTime = selected.endTime;
  appointment.requestedAt = new Date();
  await appointment.save();

  await NotificationModel.create({
    clinicId: appointment.clinicId,
    recipientRole: "RECEPTIONIST",
    type: "RESCHEDULE_REQUEST",
    title: "Patient requested reschedule",
    message: `${appointment.patientId?.fullName || "A patient"} requested ${appointmentDate} ${selected.startTime}-${selected.endTime} with ${appointment.doctorId?.name || "Doctor"}.`,
    appointmentId: appointment._id,
    isRead: false,
  });

  return NextResponse.redirect(`${appUrl}/appointment-reschedule?token=${encodeURIComponent(token)}&status=requested`);
}
