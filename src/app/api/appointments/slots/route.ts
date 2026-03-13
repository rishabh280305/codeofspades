import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { getAvailableSlots } from "@/lib/appointments";

const querySchema = z.object({
  doctorId: z.string().min(1),
  appointmentDate: z.string().min(1),
  slotMinutes: z.coerce.number().int().min(15).max(120).default(30),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const parsed = querySchema.safeParse({
    doctorId: searchParams.get("doctorId"),
    appointmentDate: searchParams.get("appointmentDate"),
    slotMinutes: searchParams.get("slotMinutes") ?? 30,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  await connectToDatabase();

  const slots = await getAvailableSlots({
    doctorId: parsed.data.doctorId,
    appointmentDate: parsed.data.appointmentDate,
    slotMinutes: parsed.data.slotMinutes,
    bufferMinutes: Number(process.env.CLINIC_SLOT_BUFFER_MINUTES ?? 0),
  });

  return NextResponse.json({
    slots: slots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
    })),
  });
}
