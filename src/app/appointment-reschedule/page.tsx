import { format } from "date-fns";
import { connectToDatabase } from "@/lib/db";
import { getAvailableSlots } from "@/lib/appointments";
import { AppointmentModel } from "@/models/Appointment";

type AppointmentReschedulePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

function statusText(status: string) {
  if (status === "requested") {
    return "Your reschedule request has been sent to the clinic.";
  }
  if (status === "slot-missing") {
    return "Selected slot is no longer available. Please choose another slot.";
  }
  if (status === "invalid") {
    return "This reschedule link is invalid.";
  }
  return "";
}

export default async function AppointmentReschedulePage({ searchParams }: AppointmentReschedulePageProps) {
  const params = await searchParams;
  const token = readValue(params.token);
  const selectedDate = readValue(params.date) || format(new Date(), "yyyy-MM-dd");
  const status = readValue(params.status);

  if (!token) {
    return (
      <div className="min-h-screen bg-[var(--bg)] px-4 py-12">
        <div className="mx-auto max-w-xl border-2 border-black bg-white p-6 text-center shadow-[6px_6px_0_0_#000]">
          <h1 className="text-2xl font-black">Reschedule Appointment</h1>
          <p className="mt-3 text-sm">This reschedule link is invalid.</p>
        </div>
      </div>
    );
  }

  await connectToDatabase();
  const appointment = await AppointmentModel.findOne({
    patientCancelToken: token,
    status: "SCHEDULED",
  })
    .populate("doctorId")
    .populate("patientId")
    .lean();

  if (!appointment) {
    return (
      <div className="min-h-screen bg-[var(--bg)] px-4 py-12">
        <div className="mx-auto max-w-xl border-2 border-black bg-white p-6 text-center shadow-[6px_6px_0_0_#000]">
          <h1 className="text-2xl font-black">Reschedule Appointment</h1>
          <p className="mt-3 text-sm">This appointment cannot be rescheduled from this link.</p>
        </div>
      </div>
    );
  }

  const slots = await getAvailableSlots({
    doctorId: String(appointment.doctorId?._id),
    appointmentDate: selectedDate,
    slotMinutes: Number(process.env.CLINIC_SLOT_MINUTES ?? 30),
    bufferMinutes: Number(process.env.CLINIC_SLOT_BUFFER_MINUTES ?? 0),
  });

  const message = statusText(status);

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-12">
      <div className="mx-auto max-w-2xl border-2 border-black bg-white p-6 shadow-[6px_6px_0_0_#000]">
        <h1 className="text-2xl font-black">Request Appointment Reschedule</h1>
        <p className="mt-2 text-sm">
          {appointment.patientId?.fullName}, choose a new available slot for Dr. {appointment.doctorId?.name}.
        </p>

        {message ? (
          <p className="mt-3 border-2 border-black bg-[#e8f8e8] p-2 text-sm font-semibold">{message}</p>
        ) : null}

        <div className="mt-4 border-2 border-black bg-[var(--panel)] p-3 text-sm">
          <p><strong>Current appointment:</strong> {appointment.appointmentDate} | {appointment.startTime} - {appointment.endTime}</p>
          <p><strong>Reason:</strong> {appointment.reason || "General consultation"}</p>
        </div>

        <form method="GET" className="mt-4 flex gap-2">
          <input type="hidden" name="token" value={token} />
          <input type="date" name="date" defaultValue={selectedDate} className="border-2 border-black px-3 py-2" />
          <button className="border-2 border-black bg-[var(--panel)] px-3 py-2 font-semibold shadow-[3px_3px_0_0_#000]">Load Slots</button>
        </form>

        <form action="/api/appointments/reschedule-request" method="POST" className="mt-4 space-y-2">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="appointmentDate" value={selectedDate} />

          <select name="startTime" required className="w-full border-2 border-black px-3 py-2">
            <option value="">Select available slot</option>
            {slots.map((slot) => (
              <option key={`${slot.startTime}-${slot.endTime}`} value={slot.startTime}>
                {slot.startTime} - {slot.endTime}
              </option>
            ))}
          </select>

          <button className="w-full border-2 border-black bg-black px-3 py-2 font-semibold text-white shadow-[3px_3px_0_0_#000]">
            Send Reschedule Request
          </button>
        </form>

        {slots.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No slots available on selected date. Try another date.</p>
        ) : null}
      </div>
    </div>
  );
}
