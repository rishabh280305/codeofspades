import { format } from "date-fns";
import { connectToDatabase } from "@/lib/db";
import { getAppointmentsByDate } from "@/lib/queries";
import { requireRole } from "@/lib/server-auth";
import {
  blockTimeSlotAction,
  completeAppointmentAction,
} from "@/app/dashboard/doctor/actions";
import { ScheduleAiSummary } from "@/components/doctor/ScheduleAiSummary";
import { PatientFilesPanel } from "@/components/doctor/PatientFilesPanel";
import { AiSummaryButton } from "@/components/doctor/AiSummaryButton";

type DoctorPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

export default async function DoctorDashboardPage({ searchParams }: DoctorPageProps) {
  const session = await requireRole("DOCTOR");

  const params = await searchParams;
  const dateKey = readValue(params.date) || format(new Date(), "yyyy-MM-dd");

  let dbUnavailable = false;
  let appointments: Array<Record<string, any>> = [];

  try {
    await connectToDatabase();
    appointments = (await getAppointmentsByDate(dateKey, session.user.id, session.user.clinicId)) as Array<Record<string, any>>;
  } catch {
    dbUnavailable = true;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <section className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
        {dbUnavailable ? (
          <div className="mb-3 border-2 border-black bg-yellow-100 p-3 text-sm font-semibold">
            Database is temporarily unreachable. You are in demo read-only mode.
          </div>
        ) : null}

        {!dbUnavailable && <ScheduleAiSummary date={dateKey} />}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black">Today&apos;s Schedule</h2>
          <form method="GET" className="flex gap-2">
            <input type="date" name="date" defaultValue={dateKey} className="border-2 border-black px-3 py-2" />
            <button className="border-2 border-black bg-[var(--panel)] px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_0_#000]">
              Go
            </button>
          </form>
        </div>

        <div className="space-y-3">
          {appointments.length === 0 ? <p className="text-sm">No appointments for this day.</p> : null}
          {appointments.map((appointment) => {
            const isCancelled = appointment.status === "CANCELLED";

            return (
            <article
              key={String(appointment._id)}
              className={`border-2 border-black p-3 ${isCancelled ? "bg-red-100" : "bg-[var(--panel)]"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">
                  {appointment.startTime} - {appointment.endTime} | {appointment.patientId?.fullName}
                </p>
                <span className={`border border-black px-2 py-1 text-xs font-semibold ${isCancelled ? "bg-red-200 text-red-800" : "bg-white"}`}>
                  {appointment.status}
                </span>
              </div>

              {isCancelled ? (
                <div className="mt-3 border-2 border-red-300 bg-red-50 p-2 text-sm font-semibold text-red-700">
                  This appointment is cancelled. Actions are disabled.
                </div>
              ) : (
              <details className="mt-3 border-2 border-black bg-white">
                <summary className="cursor-pointer px-3 py-2 text-sm font-bold hover:bg-gray-50">
                  Open Appointment
                </summary>

                <div className="border-t-2 border-black p-3">
                  <p className="text-sm">Phone: {appointment.patientId?.phone || "N/A"}</p>
                  <p className="text-sm">Reason: {appointment.reason || "General consultation"}</p>
                  {appointment.notes ? <p className="text-sm">Notes: {appointment.notes}</p> : null}

                  <div className="mt-3">
                    <form action={completeAppointmentAction} className="space-y-2">
                      <input type="hidden" name="appointmentId" value={String(appointment._id)} />
                      <textarea name="notes" placeholder="Visit notes / prescription" className="w-full border-2 border-black bg-white px-3 py-2" />
                      <button disabled={dbUnavailable} className="w-full border-2 border-black bg-black px-3 py-2 font-semibold text-white disabled:opacity-50">
                        Mark Completed
                      </button>
                    </form>
                  </div>

                  {appointment.patientId?._id && (
                    <>
                      <PatientFilesPanel patientId={String(appointment.patientId._id)} />
                      <AiSummaryButton
                        patientId={String(appointment.patientId._id)}
                        patientName={appointment.patientId?.fullName ?? "Patient"}
                      />
                    </>
                  )}
                </div>
              </details>
              )}
            </article>
          )})}
        </div>
      </section>

      <section className="space-y-4">
        <div className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
          <h3 className="text-lg font-black">Block Time Slot</h3>
          <form action={blockTimeSlotAction} className="mt-3 space-y-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Specific Date (optional)</span>
              <input type="date" name="specificDate" className="w-full border-2 border-black px-3 py-2" />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-bold">Day of Week</span>
              <select name="dayOfWeek" defaultValue={new Date().getDay()} className="w-full border-2 border-black px-3 py-2">
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <input type="time" name="startTime" required className="w-full border-2 border-black px-3 py-2" />
              <input type="time" name="endTime" required className="w-full border-2 border-black px-3 py-2" />
            </div>

            <input name="label" placeholder="Reason (Lunch, Procedure, etc.)" className="w-full border-2 border-black px-3 py-2" />

            <button disabled={dbUnavailable} className="w-full border-2 border-black bg-black px-3 py-2 font-semibold text-white shadow-[3px_3px_0_0_#000] disabled:opacity-50">
              Block Slot
            </button>
          </form>
        </div>

      </section>
    </div>
  );
}
