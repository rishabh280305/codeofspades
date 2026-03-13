import { connectToDatabase } from "@/lib/db";
import { getPatientAppointmentHistory, getPatients } from "@/lib/queries";
import { requireRole } from "@/lib/server-auth";

type DoctorHistoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

export default async function DoctorHistoryPage({ searchParams }: DoctorHistoryPageProps) {
  const session = await requireRole("DOCTOR");

  const params = await searchParams;
  const patientId = readValue(params.patientId);
  const search = readValue(params.search);

  let dbUnavailable = false;
  let patients: Array<{ _id: string; fullName: string; phone: string }> = [];
  let history: Array<Record<string, any>> = [];

  try {
    await connectToDatabase();
    patients = (await getPatients(search, session.user.clinicId)) as Array<{
      _id: string;
      fullName: string;
      phone: string;
    }>;

    if (patientId) {
      history = (await getPatientAppointmentHistory({
        patientId,
        clinicId: session.user.clinicId,
        doctorId: session.user.id,
      })) as Array<Record<string, any>>;
    }
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
        <h2 className="text-lg font-black">Patient History</h2>
        <form className="mt-3 grid gap-2 md:grid-cols-3" method="GET">
          <input type="text" name="search" defaultValue={search} placeholder="Search patient" className="border-2 border-black px-3 py-2" />
          <select name="patientId" defaultValue={patientId} className="border-2 border-black px-3 py-2">
            <option value="">Select patient</option>
            {patients.map((patient) => (
              <option key={String(patient._id)} value={String(patient._id)}>
                {patient.fullName} | {patient.phone}
              </option>
            ))}
          </select>
          <button className="border-2 border-black bg-[var(--panel)] px-3 py-2 font-semibold shadow-[3px_3px_0_0_#000]">Load History</button>
        </form>

        <div className="mt-4 space-y-3">
          {!patientId ? <p className="text-sm">Select a patient to view appointment history.</p> : null}
          {patientId && history.length === 0 ? <p className="text-sm">No appointment history found.</p> : null}

          {history.map((appointment) => (
            <article key={String(appointment._id)} className="border-2 border-black bg-[var(--panel)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{appointment.appointmentDate} | {appointment.startTime} - {appointment.endTime}</p>
                <span className="border border-black bg-white px-2 py-1 text-xs font-semibold">{appointment.status}</span>
              </div>
              <p className="text-sm">Reason: {appointment.reason || "General consultation"}</p>
              {appointment.notes ? <p className="text-sm">Notes: {appointment.notes}</p> : null}
              {appointment.cancellationReason ? (
                <p className="text-sm">Cancellation Note: {appointment.cancellationReason}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
