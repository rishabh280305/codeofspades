import { format } from "date-fns";
import { connectToDatabase } from "@/lib/db";
import { getCancelledAppointmentsByDate } from "@/lib/queries";
import { requireRole } from "@/lib/server-auth";

type DoctorCancelledPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

export default async function DoctorCancelledPage({ searchParams }: DoctorCancelledPageProps) {
  const session = await requireRole("DOCTOR");

  const params = await searchParams;
  const dateKey = readValue(params.date) || format(new Date(), "yyyy-MM-dd");

  let dbUnavailable = false;
  let appointments: Array<Record<string, any>> = [];

  try {
    await connectToDatabase();
    appointments = (await getCancelledAppointmentsByDate(
      dateKey,
      session.user.id,
      session.user.clinicId,
    )) as Array<Record<string, any>>;
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
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-black">Cancelled Appointments</h2>
          <form method="GET">
            <input type="date" name="date" defaultValue={dateKey} className="border-2 border-black px-3 py-2" />
          </form>
        </div>

        <div className="space-y-3">
          {appointments.length === 0 ? <p className="text-sm">No cancelled appointments found.</p> : null}
          {appointments.map((appointment) => (
            <article key={String(appointment._id)} className="border-2 border-black bg-red-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{appointment.startTime} - {appointment.endTime} | {appointment.patientId?.fullName}</p>
                <span className="border border-black bg-red-200 px-2 py-1 text-xs font-semibold text-red-800">CANCELLED</span>
              </div>
              <p className="text-sm">Phone: {appointment.patientId?.phone || "N/A"}</p>
              <p className="text-sm">Reason: {appointment.reason || "General consultation"}</p>
              <p className="text-sm">Cancellation Note: {appointment.cancellationReason || "No reason provided"}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
