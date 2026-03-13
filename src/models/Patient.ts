import { Schema, model, models, type InferSchemaType } from "mongoose";

const patientSchema = new Schema(
  {
    clinicId: { type: String, index: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    dateOfBirth: { type: Date },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

patientSchema.index({ fullName: "text", phone: "text", email: "text" });

export type PatientDocument = InferSchemaType<typeof patientSchema> & { _id: string };

export const PatientModel = models.Patient ?? model("Patient", patientSchema);
