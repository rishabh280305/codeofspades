import { randomUUID } from "crypto";
import { addHours, format } from "date-fns";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { getAvailableSlots, hasDoctorConflict } from "@/lib/appointments";
import {
  appointmentConfirmationTemplate,
  appointmentConfirmationWhatsAppText,
} from "@/lib/email-templates";
import {
  buildCancelAppointmentUrl,
  buildRescheduleRequestUrl,
  sendAppointmentEmail,
} from "@/lib/reminders";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { AppointmentModel } from "@/models/Appointment";
import { ClinicSettingsModel } from "@/models/ClinicSettings";
import { NotificationModel } from "@/models/Notification";
import { PatientModel } from "@/models/Patient";
import { UserModel } from "@/models/User";
import { WhatsAppBookingSessionModel } from "@/models/WhatsAppBookingSession";

type SlotOption = { startTime: string; endTime: string };

function escapeXml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twimlMessage(message: string) {
  const safeMessage = escapeXml(message);
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safeMessage}</Message></Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function normalizeIncomingPhone(raw: string) {
  const value = raw.trim();
  if (!value) {
    return "";
  }
  if (value.startsWith("whatsapp:")) {
    return value.replace("whatsapp:", "");
  }
  return value;
}

function digitsOnly(input: string) {
  return input.replace(/\D/g, "");
}

function patientPhoneQueryVariants(phone: string) {
  const digits = digitsOnly(phone);
  const last10 = digits.slice(-10);
  const variants = new Set<string>();

  if (phone.startsWith("+")) {
    variants.add(phone);
  }
  if (digits.startsWith("91") && digits.length >= 12) {
    variants.add(`+${digits}`);
    variants.add(digits.slice(-10));
  }
  if (digits.length === 10) {
    variants.add(digits);
    variants.add(`+91${digits}`);
  }
  if (last10.length === 10) {
    variants.add(last10);
  }

  return Array.from(variants);
}

function sanitizeText(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

function isResetCommand(text: string) {
  const lower = text.toLowerCase();
  return lower === "cancel" || lower === "reset" || lower === "start";
}

function isBookIntent(text: string) {
  const lower = text.toLowerCase().trim();
  return ["book", "book appointment", "new appointment", "book slot", "start booking"].includes(lower);
}

function parseDateInput(text: string) {
  const lower = text.toLowerCase();
  if (lower === "today") {
    return format(new Date(), "yyyy-MM-dd");
  }
  if (lower === "tomorrow") {
    return format(new Date(Date.now() + 24 * 60 * 60 * 1000), "yyyy-MM-dd");
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }
  return null;
}

function doctorsListMessage(doctors: Array<{ _id: string; name: string }>) {
  const rows = doctors.map((doctor, index) => `${index + 1}. ${doctor.name}`);
  return [
    "Great, let us book your appointment.",
    "Reply with the doctor number:",
    ...rows,
    "\nYou can send CANCEL anytime to restart.",
  ].join("\n");
}

function slotsListMessage(date: string, slots: SlotOption[]) {
  const rows = slots.slice(0, 10).map((slot, index) => `${index + 1}. ${slot.startTime} - ${slot.endTime}`);
  return [
    `Available slots on ${date}:`,
    ...rows,
    "Reply with slot number (example: 1).",
  ].join("\n");
}

async function getClinicDoctors(clinicId: string) {
  const doctors = await UserModel.find({ clinicId, role: "DOCTOR" }).sort({ name: 1 }).select("_id name").lean();
  return doctors.map((doctor) => ({ _id: String(doctor._id), name: doctor.name }));
}

async function upsertSession(phone: string, updates: Record<string, unknown>) {
  await WhatsAppBookingSessionModel.updateOne(
    { phone },
    {
      $set: {
        ...updates,
        expiresAt: addHours(new Date(), 2),
      },
    },
    { upsert: true },
  );
}

async function resetSession(phone: string) {
  await upsertSession(phone, {
    state: "IDLE",
    selectedDoctorId: "",
    selectedDate: "",
    selectedStartTime: "",
    slotOptions: [],
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const rawFrom = String(formData.get("From") ?? "");
  const body = sanitizeText(String(formData.get("Body") ?? ""));
  const from = normalizeIncomingPhone(rawFrom);

  if (!from || !body) {
    return twimlMessage("Please send a valid message. Type BOOK to start appointment booking.");
  }

  await connectToDatabase();

  const phoneVariants = patientPhoneQueryVariants(from);
  const matchingPatients = await PatientModel.find({ phone: { $in: phoneVariants } })
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

  if (matchingPatients.length === 0) {
    return twimlMessage(
      "We could not find your patient profile. Please contact clinic reception to register your WhatsApp number.",
    );
  }

  const clinicIds = Array.from(
    new Set(matchingPatients.map((entry) => String(entry.clinicId || "")).filter(Boolean)),
  );
  if (clinicIds.length > 1) {
    return twimlMessage(
      "Your phone is linked to multiple clinic profiles. Please contact reception to complete booking.",
    );
  }

  const patient = matchingPatients[0];
  if (!patient?.clinicId) {
    return twimlMessage(
      "We could not find your patient profile. Please contact clinic reception to register your WhatsApp number.",
    );
  }

  const clinicId = String(patient.clinicId);
  const patientId = String(patient._id);

  const session = await WhatsAppBookingSessionModel.findOne({ phone: from }).lean();
  const sessionExpired = session?.expiresAt ? new Date(session.expiresAt) < new Date() : true;
  const currentState = sessionExpired ? "IDLE" : session?.state || "IDLE";

  if (isResetCommand(body)) {
    await resetSession(from);
    return twimlMessage("Booking session reset. Send BOOK to start a new appointment request.");
  }

  const doctors = await getClinicDoctors(clinicId);
  if (doctors.length === 0) {
    return twimlMessage("No doctors are currently available for WhatsApp booking. Please contact reception.");
  }

  if (currentState === "IDLE") {
    if (!isBookIntent(body)) {
      return twimlMessage("Welcome! To book an appointment, reply exactly: BOOK APPOINTMENT");
    }

    await upsertSession(from, {
      clinicId,
      patientId,
      state: "WAITING_DOCTOR",
      selectedDoctorId: "",
      selectedDate: "",
      selectedStartTime: "",
      slotOptions: [],
    });

    return twimlMessage(doctorsListMessage(doctors));
  }

  if (currentState === "WAITING_DOCTOR") {
    const doctorChoice = Number(body);
    if (!Number.isInteger(doctorChoice) || doctorChoice < 1 || doctorChoice > doctors.length) {
      return twimlMessage("Invalid doctor number. Please reply with a valid number from the list.");
    }

    const selectedDoctor = doctors[doctorChoice - 1];
    await upsertSession(from, {
      clinicId,
      patientId,
      state: "WAITING_DATE",
      selectedDoctorId: selectedDoctor._id,
      selectedDate: "",
      selectedStartTime: "",
      slotOptions: [],
    });

    return twimlMessage(
      `Doctor selected: ${selectedDoctor.name}.\nReply with date in YYYY-MM-DD format (or TODAY / TOMORROW).`,
    );
  }

  if (currentState === "WAITING_DATE") {
    const selectedDate = parseDateInput(body);
    if (!selectedDate) {
      return twimlMessage("Invalid date. Please reply as YYYY-MM-DD, TODAY, or TOMORROW.");
    }

    const selectedDoctorId = String(session?.selectedDoctorId || "");
    if (!selectedDoctorId) {
      await resetSession(from);
      return twimlMessage("Session expired. Send BOOK to start again.");
    }

    const slots = await getAvailableSlots({
      doctorId: selectedDoctorId,
      appointmentDate: selectedDate,
      slotMinutes: Number(process.env.CLINIC_SLOT_MINUTES ?? 30),
      bufferMinutes: Number(process.env.CLINIC_SLOT_BUFFER_MINUTES ?? 0),
    });

    const slotOptions = slots.map((slot) => ({ startTime: slot.startTime, endTime: slot.endTime }));
    if (slotOptions.length === 0) {
      return twimlMessage("No slots available on that date. Please send another date.");
    }

    await upsertSession(from, {
      clinicId,
      patientId,
      state: "WAITING_SLOT",
      selectedDate,
      slotOptions,
      selectedStartTime: "",
    });

    return twimlMessage(slotsListMessage(selectedDate, slotOptions));
  }

  if (currentState === "WAITING_SLOT") {
    const slotChoice = Number(body);
    const slotOptions = Array.isArray(session?.slotOptions)
      ? (session.slotOptions as Array<{ startTime?: string; endTime?: string }>).filter(
          (slot) => !!slot.startTime && !!slot.endTime,
        )
      : [];

    if (!Number.isInteger(slotChoice) || slotChoice < 1 || slotChoice > slotOptions.length) {
      return twimlMessage("Invalid slot number. Please reply with a valid slot number from the list.");
    }

    const selectedSlot = slotOptions[slotChoice - 1];
    await upsertSession(from, {
      clinicId,
      patientId,
      state: "WAITING_REASON",
      selectedStartTime: selectedSlot.startTime,
    });

    return twimlMessage(
      `Selected slot: ${selectedSlot.startTime} - ${selectedSlot.endTime}.\nReply with reason for visit (or send SKIP).`,
    );
  }

  if (currentState === "WAITING_REASON") {
    const reason = body.toLowerCase() === "skip" ? "General consultation" : body;
    const selectedDoctorId = String(session?.selectedDoctorId || "");
    const selectedDate = String(session?.selectedDate || "");
    const selectedStartTime = String(session?.selectedStartTime || "");

    if (!selectedDoctorId || !selectedDate || !selectedStartTime) {
      await resetSession(from);
      return twimlMessage("Session data missing. Send BOOK to start again.");
    }

    const liveSlots = await getAvailableSlots({
      doctorId: selectedDoctorId,
      appointmentDate: selectedDate,
      slotMinutes: Number(process.env.CLINIC_SLOT_MINUTES ?? 30),
      bufferMinutes: Number(process.env.CLINIC_SLOT_BUFFER_MINUTES ?? 0),
    });

    const chosenSlot = liveSlots.find((slot) => slot.startTime === selectedStartTime);
    if (!chosenSlot) {
      await upsertSession(from, {
        state: "WAITING_DATE",
        selectedDate: "",
        selectedStartTime: "",
        slotOptions: [],
      });
      return twimlMessage("That slot is no longer available. Please send a new date (YYYY-MM-DD).",);
    }

    const hasConflict = await hasDoctorConflict({
      doctorId: selectedDoctorId,
      startAt: chosenSlot.startAt,
      endAt: chosenSlot.endAt,
    });

    if (hasConflict) {
      await upsertSession(from, {
        state: "WAITING_DATE",
        selectedDate: "",
        selectedStartTime: "",
        slotOptions: [],
      });
      return twimlMessage("Slot conflict detected. Please send a new date to continue booking.");
    }

    const creator = await UserModel.findOne({ clinicId, role: "RECEPTIONIST" }).lean();
    const fallbackCreator = creator || (await UserModel.findOne({ clinicId, role: "DOCTOR" }).lean());
    if (!fallbackCreator?._id) {
      return twimlMessage("Booking is temporarily unavailable. Please contact reception.");
    }

    const patientObjectId = new Types.ObjectId(patientId);
    const doctorObjectId = new Types.ObjectId(selectedDoctorId);
    const createdByObjectId = new Types.ObjectId(String(fallbackCreator._id));

    const appointment = await AppointmentModel.create({
      clinicId,
      patientId: patientObjectId,
      doctorId: doctorObjectId,
      createdById: createdByObjectId,
      appointmentDate: selectedDate,
      startTime: chosenSlot.startTime,
      endTime: chosenSlot.endTime,
      startAt: chosenSlot.startAt,
      endAt: chosenSlot.endAt,
      reason,
      status: "SCHEDULED",
      patientCancelToken: randomUUID(),
    });

    const clinicSettings = await ClinicSettingsModel.findOne({ clinicId }).lean();
    const clinic = {
      clinicName: clinicSettings?.clinicName || "Clinic",
      address: [
        clinicSettings?.addressLine1,
        clinicSettings?.addressLine2,
        clinicSettings?.city,
        clinicSettings?.state,
        clinicSettings?.postalCode,
        clinicSettings?.country,
      ]
        .filter(Boolean)
        .join(", "),
      phone: clinicSettings?.contactPhone || "",
      email: clinicSettings?.contactEmail || "",
      website: clinicSettings?.website || "",
    };

    const doctor = doctors.find((item) => item._id === selectedDoctorId);
    const patientName = String(patient.fullName || "Patient");
    const doctorName = doctor?.name || "Doctor";

    await sendAppointmentEmail({
      to: patient.email,
      subject: `Appointment Confirmed - ${clinic.clinicName}`,
      html: appointmentConfirmationTemplate({
        clinic,
        appointment: {
          patientName,
          doctorName,
          date: selectedDate,
          startTime: chosenSlot.startTime,
          endTime: chosenSlot.endTime,
          reason,
        },
        cancelUrl: buildCancelAppointmentUrl(String(appointment.patientCancelToken)),
        rescheduleUrl: buildRescheduleRequestUrl(String(appointment.patientCancelToken)),
      }),
    });

    await sendWhatsAppMessage({
      to: patient.phone,
      body: appointmentConfirmationWhatsAppText({
        clinic,
        appointment: {
          patientName,
          doctorName,
          date: selectedDate,
          startTime: chosenSlot.startTime,
          endTime: chosenSlot.endTime,
          reason,
        },
        cancelUrl: buildCancelAppointmentUrl(String(appointment.patientCancelToken)),
        rescheduleUrl: buildRescheduleRequestUrl(String(appointment.patientCancelToken)),
      }),
    });

    await NotificationModel.create({
      clinicId,
      recipientRole: "RECEPTIONIST",
      type: "WHATSAPP_BOOKING",
      title: "Appointment booked via WhatsApp",
      message: `${patientName} booked ${selectedDate} ${chosenSlot.startTime}-${chosenSlot.endTime} with ${doctorName}.`,
      appointmentId: appointment._id,
      isRead: false,
    });

    await resetSession(from);
    return twimlMessage(
      [
        "Your appointment is booked successfully.",
        `Doctor: ${doctor?.name || "Doctor"}`,
        `Date: ${selectedDate}`,
        `Time: ${chosenSlot.startTime} - ${chosenSlot.endTime}`,
        `Reason: ${reason}`,
      ].join("\n"),
    );
  }

  await resetSession(from);
  return twimlMessage("Session reset. Send BOOK APPOINTMENT to start again.");
}
