import { addMinutes, format } from "date-fns";
import { Types } from "mongoose";
import { AppointmentModel } from "@/models/Appointment";
import { DoctorAvailabilityModel } from "@/models/DoctorAvailability";
import { combineDateAndTime, createTimeSlots } from "@/lib/time";

const ACTIVE_APPOINTMENT_STATUSES = ["SCHEDULED", "COMPLETED"];

export async function hasDoctorConflict(params: {
  doctorId: string;
  startAt: Date;
  endAt: Date;
  excludeAppointmentId?: string;
}) {
  const query: Record<string, unknown> = {
    doctorId: new Types.ObjectId(params.doctorId),
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    startAt: { $lt: params.endAt },
    endAt: { $gt: params.startAt },
  };

  if (params.excludeAppointmentId) {
    query._id = { $ne: new Types.ObjectId(params.excludeAppointmentId) };
  }

  const conflictingAppointment = await AppointmentModel.findOne(query).lean();
  if (conflictingAppointment) {
    return true;
  }

  const dateKey = format(params.startAt, "yyyy-MM-dd");
  const dayOfWeek = params.startAt.getDay();

  const blockedSlot = await DoctorAvailabilityModel.findOne({
    doctorId: new Types.ObjectId(params.doctorId),
    isBlocked: true,
    $or: [{ specificDate: dateKey }, { specificDate: null, dayOfWeek }],
  }).lean();

  if (!blockedSlot) {
    return false;
  }

  const blockedStart = combineDateAndTime(dateKey, blockedSlot.startTime);
  const blockedEnd = combineDateAndTime(dateKey, blockedSlot.endTime);

  return blockedStart < params.endAt && blockedEnd > params.startAt;
}

export async function getAvailableSlots(params: {
  doctorId: string;
  appointmentDate: string;
  slotMinutes: number;
  bufferMinutes: number;
}) {
  const date = new Date(`${params.appointmentDate}T00:00:00`);
  const dayOfWeek = date.getDay();

  const availability = await DoctorAvailabilityModel.find({
    doctorId: new Types.ObjectId(params.doctorId),
    isBlocked: false,
    $or: [{ specificDate: params.appointmentDate }, { specificDate: null, dayOfWeek }],
  })
    .sort({ startTime: 1 })
    .lean();

  const blocked = await DoctorAvailabilityModel.find({
    doctorId: new Types.ObjectId(params.doctorId),
    isBlocked: true,
    $or: [{ specificDate: params.appointmentDate }, { specificDate: null, dayOfWeek }],
  }).lean();

  const windows = availability.length > 0 ? availability : [{ startTime: "09:00", endTime: "17:00" }];

  const candidateSlots = windows.flatMap((window) =>
    createTimeSlots(
      params.appointmentDate,
      window.startTime,
      window.endTime,
      params.slotMinutes,
      params.bufferMinutes,
    ),
  );

  const appointments = await AppointmentModel.find({
    doctorId: new Types.ObjectId(params.doctorId),
    appointmentDate: params.appointmentDate,
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
  })
    .select("startAt endAt")
    .lean();

  return candidateSlots.filter((slot) => {
    const inBlockedRange = blocked.some((entry) => {
      const blockStart = combineDateAndTime(params.appointmentDate, entry.startTime);
      const blockEnd = combineDateAndTime(params.appointmentDate, entry.endTime);
      return blockStart < slot.endAt && blockEnd > slot.startAt;
    });

    if (inBlockedRange) {
      return false;
    }

    const inBookedRange = appointments.some((appointment) => {
      return appointment.startAt < slot.endAt && appointment.endAt > slot.startAt;
    });

    return !inBookedRange;
  });
}

export function computeEndTime(startTime: string, slotMinutes: number, dateKey = "2000-01-01") {
  const start = combineDateAndTime(dateKey, startTime);
  const end = addMinutes(start, slotMinutes);
  return format(end, "HH:mm");
}
