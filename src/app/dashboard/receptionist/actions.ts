"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/server-auth";
import { AppointmentModel } from "@/models/Appointment";
import { ClinicSettingsModel } from "@/models/ClinicSettings";
import { NotificationModel } from "@/models/Notification";
import { PatientModel } from "@/models/Patient";
import { getAvailableSlots, hasDoctorConflict } from "@/lib/appointments";
import { combineDateAndTime } from "@/lib/time";
import { appointmentCancelledTemplate, appointmentConfirmationTemplate } from "@/lib/email-templates";
import { buildCancelAppointmentUrl, sendAppointmentEmail } from "@/lib/reminders";

const patientSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().trim().email(),
  notes: z.string().optional(),
});

const updatePatientSchema = z.object({
  patientId: z.string().min(1),
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
  revalidatePath("/dashboard/receptionist/patients");
}

export async function updatePatientAction(formData: FormData) {
  const session = await requireRole("RECEPTIONIST");
  await connectToDatabase();

  const parsed = updatePatientSchema.safeParse({
    patientId: formData.get("patientId"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error("Invalid patient details.");
  }

  await PatientModel.updateOne(
    {
      _id: parsed.data.patientId,
      clinicId: session.user.clinicId,
    },
    {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      notes: parsed.data.notes || "",
    },
  );

  revalidatePath("/dashboard/receptionist");
  revalidatePath("/dashboard/receptionist/patients");
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
    patientCancelToken: randomUUID(),
  });

  const populated = await appointment.populate(["patientId", "doctorId"]);
  const clinicSettings = await ClinicSettingsModel.findOne({ clinicId: session.user.clinicId }).lean();
  const clinicName = clinicSettings?.clinicName || session.user.clinicName || "Clinic";
  const patientName = populated.patientId?.fullName ?? "Patient";
  const doctorName = populated.doctorId?.name ?? "Doctor";
  const reason = parsed.data.reason || "General consultation";

  if (!populated.patientId?.email) {
    throw new Error("Patient email is required for appointment confirmation.");
  }

  const emailResult = await sendAppointmentEmail({
    to: populated.patientId?.email,
    subject: `Appointment Confirmed - ${clinicName}`,
    html: appointmentConfirmationTemplate({
      clinic: {
        clinicName,
        address: [clinicSettings?.addressLine1, clinicSettings?.addressLine2, clinicSettings?.city, clinicSettings?.state, clinicSettings?.postalCode, clinicSettings?.country]
          .filter(Boolean)
          .join(", "),
        phone: clinicSettings?.contactPhone || "",
        email: clinicSettings?.contactEmail || "",
        website: clinicSettings?.website || "",
      },
      appointment: {
        patientName,
        doctorName,
        date: parsed.data.appointmentDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        reason,
      },
      cancelUrl: buildCancelAppointmentUrl(String(appointment.patientCancelToken)),
    }),
  });

  if (emailResult.skipped) {
    throw new Error("Appointment created but email could not be sent. Check RESEND_FROM_EMAIL and Resend domain setup.");
  }

  revalidatePath("/dashboard/receptionist");
  revalidatePath("/dashboard/doctor");
}

export async function cancelAppointmentAction(formData: FormData) {
  const session = await requireRole("RECEPTIONIST");
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
    const clinicSettings = await ClinicSettingsModel.findOne({ clinicId: session.user.clinicId }).lean();
    const clinicName = clinicSettings?.clinicName || session.user.clinicName || "Clinic";

    await sendAppointmentEmail({
      to: appointment.patientId?.email,
      subject: `Appointment Cancelled - ${clinicName}`,
      html: appointmentCancelledTemplate({
        clinic: {
          clinicName,
          address: [clinicSettings?.addressLine1, clinicSettings?.addressLine2, clinicSettings?.city, clinicSettings?.state, clinicSettings?.postalCode, clinicSettings?.country]
            .filter(Boolean)
            .join(", "),
          phone: clinicSettings?.contactPhone || "",
          email: clinicSettings?.contactEmail || "",
          website: clinicSettings?.website || "",
        },
        appointment: {
          patientName: appointment.patientId?.fullName || "Patient",
          doctorName: appointment.doctorId?.name || "Doctor",
          date: appointment.appointmentDate,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          reason: appointment.reason || "General consultation",
        },
        reason,
      }),
    });
  }

  revalidatePath("/dashboard/receptionist");
  revalidatePath("/dashboard/doctor");
}

export async function markNoShowAppointmentAction(formData: FormData) {
  const session = await requireRole("RECEPTIONIST");
  await connectToDatabase();

  const appointmentId = String(formData.get("appointmentId") ?? "");

  await AppointmentModel.updateOne(
    {
      _id: appointmentId,
      clinicId: session.user.clinicId,
    },
    {
      status: "NO_SHOW",
    },
  );

  revalidatePath("/dashboard/receptionist");
  revalidatePath("/dashboard/receptionist/appointments");
  revalidatePath("/dashboard/doctor");
}

export async function rescheduleAppointmentAction(formData: FormData) {
  const session = await requireRole("RECEPTIONIST");
  await connectToDatabase();

  const appointmentId = String(formData.get("appointmentId") ?? "");
  const appointmentDate = String(formData.get("appointmentDate") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const slotMinutes = Number(formData.get("slotMinutes") ?? 30);

  const appointment = await AppointmentModel.findById(appointmentId).populate(["patientId", "doctorId"]);
  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  if (!appointment.patientCancelToken) {
    appointment.patientCancelToken = randomUUID();
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

  const clinicSettings = await ClinicSettingsModel.findOne({ clinicId: session.user.clinicId }).lean();
  const clinicName = clinicSettings?.clinicName || session.user.clinicName || "Clinic";

  await sendAppointmentEmail({
    to: appointment.patientId?.email,
    subject: `Appointment Rescheduled - ${clinicName}`,
    html: appointmentConfirmationTemplate({
      clinic: {
        clinicName,
        address: [clinicSettings?.addressLine1, clinicSettings?.addressLine2, clinicSettings?.city, clinicSettings?.state, clinicSettings?.postalCode, clinicSettings?.country]
          .filter(Boolean)
          .join(", "),
        phone: clinicSettings?.contactPhone || "",
        email: clinicSettings?.contactEmail || "",
        website: clinicSettings?.website || "",
      },
      appointment: {
        patientName: appointment.patientId?.fullName || "Patient",
        doctorName: appointment.doctorId?.name || "Doctor",
        date: appointmentDate,
        startTime,
        endTime: appointment.endTime,
        reason: appointment.reason || "General consultation",
      },
      cancelUrl: buildCancelAppointmentUrl(String(appointment.patientCancelToken)),
    }),
  });

  revalidatePath("/dashboard/receptionist");
  revalidatePath("/dashboard/doctor");
}

export async function markNotificationReadAction(formData: FormData) {
  const session = await requireRole("RECEPTIONIST");
  await connectToDatabase();

  const notificationId = String(formData.get("notificationId") ?? "");
  if (!notificationId) {
    return;
  }

  await NotificationModel.updateOne(
    {
      _id: notificationId,
      clinicId: session.user.clinicId,
      recipientRole: "RECEPTIONIST",
    },
    { isRead: true },
  );

  revalidatePath("/dashboard/receptionist/notifications");
}

export async function markAllNotificationsReadAction() {
  const session = await requireRole("RECEPTIONIST");
  await connectToDatabase();

  await NotificationModel.updateMany(
    {
      clinicId: session.user.clinicId,
      recipientRole: "RECEPTIONIST",
      isRead: false,
    },
    { isRead: true },
  );

  revalidatePath("/dashboard/receptionist/notifications");
}
