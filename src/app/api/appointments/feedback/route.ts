import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getAppBaseUrl } from "@/lib/app-url";
import { AppointmentModel } from "@/models/Appointment";

export async function POST(request: Request) {
  const appUrl = getAppBaseUrl();

  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim();
  const rating = Number(String(formData.get("rating") ?? "").trim());
  const comment = String(formData.get("comment") ?? "").trim();

  if (!token || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.redirect(`${appUrl}/appointment-feedback?token=${encodeURIComponent(token)}&status=invalid`);
  }

  await connectToDatabase();

  const appointment = await AppointmentModel.findOne({
    patientCancelToken: token,
    status: "COMPLETED",
  });

  if (!appointment) {
    return NextResponse.redirect(`${appUrl}/appointment-feedback?token=${encodeURIComponent(token)}&status=invalid`);
  }

  if (appointment.feedbackSubmittedAt) {
    return NextResponse.redirect(
      `${appUrl}/appointment-feedback?token=${encodeURIComponent(token)}&status=already-submitted`,
    );
  }

  appointment.feedbackRating = rating;
  appointment.feedbackComment = comment;
  appointment.feedbackSubmittedAt = new Date();
  await appointment.save();

  return NextResponse.redirect(`${appUrl}/appointment-feedback?token=${encodeURIComponent(token)}&status=submitted`);
}
