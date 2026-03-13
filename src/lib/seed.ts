import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/models/User";

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

export async function ensureSeedUsers() {
  await connectToDatabase();

  const clinicId = "demo-clinic";
  const clinicName = "Demo Clinic";

  const doctorEmail = clean(process.env.SEED_DOCTOR_EMAIL);
  const doctorPassword = clean(process.env.SEED_DOCTOR_PASSWORD);
  const doctorName = clean(process.env.SEED_DOCTOR_NAME) || "Dr. Clinic";

  const receptionistEmail = clean(process.env.SEED_RECEPTIONIST_EMAIL);
  const receptionistPassword = clean(process.env.SEED_RECEPTIONIST_PASSWORD);
  const receptionistName = clean(process.env.SEED_RECEPTIONIST_NAME) || "Reception Desk";

  if (!doctorEmail || !doctorPassword || !receptionistEmail || !receptionistPassword) {
    return;
  }

  const doctorPasswordHash = await bcrypt.hash(doctorPassword, 10);
  const receptionistPasswordHash = await bcrypt.hash(receptionistPassword, 10);

  await UserModel.updateOne(
    { email: doctorEmail.toLowerCase() },
    {
      $set: {
        name: doctorName,
        email: doctorEmail.toLowerCase(),
        passwordHash: doctorPasswordHash,
        role: "DOCTOR",
        clinicId,
        clinicName,
      },
    },
    { upsert: true },
  );

  await UserModel.updateOne(
    { email: receptionistEmail.toLowerCase() },
    {
      $set: {
        name: receptionistName,
        email: receptionistEmail.toLowerCase(),
        passwordHash: receptionistPasswordHash,
        role: "RECEPTIONIST",
        clinicId,
        clinicName,
      },
    },
    { upsert: true },
  );

}
