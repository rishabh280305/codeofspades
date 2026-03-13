"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/server-auth";
import { AppointmentModel } from "@/models/Appointment";
import { PatientModel } from "@/models/Patient";
import { getAvailableSlots, hasDoctorConflict } from "@/lib/appointments";
import { combineDateAndTime } from "@/lib/time";
import { sendAppointmentEmail } from "@/lib/reminders";

const patientSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().trim().email(),
  notes: z.string().optional(),
});

const bookSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  appointmentDate: z.string().min(1),
  startTime: z.string().min(1),
  reason: z.string().optional(),
  slotMinutes: z.coerce.number().int().min(15).max(120),
});

export async function addPatientAction(formData: FormData) {
  const session = await requireRole("RECEPTIONIST");
  await connectToDatabase();

  const parsed = patientSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error("Invalid patient details.");
  }

  await PatientModel.create({
    clinicId: session.user.clinicId,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    email: parsed.data.email,
    notes: parsed.data.notes || "",
  });

  revalidatePath("/dashboard/receptionist");
}

export async function createAppointmentAction(formData: FormData) {
  const session = await requireRole("RECEPTIONIST");
  await connectToDatabase();

  const parsed = bookSchema.safeParse({
    patientId: formData.get("patientId"),
    doctorId: formData.get("doctorId"),
    appointmentDate: formData.get("appointmentDate"),
    startTime: formData.get("startTime"),
    reason: formData.get("reason"),
    slotMinutes: formData.get("slotMinutes") ?? "30",
  });

  if (!parsed.success) {
    throw new Error("Invalid appointment payload.");
  }

  const availableSlots = await getAvailableSlots({
    doctorId: parsed.data.doctorId,
    appointmentDate: parsed.data.appointmentDate,
    slotMinutes: parsed.data.slotMinutes,
    bufferMinutes: Number(process.env.CLINIC_SLOT_BUFFER_MINUTES ?? 0),
  });

  const selectedSlot = availableSlots.find((slot) => slot.startTime === parsed.data.startTime);
  if (!selectedSlot) {
    throw new Error("Selected slot is no longer available.");
  }

  const hasConflict = await hasDoctorConflict({
    doctorId: parsed.data.doctorId,
    startAt: selectedSlot.startAt,
    endAt: selectedSlot.endAt,
  });

  if (hasConflict) {
    throw new Error("Doctor already has an overlapping appointment.");
  }

  const appointment = await AppointmentModel.create({
    clinicId: session.user.clinicId,
    patientId: parsed.data.patientId,
    doctorId: parsed.data.doctorId,
    createdById: session.user.id,
    appointmentDate: parsed.data.appointmentDate,
    startTime: selectedSlot.startTime,
    endTime: selectedSlot.endTime,
    startAt: selectedSlot.startAt,
    endAt: selectedSlot.endAt,
    reason: parsed.data.reason || "",
    status: "SCHEDULED",
  });

  const populated = await appointment.populate(["patientId", "doctorId"]);
  const clinicName = session.user.clinicName || "Clinic";
  const patientName = populated.patientId?.fullName ?? "Patient";
  const doctorName = populated.doctorId?.name ?? "Doctor";
  const patientPhone = populated.patientId?.phone ?? "N/A";
  const reason = parsed.data.reason || "General consultation";

  if (!populated.patientId?.email) {
    throw new Error("Patient email is required for appointment confirmation.");
  }

  const emailResult = await sendAppointmentEmail({
    to: populated.patientId?.email,
    subject: `Appointment Confirmed - ${clinicName}`,
    html: `
      <h2 style="margin-bottom:8px;">Appointment Confirmation</h2>
      <p>Hello ${patientName},</p>
      <p>Your appointment has been booked successfully.</p>
      <ul>
        <li><strong>Clinic:</strong> ${clinicName}</li>
        <li><strong>Doctor:</strong> ${doctorName}</li>
        <li><strong>Date:</strong> ${parsed.data.appointmentDate}</li>
        <li><strong>Time:</strong> ${selectedSlot.startTime} - ${selectedSlot.endTime}</li>
        <li><strong>Reason:</strong> ${reason}</li>
        <li><strong>Patient Contact:</strong> ${patientPhone}</li>
      </ul>
      <p>Please arrive 10 minutes early.</p>
    `,
  });

  if (emailResult.skipped) {
    throw new Error("Appointment created but email could not be sent. Check RESEND_FROM_EMAIL and Resend domain setup.");
  }

  revalidatePath("/dashboard/receptionist");
  revalidatePath("/dashboard/doctor");
}

export async function cancelAppointmentAction(formData: FormData) {
  await requireRole("RECEPTIONIST");
  await connectToDatabase();

  const appointmentId = String(formData.get("appointmentId") ?? "");
  const reason = String(formData.get("cancellationReason") ?? "");

  const appointment = await AppointmentModel.findByIdAndUpdate(
    appointmentId,
    { status: "CANCELLED", cancellationReason: reason },
    { new: true },
  )
    .populate("patientId")
    .populate("doctorId");

  if (appointment) {
    await sendAppointmentEmail({
      to: appointment.patientId?.email,
      subject: "Appointment Cancelled",
      html: `<p>Your appointment on ${appointment.appointmentDate} at ${appointment.startTime} was cancelled.</p>`,
    });
  }

  revalidatePath("/dashboard/receptionist");
  revalidatePath("/dashboard/doctor");
}

export async function rescheduleAppointmentAction(formData: FormData) {
  await requireRole("RECEPTIONIST");
  await connectToDatabase();

  const appointmentId = String(formData.get("appointmentId") ?? "");
  const appointmentDate = String(formData.get("appointmentDate") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const slotMinutes = Number(formData.get("slotMinutes") ?? 30);

  const appointment = await AppointmentModel.findById(appointmentId).populate(["patientId", "doctorId"]);
  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  const endTime = combineDateAndTime(appointmentDate, startTime);
  const endAt = new Date(endTime.getTime() + slotMinutes * 60 * 1000);
  const startAt = combineDateAndTime(appointmentDate, startTime);

  const hasConflict = await hasDoctorConflict({
    doctorId: String(appointment.doctorId._id),
    startAt,
    endAt,
    excludeAppointmentId: String(appointment._id),
  });

  if (hasConflict) {
    throw new Error("Cannot reschedule due to conflict.");
  }

  appointment.appointmentDate = appointmentDate;
  appointment.startTime = startTime;
  appointment.endTime = `${String(endAt.getHours()).padStart(2, "0")}:${String(endAt.getMinutes()).padStart(2, "0")}`;
  appointment.startAt = startAt;
  appointment.endAt = endAt;
  appointment.status = "SCHEDULED";

  await appointment.save();

  await sendAppointmentEmail({
    to: appointment.patientId?.email,
    subject: "Appointment Rescheduled",
    html: `<p>Your appointment was moved to ${appointmentDate} at ${startTime}.</p>`,
  });

  revalidatePath("/dashboard/receptionist");
  revalidatePath("/dashboard/doctor");
}
