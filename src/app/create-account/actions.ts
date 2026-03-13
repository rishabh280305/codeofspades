"use server";

import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { redirect } from "next/navigation";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/models/User";

const schema = z.object({
  clinicName: z.string().trim().min(2),
  doctorName: z.string().trim().min(2),
  doctorEmail: z.string().trim().email(),
  doctorPassword: z.string().trim().min(6),
  receptionistName: z.string().trim().min(2),
  receptionistEmail: z.string().trim().email(),
  receptionistPassword: z.string().trim().min(6),
});

export async function createLinkedAccountsAction(formData: FormData) {
  const parsed = schema.safeParse({
    clinicName: formData.get("clinicName"),
    doctorName: formData.get("doctorName"),
    doctorEmail: formData.get("doctorEmail"),
    doctorPassword: formData.get("doctorPassword"),
    receptionistName: formData.get("receptionistName"),
    receptionistEmail: formData.get("receptionistEmail"),
    receptionistPassword: formData.get("receptionistPassword"),
  });

  if (!parsed.success) {
    redirect("/create-account?error=invalid");
  }

  await connectToDatabase();

  const doctorEmail = parsed.data.doctorEmail.toLowerCase();
  const receptionistEmail = parsed.data.receptionistEmail.toLowerCase();

  if (doctorEmail === receptionistEmail) {
    redirect("/create-account?error=duplicate-email");
  }

  const existing = await UserModel.findOne({
    email: { $in: [doctorEmail, receptionistEmail] },
  }).lean();

  if (existing) {
    redirect("/create-account?error=exists");
  }

  const clinicId = new Types.ObjectId().toString();
  const [doctorPasswordHash, receptionistPasswordHash] = await Promise.all([
    bcrypt.hash(parsed.data.doctorPassword, 10),
    bcrypt.hash(parsed.data.receptionistPassword, 10),
  ]);

  await UserModel.insertMany([
    {
      name: parsed.data.doctorName,
      email: doctorEmail,
      passwordHash: doctorPasswordHash,
      role: "DOCTOR",
      clinicId,
      clinicName: parsed.data.clinicName,
    },
    {
      name: parsed.data.receptionistName,
      email: receptionistEmail,
      passwordHash: receptionistPasswordHash,
      role: "RECEPTIONIST",
      clinicId,
      clinicName: parsed.data.clinicName,
    },
  ]);

  redirect("/?created=1");
}
