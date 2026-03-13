import { Schema, model, models, Types, type InferSchemaType } from "mongoose";

const doctorAvailabilitySchema = new Schema(
  {
    clinicId: { type: String, index: true },
    doctorId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      required: true,
      index: true,
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    specificDate: { type: String, default: null, index: true },
    isBlocked: { type: Boolean, default: false, index: true },
    label: { type: String, default: "" },
  },
  { timestamps: true },
);

doctorAvailabilitySchema.index({ doctorId: 1, dayOfWeek: 1, specificDate: 1, isBlocked: 1 });

export type DoctorAvailabilityDocument = InferSchemaType<typeof doctorAvailabilitySchema> & { _id: string };

export const DoctorAvailabilityModel = models.DoctorAvailability ?? model("DoctorAvailability", doctorAvailabilitySchema);
