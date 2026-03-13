import { Schema, model, models, Types, type InferSchemaType } from "mongoose";

export const APPOINTMENT_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

const appointmentSchema = new Schema(
  {
    clinicId: { type: String, index: true },
    patientId: { type: Types.ObjectId, ref: "Patient", required: true, index: true },
    doctorId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    createdById: { type: Types.ObjectId, ref: "User", required: true, index: true },
    appointmentDate: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },
    reason: { type: String, default: "" },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: "SCHEDULED", index: true },
    notes: { type: String, default: "" },
    cancellationReason: { type: String, default: "" },
  },
  { timestamps: true },
);

appointmentSchema.index({ doctorId: 1, appointmentDate: 1, startAt: 1 });

export type AppointmentDocument = InferSchemaType<typeof appointmentSchema> & { _id: string };

export const AppointmentModel = models.Appointment ?? model("Appointment", appointmentSchema);
