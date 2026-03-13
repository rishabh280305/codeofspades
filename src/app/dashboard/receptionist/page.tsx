import { format } from "date-fns";
import { connectToDatabase } from "@/lib/db";
import { getAvailableSlots } from "@/lib/appointments";
import { getAppointmentsByDate, getDoctors, getPatients } from "@/lib/queries";
import { requireRole } from "@/lib/server-auth";
import {
  addPatientAction,
  cancelAppointmentAction,
  createAppointmentAction,
  rescheduleAppointmentAction,
} from "@/app/dashboard/receptionist/actions";

type ReceptionistPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

export default async function ReceptionistDashboardPage({ searchParams }: ReceptionistPageProps) {
  const session = await requireRole("RECEPTIONIST");

  const params = await searchParams;

  const dateKey = readValue(params.date) || format(new Date(), "yyyy-MM-dd");
  const doctorIdFilter = readValue(params.doctorId);
  const patientSearch = readValue(params.patientSearch);
  const selectedDoctorForSlots = readValue(params.slotDoctorId) || doctorIdFilter;
  const selectedDateForSlots = readValue(params.slotDate) || dateKey;
  const slotMinutes = Number(process.env.CLINIC_SLOT_MINUTES ?? 30);

  let dbUnavailable = false;
  let doctors: Array<{ _id: string; name: string }> = [];
  let patients: Array<{ _id: string; fullName: string; phone: string }> = [];
  let appointments: Array<Record<string, any>> = [];
  let availableSlots: Array<{ startTime: string; endTime: string }> = [];

  try {
    await connectToDatabase();
    [doctors, patients, appointments] = await Promise.all([
      getDoctors(session.user.clinicId) as Promise<Array<{ _id: string; name: string }>>,
      getPatients(patientSearch, session.user.clinicId) as Promise<Array<{ _id: string; fullName: string; phone: string }>>,
      getAppointmentsByDate(dateKey, doctorIdFilter || undefined, session.user.clinicId) as Promise<Array<Record<string, any>>>,
    ]);

    availableSlots =
      selectedDoctorForSlots && selectedDateForSlots
        ? ((await getAvailableSlots({
            doctorId: selectedDoctorForSlots,
            appointmentDate: selectedDateForSlots,
            slotMinutes,
            bufferMinutes: Number(process.env.CLINIC_SLOT_BUFFER_MINUTES ?? 0),
          })) as Array<{ startTime: string; endTime: string }>)
        : [];
  } catch {
    dbUnavailable = true;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <section className="space-y-4">
        {dbUnavailable ? (
          <div className="border-2 border-black bg-yellow-100 p-3 text-sm font-semibold">
            Database is temporarily unreachable. You are in demo read-only mode.
          </div>
        ) : null}

        <div className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
          <h2 className="text-lg font-black">Upcoming Appointments</h2>
          <form className="mt-3 grid gap-2 md:grid-cols-4" method="GET">
            <input type="date" name="date" defaultValue={dateKey} className="border-2 border-black px-3 py-2" />
            <select name="doctorId" defaultValue={doctorIdFilter} className="border-2 border-black px-3 py-2">
              <option value="">All doctors</option>
              {doctors.map((doctor) => (
                <option key={String(doctor._id)} value={String(doctor._id)}>
                  {doctor.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              name="patientSearch"
              defaultValue={patientSearch}
              placeholder="Search patient"
              className="border-2 border-black px-3 py-2"
            />
            <button className="border-2 border-black bg-[var(--panel)] px-3 py-2 font-semibold shadow-[3px_3px_0_0_#000]">
              Apply Filters
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {appointments.length === 0 ? <p className="text-sm">No appointments found.</p> : null}
            {appointments.map((appointment) => (
              <article key={String(appointment._id)} className="border-2 border-black bg-[var(--panel)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">
                    {appointment.startTime} - {appointment.endTime} | {appointment.patientId?.fullName}
                  </p>
                  <span className="border border-black bg-white px-2 py-1 text-xs font-semibold">
                    {appointment.status}
                  </span>
                </div>
                <p className="text-sm">Doctor: {appointment.doctorId?.name}</p>
                <p className="text-sm">Reason: {appointment.reason || "General consultation"}</p>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <form action={cancelAppointmentAction} className="space-y-2">
                    <input type="hidden" name="appointmentId" value={String(appointment._id)} />
                    <input
                      name="cancellationReason"
                      placeholder="Cancellation reason"
                      className="w-full border-2 border-black bg-white px-3 py-2"
                    />
                    <button className="w-full border-2 border-black bg-white px-3 py-2 font-semibold">
                      Cancel Appointment
                    </button>
                  </form>

                  <form action={rescheduleAppointmentAction} className="space-y-2">
                    <input type="hidden" name="appointmentId" value={String(appointment._id)} />
                    <input type="hidden" name="slotMinutes" value={String(slotMinutes)} />
                    <input type="date" name="appointmentDate" required className="w-full border-2 border-black px-3 py-2" />
                    <input type="time" name="startTime" required className="w-full border-2 border-black px-3 py-2" />
                    <button className="w-full border-2 border-black bg-white px-3 py-2 font-semibold">
                      Reschedule
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
          <h2 className="text-lg font-black">Add Patient</h2>
          <form action={addPatientAction} className="mt-3 space-y-2">
            <input name="fullName" required placeholder="Full name" className="w-full border-2 border-black px-3 py-2" />
            <input name="phone" required placeholder="Phone" className="w-full border-2 border-black px-3 py-2" />
            <input name="email" type="email" required placeholder="Email" className="w-full border-2 border-black px-3 py-2" />
            <textarea name="notes" placeholder="Notes" className="w-full border-2 border-black px-3 py-2" />
            <button disabled={dbUnavailable} className="w-full border-2 border-black bg-black px-3 py-2 font-semibold text-white shadow-[3px_3px_0_0_#000] disabled:opacity-50">
              Save Patient
            </button>
          </form>
        </div>

        <div className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
          <h2 className="text-lg font-black">Book Appointment</h2>
          <form className="mt-3 grid gap-2" method="GET">
            <input type="hidden" name="date" value={dateKey} />
            <input type="hidden" name="doctorId" value={doctorIdFilter} />
            <input type="hidden" name="patientSearch" value={patientSearch} />
            <select name="slotDoctorId" defaultValue={selectedDoctorForSlots} className="border-2 border-black px-3 py-2">
              <option value="">Select doctor for slots</option>
              {doctors.map((doctor) => (
                <option key={String(doctor._id)} value={String(doctor._id)}>
                  {doctor.name}
                </option>
              ))}
            </select>
            <input type="date" name="slotDate" defaultValue={selectedDateForSlots} className="border-2 border-black px-3 py-2" />
            <button className="border-2 border-black bg-[var(--panel)] px-3 py-2 font-semibold shadow-[3px_3px_0_0_#000]">
              Load Available Slots
            </button>
          </form>

          <form action={createAppointmentAction} className="mt-3 space-y-2">
            <input type="hidden" name="slotMinutes" value={String(slotMinutes)} />
            <select name="patientId" required className="w-full border-2 border-black px-3 py-2">
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={String(patient._id)} value={String(patient._id)}>
                  {patient.fullName} | {patient.phone}
                </option>
              ))}
            </select>

            <select name="doctorId" required defaultValue={selectedDoctorForSlots} className="w-full border-2 border-black px-3 py-2">
              <option value="">Select doctor</option>
              {doctors.map((doctor) => (
                <option key={String(doctor._id)} value={String(doctor._id)}>
                  {doctor.name}
                </option>
              ))}
            </select>

            <input type="date" name="appointmentDate" required defaultValue={selectedDateForSlots} className="w-full border-2 border-black px-3 py-2" />

            <select name="startTime" required className="w-full border-2 border-black px-3 py-2">
              <option value="">Select available slot</option>
              {availableSlots.map((slot) => (
                <option key={`${slot.startTime}-${slot.endTime}`} value={slot.startTime}>
                  {slot.startTime} - {slot.endTime}
                </option>
              ))}
            </select>

            <textarea name="reason" placeholder="Reason for visit" className="w-full border-2 border-black px-3 py-2" />
            <button disabled={dbUnavailable} className="w-full border-2 border-black bg-black px-3 py-2 font-semibold text-white shadow-[3px_3px_0_0_#000] disabled:opacity-50">
              Create Appointment
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
