"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/server-auth";
import { AppointmentModel } from "@/models/Appointment";
import { ClinicSettingsModel } from "@/models/ClinicSettings";
import { DoctorAvailabilityModel } from "@/models/DoctorAvailability";

const blockSlotSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  specificDate: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  label: z.string().optional(),
});

const clinicSettingsSchema = z.object({
  clinicName: z.string().min(2),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  website: z.string().optional(),
  openingTime: z.string().min(1),
  closingTime: z.string().min(1),
  timezone: z.string().min(1),
  cancellationPolicy: z.string().optional(),
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

export async function updateClinicSettingsAction(formData: FormData) {
  const session = await requireRole("DOCTOR");
  await connectToDatabase();

  const parsed = clinicSettingsSchema.safeParse({
    clinicName: formData.get("clinicName"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
    contactPhone: formData.get("contactPhone"),
    contactEmail: formData.get("contactEmail"),
    website: formData.get("website"),
    openingTime: formData.get("openingTime"),
    closingTime: formData.get("closingTime"),
    timezone: formData.get("timezone"),
    cancellationPolicy: formData.get("cancellationPolicy"),
  });

  if (!parsed.success) {
    throw new Error("Invalid clinic settings.");
  }

  await ClinicSettingsModel.updateOne(
    { clinicId: session.user.clinicId },
    {
      clinicId: session.user.clinicId,
      clinicName: parsed.data.clinicName,
      addressLine1: parsed.data.addressLine1 || "",
      addressLine2: parsed.data.addressLine2 || "",
      city: parsed.data.city || "",
      state: parsed.data.state || "",
      postalCode: parsed.data.postalCode || "",
      country: parsed.data.country || "",
      contactPhone: parsed.data.contactPhone || "",
      contactEmail: parsed.data.contactEmail || "",
      website: parsed.data.website || "",
      openingTime: parsed.data.openingTime,
      closingTime: parsed.data.closingTime,
      timezone: parsed.data.timezone,
      cancellationPolicy:
        parsed.data.cancellationPolicy ||
        "Please notify us at least 24 hours in advance for cancellations.",
    },
    { upsert: true },
  );

  revalidatePath("/dashboard/doctor/settings");
}
