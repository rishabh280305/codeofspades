"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/server-auth";
import { AppointmentModel } from "@/models/Appointment";
import { DoctorAvailabilityModel } from "@/models/DoctorAvailability";

const blockSlotSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  specificDate: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  label: z.string().optional(),
});

export async function completeAppointmentAction(formData: FormData) {
  const session = await requireRole("DOCTOR");
  await connectToDatabase();

  const appointmentId = String(formData.get("appointmentId") ?? "");
  const notes = String(formData.get("notes") ?? "");

  await AppointmentModel.updateOne(
    {
      _id: appointmentId,
      doctorId: session.user.id,
      clinicId: session.user.clinicId,
    },
    {
      status: "COMPLETED",
      notes,
    },
  );

  revalidatePath("/dashboard/doctor");
  revalidatePath("/dashboard/receptionist");
}

export async function markNoShowAction(formData: FormData) {
  const session = await requireRole("DOCTOR");
  await connectToDatabase();

  const appointmentId = String(formData.get("appointmentId") ?? "");

  await AppointmentModel.updateOne(
    {
      _id: appointmentId,
      doctorId: session.user.id,
      clinicId: session.user.clinicId,
    },
    {
      status: "NO_SHOW",
    },
  );

  revalidatePath("/dashboard/doctor");
  revalidatePath("/dashboard/receptionist");
}

export async function blockTimeSlotAction(formData: FormData) {
  const session = await requireRole("DOCTOR");
  await connectToDatabase();

  const parsed = blockSlotSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    specificDate: formData.get("specificDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    label: formData.get("label"),
  });

  if (!parsed.success) {
    throw new Error("Invalid block slot data.");
  }

  await DoctorAvailabilityModel.create({
    clinicId: session.user.clinicId,
    doctorId: session.user.id,
    dayOfWeek: parsed.data.dayOfWeek,
    specificDate: parsed.data.specificDate || null,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    isBlocked: true,
    label: parsed.data.label || "Blocked",
  });

  revalidatePath("/dashboard/doctor");
  revalidatePath("/dashboard/receptionist");
}
