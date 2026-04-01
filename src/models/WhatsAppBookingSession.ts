import { Schema, model, models, type InferSchemaType } from "mongoose";

const slotOptionSchema = new Schema(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false },
);

const whatsAppBookingSessionSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    clinicId: { type: String, index: true },
    patientId: { type: String, index: true },
    state: {
      type: String,
      enum: ["IDLE", "WAITING_DOCTOR", "WAITING_DATE", "WAITING_SLOT", "WAITING_REASON"],
      default: "IDLE",
      index: true,
    },
    selectedDoctorId: { type: String },
    selectedDate: { type: String },
    selectedStartTime: { type: String },
    slotOptions: { type: [slotOptionSchema], default: [] },
    expiresAt: { type: Date, index: true },
  },
  { timestamps: true },
);

whatsAppBookingSessionSchema.index({ phone: 1 }, { unique: true });

export type WhatsAppBookingSessionDocument = InferSchemaType<typeof whatsAppBookingSessionSchema> & { _id: string };

export const WhatsAppBookingSessionModel =
  models.WhatsAppBookingSession ?? model("WhatsAppBookingSession", whatsAppBookingSessionSchema);
