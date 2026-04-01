import { format, subMonths } from "date-fns";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { getOpenAIClient } from "@/lib/openai";
import { AppointmentModel } from "@/models/Appointment";

function short(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "DOCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = short(body.message || "");
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  await connectToDatabase();

  const doctorObjectId = new Types.ObjectId(session.user.id);
  const currentMonth = format(new Date(), "yyyy-MM");
  const sixMonthsAgo = format(subMonths(new Date(), 5), "yyyy-MM");

  const [monthly, byHour, byStatus, currentMonthAppointments, uniquePatients] = await Promise.all([
    AppointmentModel.aggregate([
      {
        $match: {
          clinicId: session.user.clinicId,
          doctorId: doctorObjectId,
          appointmentDate: { $gte: `${sixMonthsAgo}-01` },
          status: { $ne: "CANCELLED" },
        },
      },
      {
        $project: {
          month: { $substr: ["$appointmentDate", 0, 7] },
        },
      },
      {
        $group: {
          _id: "$month",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]) as Promise<Array<{ _id: string; count: number }>>,
    AppointmentModel.aggregate([
      {
        $match: {
          clinicId: session.user.clinicId,
          doctorId: doctorObjectId,
          status: { $ne: "CANCELLED" },
        },
      },
      {
        $project: {
          hour: { $substr: ["$startTime", 0, 2] },
        },
      },
      {
        $group: {
          _id: "$hour",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]) as Promise<Array<{ _id: string; count: number }>>,
    AppointmentModel.aggregate([
      {
        $match: {
          clinicId: session.user.clinicId,
          doctorId: doctorObjectId,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]) as Promise<Array<{ _id: string; count: number }>>,
    AppointmentModel.countDocuments({
      clinicId: session.user.clinicId,
      doctorId: doctorObjectId,
      appointmentDate: { $regex: `^${currentMonth}` },
      status: { $ne: "CANCELLED" },
    }),
    AppointmentModel.distinct("patientId", {
      clinicId: session.user.clinicId,
      doctorId: doctorObjectId,
      status: { $in: ["SCHEDULED", "COMPLETED", "NO_SHOW"] },
    }),
  ]);

  const completedCount = byStatus.find((s) => s._id === "COMPLETED")?.count ?? 0;
  const noShowCount = byStatus.find((s) => s._id === "NO_SHOW")?.count ?? 0;
  const scheduledCount = byStatus.find((s) => s._id === "SCHEDULED")?.count ?? 0;
  const cancelledCount = byStatus.find((s) => s._id === "CANCELLED")?.count ?? 0;
  const totalTrackable = completedCount + noShowCount + scheduledCount;
  const completionRate = totalTrackable > 0 ? Math.round((completedCount / totalTrackable) * 100) : 0;

  const leastUsed = [...byHour].sort((a, b) => a.count - b.count)[0] ?? null;
  const busiest = [...byHour].sort((a, b) => b.count - a.count)[0] ?? null;

  const q = message.toLowerCase();
  if (/(least|lowest|slowest).*(slot|time|hour)|(slot|time|hour).*(least|lowest|slowest)/.test(q)) {
    if (!leastUsed) {
      return NextResponse.json({ answer: "No slot data yet." });
    }
    return NextResponse.json({ answer: `Least used: ${leastUsed._id}:00 (${leastUsed.count} appointments).` });
  }

  if (/(most|busiest|peak).*(slot|time|hour)|(slot|time|hour).*(most|busiest|peak)/.test(q)) {
    if (!busiest) {
      return NextResponse.json({ answer: "No slot data yet." });
    }
    return NextResponse.json({ answer: `Busiest: ${busiest._id}:00 (${busiest.count} appointments).` });
  }

  if (/completion|complete rate|completed/.test(q)) {
    return NextResponse.json({ answer: `Completion rate: ${completionRate}% (${completedCount}/${totalTrackable || 0}).` });
  }

  if (/no.?show/.test(q)) {
    return NextResponse.json({ answer: `No-shows: ${noShowCount}.` });
  }

  if (/cancel/.test(q)) {
    return NextResponse.json({ answer: `Cancelled appointments: ${cancelledCount}.` });
  }

  const latestMonth = monthly[monthly.length - 1];
  const prevMonth = monthly[monthly.length - 2];

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a clinic growth copilot for a doctor. Use only provided numbers. Keep reply very short: max 2 lines, max 30 words, no markdown.",
        },
        {
          role: "user",
          content: `Question: ${message}\n\nData:\nCurrent month appointments: ${currentMonthAppointments}\nUnique patients: ${uniquePatients.length}\nCompletion rate: ${completionRate}%\nNo-shows: ${noShowCount}\nCancelled: ${cancelledCount}\nBusiest slot: ${busiest?._id || "N/A"}:00 (${busiest?.count || 0})\nLeast-used slot: ${leastUsed?._id || "N/A"}:00 (${leastUsed?.count || 0})\nLast month visits: ${latestMonth?.count || 0}\nPrevious month visits: ${prevMonth?.count || 0}\n`,
        },
      ],
      temperature: 0.2,
      max_tokens: 90,
    });

    const answer = short(completion.choices[0]?.message?.content || "No insight available yet.");
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ answer: "Try asking about busiest slot, least-used slot, no-shows, or completion rate." });
  }
}
