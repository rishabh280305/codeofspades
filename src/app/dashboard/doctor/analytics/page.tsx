import { format, subMonths } from "date-fns";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/server-auth";
import { AppointmentModel } from "@/models/Appointment";
import { AnalyticsAiChat } from "@/components/doctor/AnalyticsAiChat";

function BarChart({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number; color?: string }>;
}) {
  const maxValue = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
      <h3 className="text-base font-black">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between text-xs font-semibold">
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
            <div className="h-3 border border-black bg-zinc-100">
              <div
                className="h-full"
                style={{
                  width: `${Math.max(4, (row.value / maxValue) * 100)}%`,
                  background: row.color || "#3b82f6",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DoctorAnalyticsPage() {
  const session = await requireRole("DOCTOR");
  await connectToDatabase();
  const doctorObjectId = new Types.ObjectId(session.user.id);

  const currentMonth = format(new Date(), "yyyy-MM");
  const sixMonthsAgo = format(subMonths(new Date(), 5), "yyyy-MM");

  const monthly = (await AppointmentModel.aggregate([
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
  ])) as Array<{ _id: string; count: number }>;

  const byHour = (await AppointmentModel.aggregate([
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
  ])) as Array<{ _id: string; count: number }>;

  const byStatus = (await AppointmentModel.aggregate([
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
  ])) as Array<{ _id: string; count: number }>;

  const currentMonthAppointments = await AppointmentModel.countDocuments({
    clinicId: session.user.clinicId,
    doctorId: doctorObjectId,
    appointmentDate: { $regex: `^${currentMonth}` },
    status: { $ne: "CANCELLED" },
  });

  const uniquePatients = await AppointmentModel.distinct("patientId", {
    clinicId: session.user.clinicId,
    doctorId: doctorObjectId,
    status: { $in: ["SCHEDULED", "COMPLETED", "NO_SHOW"] },
  });

  const completedCount = byStatus.find((s) => s._id === "COMPLETED")?.count ?? 0;
  const noShowCount = byStatus.find((s) => s._id === "NO_SHOW")?.count ?? 0;
  const scheduledCount = byStatus.find((s) => s._id === "SCHEDULED")?.count ?? 0;
  const totalTrackable = completedCount + noShowCount + scheduledCount;
  const completionRate = totalTrackable > 0 ? Math.round((completedCount / totalTrackable) * 100) : 0;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-4">
        <article className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">This Month</p>
          <p className="mt-1 text-2xl font-black">{currentMonthAppointments}</p>
          <p className="text-xs">Appointments</p>
        </article>
        <article className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Unique Patients</p>
          <p className="mt-1 text-2xl font-black">{uniquePatients.length}</p>
          <p className="text-xs">Under your care</p>
        </article>
        <article className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Completion Rate</p>
          <p className="mt-1 text-2xl font-black">{completionRate}%</p>
          <p className="text-xs">Completed vs trackable</p>
        </article>
        <article className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">No-shows</p>
          <p className="mt-1 text-2xl font-black">{noShowCount}</p>
          <p className="text-xs">Total no-show visits</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <BarChart
          title="Monthly Visits (Last 6 Months)"
          rows={monthly.map((m) => ({ label: m._id, value: m.count, color: "#2563eb" }))}
        />

        <BarChart
          title="Appointments by Time"
          rows={byHour.map((h) => ({ label: `${h._id}:00`, value: h.count, color: "#f59e0b" }))}
        />

        <BarChart
          title="Status Breakdown"
          rows={byStatus.map((s) => ({
            label: s._id,
            value: s.count,
            color:
              s._id === "COMPLETED"
                ? "#16a34a"
                : s._id === "SCHEDULED"
                  ? "#2563eb"
                  : s._id === "NO_SHOW"
                    ? "#dc2626"
                    : "#6b7280",
          }))}
        />
      </section>

      <AnalyticsAiChat />
    </div>
  );
}
