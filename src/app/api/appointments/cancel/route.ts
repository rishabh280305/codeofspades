import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { connectToDatabase } from "@/lib/db";
import { AppointmentModel } from "@/models/Appointment";
import { NotificationModel } from "@/models/Notification";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();
  const appUrl = getAppBaseUrl();

  if (!token) {
    return NextResponse.redirect(`${appUrl}/appointment-cancelled?status=invalid`);
  }

  await connectToDatabase();

  const appointment = await AppointmentModel.findOne({
    patientCancelToken: token,
    status: "SCHEDULED",
  });

  if (!appointment) {
    return NextResponse.redirect(`${appUrl}/appointment-cancelled?status=not-found`);
  }

  appointment.status = "CANCELLED";
  appointment.cancellationReason = "Cancelled by patient via secure email link";
  await appointment.populate(["patientId", "doctorId"]);
  await appointment.save();

  await NotificationModel.create({
    clinicId: appointment.clinicId,
    recipientRole: "RECEPTIONIST",
    type: "PATIENT_CANCELLATION",
    title: "Patient cancelled appointment",
    message: `${appointment.patientId?.fullName || "A patient"} cancelled ${appointment.appointmentDate} at ${appointment.startTime} with ${appointment.doctorId?.name || "Doctor"}.`,
    appointmentId: appointment._id,
    isRead: false,
  });

  return NextResponse.redirect(`${appUrl}/appointment-cancelled?status=success`);
}
