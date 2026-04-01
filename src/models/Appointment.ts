import { Schema, model, models, Types, type InferSchemaType } from "mongoose";

export const APPOINTMENT_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
export const PAYMENT_STATUSES = ["UNPAID", "PENDING_ONLINE", "PAID_CASH", "PAID_ONLINE"] as const;

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
    patientCancelToken: { type: String, index: true },
    reminderSentAt: { type: Date },
    rescheduleRequestStatus: {
      type: String,
      enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
      default: "NONE",
      index: true,
    },
    requestedAppointmentDate: { type: String },
    requestedStartTime: { type: String },
    requestedEndTime: { type: String },
    requestedAt: { type: Date },
    rescheduleApprovedAt: { type: Date },
    feedbackRating: { type: Number, min: 1, max: 5 },
    feedbackComment: { type: String, default: "" },
    feedbackSubmittedAt: { type: Date },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "UNPAID", index: true },
    paymentMethod: { type: String, enum: ["CASH", "STRIPE"] },
    paymentAmount: { type: Number, min: 0, default: 0 },
    paymentCurrency: { type: String, default: "INR" },
    paymentRequestedAt: { type: Date },
    paymentPaidAt: { type: Date },
    paymentNotes: { type: String, default: "" },
    stripeCheckoutSessionId: { type: String, index: true },
    stripePaymentUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

appointmentSchema.index({ doctorId: 1, appointmentDate: 1, startAt: 1 });

export type AppointmentDocument = InferSchemaType<typeof appointmentSchema> & { _id: string };

export const AppointmentModel = models.Appointment ?? model("Appointment", appointmentSchema);
