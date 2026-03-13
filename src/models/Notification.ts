import { Schema, model, models, Types, type InferSchemaType } from "mongoose";

const notificationSchema = new Schema(
  {
    clinicId: { type: String, required: true, index: true },
    recipientRole: {
      type: String,
      enum: ["RECEPTIONIST", "DOCTOR"],
      default: "RECEPTIONIST",
      index: true,
    },
    type: { type: String, default: "GENERAL", index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    appointmentId: { type: Types.ObjectId, ref: "Appointment" },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ clinicId: 1, recipientRole: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & { _id: string };

export const NotificationModel = models.Notification ?? model("Notification", notificationSchema);
