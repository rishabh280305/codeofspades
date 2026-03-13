import { Schema, model, models, type InferSchemaType } from "mongoose";

export const USER_ROLES = ["DOCTOR", "RECEPTIONIST"] as const;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true },
    clinicId: { type: String, required: true, index: true },
    clinicName: { type: String, default: "Clinic" },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: string };

export const UserModel = models.User ?? model("User", userSchema);
