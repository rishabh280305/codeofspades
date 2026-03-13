import { Schema, model, models, type InferSchemaType } from "mongoose";

const clinicSettingsSchema = new Schema(
  {
    clinicId: { type: String, required: true, unique: true, index: true },
    clinicName: { type: String, default: "Clinic" },
    addressLine1: { type: String, default: "" },
    addressLine2: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    country: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    website: { type: String, default: "" },
    openingTime: { type: String, default: "09:00" },
    closingTime: { type: String, default: "18:00" },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5, 6],
    },
    timezone: { type: String, default: "Asia/Kolkata" },
    cancellationPolicy: { type: String, default: "Please notify us at least 24 hours in advance for cancellations." },
  },
  { timestamps: true },
);

export type ClinicSettingsDocument = InferSchemaType<typeof clinicSettingsSchema> & { _id: string };

export const ClinicSettingsModel = models.ClinicSettings ?? model("ClinicSettings", clinicSettingsSchema);
