import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { AppointmentModel } from "@/models/Appointment";
import { PatientModel } from "@/models/Patient";
import { UserModel } from "@/models/User";

export async function getDoctors(clinicId?: string) {
  await connectToDatabase();
  const query: Record<string, unknown> = { role: "DOCTOR" };
  if (clinicId) {
    query.clinicId = clinicId;
  }
  return UserModel.find(query).sort({ name: 1 }).lean();
}

export async function getPatients(search = "", clinicId?: string) {
  await connectToDatabase();
  const query: Record<string, unknown> = search.trim()
    ? {
        $or: [
          { fullName: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  if (clinicId) {
    query.clinicId = clinicId;
  }

  return PatientModel.find(query).sort({ createdAt: -1 }).limit(100).lean();
}

export async function getAppointmentsByDate(dateKey: string, doctorId?: string, clinicId?: string) {
  await connectToDatabase();

  const query: Record<string, unknown> = {
    appointmentDate: dateKey,
    status: { $ne: "CANCELLED" },
  };
  if (doctorId) {
    query.doctorId = new Types.ObjectId(doctorId);
  }
  if (clinicId) {
    query.clinicId = clinicId;
  }

  return AppointmentModel.find(query)
    .populate("patientId")
    .populate("doctorId")
    .sort({ startAt: 1 })
    .lean();
}

export async function getCancelledAppointmentsByDate(dateKey: string, doctorId?: string, clinicId?: string) {
  await connectToDatabase();

  const query: Record<string, unknown> = {
    appointmentDate: dateKey,
    status: "CANCELLED",
  };
  if (doctorId) {
    query.doctorId = new Types.ObjectId(doctorId);
  }
  if (clinicId) {
    query.clinicId = clinicId;
  }

  return AppointmentModel.find(query)
    .populate("patientId")
    .populate("doctorId")
    .sort({ startAt: 1 })
    .lean();
}

export async function getPatientAppointmentHistory(params: {
  patientId: string;
  clinicId: string;
  doctorId?: string;
}) {
  await connectToDatabase();

  const query: Record<string, unknown> = {
    patientId: new Types.ObjectId(params.patientId),
    clinicId: params.clinicId,
  };

  if (params.doctorId) {
    query.doctorId = new Types.ObjectId(params.doctorId);
  }

  return AppointmentModel.find(query)
    .populate("patientId")
    .populate("doctorId")
    .sort({ startAt: -1 })
    .limit(200)
    .lean();
}
