import { connectToDatabase } from "@/lib/db";
import { AppointmentModel } from "@/models/Appointment";

type AppointmentFeedbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

export default async function AppointmentFeedbackPage({ searchParams }: AppointmentFeedbackPageProps) {
  const params = await searchParams;
  const token = readValue(params.token);
  const status = readValue(params.status);

  if (!token) {
    return (
      <div className="min-h-screen bg-[var(--bg)] px-4 py-12">
        <div className="mx-auto max-w-xl border-2 border-black bg-white p-6 text-center shadow-[6px_6px_0_0_#000]">
          <h1 className="text-2xl font-black">Feedback</h1>
          <p className="mt-3 text-sm">Invalid feedback link.</p>
        </div>
      </div>
    );
  }

  await connectToDatabase();
  const appointment = await AppointmentModel.findOne({
    patientCancelToken: token,
    status: "COMPLETED",
  })
    .populate("doctorId")
    .populate("patientId")
    .lean();

  if (!appointment) {
    return (
      <div className="min-h-screen bg-[var(--bg)] px-4 py-12">
        <div className="mx-auto max-w-xl border-2 border-black bg-white p-6 text-center shadow-[6px_6px_0_0_#000]">
          <h1 className="text-2xl font-black">Feedback</h1>
          <p className="mt-3 text-sm">This feedback link is invalid.</p>
        </div>
      </div>
    );
  }

  const alreadySubmitted = !!appointment.feedbackSubmittedAt || status === "already-submitted";
  const submitted = status === "submitted";

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-12">
      <div className="mx-auto max-w-2xl border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]">
        <h1 className="text-2xl font-black">Share Your Feedback</h1>
        <p className="mt-2 text-sm">
          {appointment.patientId?.fullName}, how was your appointment with Dr. {appointment.doctorId?.name}?
        </p>

        <div className="mt-3 border-2 border-black bg-[var(--panel)] p-3 text-sm">
          <p><strong>Date:</strong> {appointment.appointmentDate}</p>
          <p><strong>Time:</strong> {appointment.startTime} - {appointment.endTime}</p>
        </div>

        {submitted ? (
          <p className="mt-4 border-2 border-black bg-[#e8f8e8] p-3 text-sm font-semibold">
            Thank you. Your feedback has been submitted.
          </p>
        ) : null}

        {alreadySubmitted ? (
          <p className="mt-4 border-2 border-black bg-[#fff4d6] p-3 text-sm font-semibold">
            Feedback form already submitted.
          </p>
        ) : (
          <form action="/api/appointments/feedback" method="POST" className="mt-4 space-y-3">
            <input type="hidden" name="token" value={token} />

            <div>
              <p className="mb-2 text-sm font-bold">Rating</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <label key={value} className="flex cursor-pointer items-center gap-1 border-2 border-black bg-white px-3 py-2 text-sm font-semibold">
                    <input type="radio" name="rating" value={String(value)} defaultChecked={value === 5} />
                    <span>{"★".repeat(value)}</span>
                  </label>
                ))}
              </div>
            </div>

            <textarea
              name="comment"
              placeholder="Write your feedback (optional)"
              className="w-full border-2 border-black px-3 py-2"
              rows={4}
            />

            <button className="w-full border-2 border-black bg-black px-3 py-2 font-semibold text-white shadow-[3px_3px_0_0_#000]">
              Submit Feedback
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
