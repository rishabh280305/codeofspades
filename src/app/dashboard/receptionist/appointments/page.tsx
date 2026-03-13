import { format } from "date-fns";
import { connectToDatabase } from "@/lib/db";
import { getAppointmentsByDate, getDoctors } from "@/lib/queries";
import { requireRole } from "@/lib/server-auth";
import { cancelAppointmentAction, rescheduleAppointmentAction } from "@/app/dashboard/receptionist/actions";

type ReceptionAppointmentsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

export default async function ReceptionAppointmentsPage({ searchParams }: ReceptionAppointmentsPageProps) {
  const session = await requireRole("RECEPTIONIST");

  const params = await searchParams;
  const dateKey = readValue(params.date) || format(new Date(), "yyyy-MM-dd");
  const doctorIdFilter = readValue(params.doctorId);
  const slotMinutes = Number(process.env.CLINIC_SLOT_MINUTES ?? 30);

  let dbUnavailable = false;
  let doctors: Array<{ _id: string; name: string }> = [];
  let appointments: Array<Record<string, any>> = [];

  try {
    await connectToDatabase();
    [doctors, appointments] = await Promise.all([
      getDoctors(session.user.clinicId) as Promise<Array<{ _id: string; name: string }>>,
      getAppointmentsByDate(dateKey, doctorIdFilter || undefined, session.user.clinicId) as Promise<Array<Record<string, any>>>,
    ]);
  } catch {
    dbUnavailable = true;
  }

  return (
    <section className="space-y-4">
      {dbUnavailable ? (
        <div className="border-2 border-black bg-yellow-100 p-3 text-sm font-semibold">
          Database is temporarily unreachable. You are in demo read-only mode.
        </div>
      ) : null}

      <div className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
        <h2 className="text-lg font-black">Upcoming Appointments</h2>
        <form className="mt-3 grid gap-2 md:grid-cols-3" method="GET">
          <input type="date" name="date" defaultValue={dateKey} className="border-2 border-black px-3 py-2" />
          <select name="doctorId" defaultValue={doctorIdFilter} className="border-2 border-black px-3 py-2">
            <option value="">All doctors</option>
            {doctors.map((doctor) => (
              <option key={String(doctor._id)} value={String(doctor._id)}>
                {doctor.name}
              </option>
            ))}
          </select>
          <button className="border-2 border-black bg-[var(--panel)] px-3 py-2 font-semibold shadow-[3px_3px_0_0_#000]">Apply</button>
        </form>

        <div className="mt-4 space-y-3">
          {appointments.length === 0 ? <p className="text-sm">No appointments found.</p> : null}
          {appointments.map((appointment) => (
            <article key={String(appointment._id)} className="border-2 border-black bg-[var(--panel)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{appointment.startTime} - {appointment.endTime} | {appointment.patientId?.fullName}</p>
                <span className="border border-black bg-white px-2 py-1 text-xs font-semibold">{appointment.status}</span>
              </div>
              <p className="text-sm">Doctor: {appointment.doctorId?.name}</p>
              <p className="text-sm">Reason: {appointment.reason || "General consultation"}</p>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <form action={cancelAppointmentAction} className="space-y-2">
                  <input type="hidden" name="appointmentId" value={String(appointment._id)} />
                  <input name="cancellationReason" placeholder="Cancellation reason" className="w-full border-2 border-black bg-white px-3 py-2" />
                  <button disabled={dbUnavailable} className="w-full border-2 border-black bg-white px-3 py-2 font-semibold disabled:opacity-50">Cancel Appointment</button>
                </form>

                <form action={rescheduleAppointmentAction} className="space-y-2">
                  <input type="hidden" name="appointmentId" value={String(appointment._id)} />
                  <input type="hidden" name="slotMinutes" value={String(slotMinutes)} />
                  <input type="date" name="appointmentDate" required className="w-full border-2 border-black px-3 py-2" />
                  <input type="time" name="startTime" required className="w-full border-2 border-black px-3 py-2" />
                  <button disabled={dbUnavailable} className="w-full border-2 border-black bg-white px-3 py-2 font-semibold disabled:opacity-50">Reschedule</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
