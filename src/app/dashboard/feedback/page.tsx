import { connectToDatabase } from "@/lib/db";
import { requireSession } from "@/lib/server-auth";
import { AppointmentModel } from "@/models/Appointment";

function stars(count: number) {
  return "★".repeat(count) + "☆".repeat(Math.max(0, 5 - count));
}

export default async function FeedbackDashboardPage() {
  const session = await requireSession();
  await connectToDatabase();

  const feedbackItems = (await AppointmentModel.find({
    clinicId: session.user.clinicId,
    feedbackSubmittedAt: { $exists: true },
  })
    .populate("patientId")
    .populate("doctorId")
    .sort({ feedbackSubmittedAt: -1 })
    .limit(200)
    .lean()) as Array<Record<string, any>>;

  const ratings = feedbackItems
    .map((item) => Number(item.feedbackRating || 0))
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);

  const average = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "0.0";

  return (
    <section className="space-y-4">
      <div className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
        <h2 className="text-lg font-black">Patient Feedback</h2>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="border-2 border-black bg-[var(--panel)] px-3 py-1 font-bold">Average Rating: {average} / 5</span>
          <span className="border-2 border-black bg-[var(--panel)] px-3 py-1 font-bold">Total Responses: {ratings.length}</span>
        </div>
      </div>

      <div className="space-y-3">
        {feedbackItems.length === 0 ? <p className="text-sm">No feedback received yet.</p> : null}
        {feedbackItems.map((item) => {
          const rating = Number(item.feedbackRating || 0);
          return (
            <article key={String(item._id)} className="border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{item.patientId?.fullName || "Patient"} • Dr. {item.doctorId?.name || "Doctor"}</p>
                <span className="border border-black bg-[#fff4d6] px-2 py-1 text-sm font-bold">{stars(Math.max(1, Math.min(5, rating)))}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Visit: {item.appointmentDate} {item.startTime}-{item.endTime}
              </p>
              <p className="mt-2 text-sm">{item.feedbackComment?.trim() || "No written comment."}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
