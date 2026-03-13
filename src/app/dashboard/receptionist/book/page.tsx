import { format } from "date-fns";
import { connectToDatabase } from "@/lib/db";
import { getAvailableSlots } from "@/lib/appointments";
import { getDoctors, getPatients } from "@/lib/queries";
import { requireRole } from "@/lib/server-auth";
import { createAppointmentAction } from "@/app/dashboard/receptionist/actions";

type ReceptionBookPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

export default async function ReceptionBookPage({ searchParams }: ReceptionBookPageProps) {
  const session = await requireRole("RECEPTIONIST");
  const params = await searchParams;

  const slotMinutes = Number(process.env.CLINIC_SLOT_MINUTES ?? 30);
  const selectedDoctorForSlots = readValue(params.slotDoctorId);
  const selectedDateForSlots = readValue(params.slotDate) || format(new Date(), "yyyy-MM-dd");

  let dbUnavailable = false;
  let doctors: Array<{ _id: string; name: string }> = [];
  let patients: Array<{ _id: string; fullName: string; phone: string }> = [];
  let availableSlots: Array<{ startTime: string; endTime: string }> = [];

  try {
    await connectToDatabase();
    [doctors, patients] = await Promise.all([
      getDoctors(session.user.clinicId) as Promise<Array<{ _id: string; name: string }>>,
      getPatients("", session.user.clinicId) as Promise<Array<{ _id: string; fullName: string; phone: string }>>,
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
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
        <h2 className="text-lg font-black">Load Available Slots</h2>
        <form className="mt-3 grid gap-2" method="GET">
          <select name="slotDoctorId" defaultValue={selectedDoctorForSlots} className="border-2 border-black px-3 py-2">
            <option value="">Select doctor for slots</option>
            {doctors.map((doctor) => (
              <option key={String(doctor._id)} value={String(doctor._id)}>
                {doctor.name}
              </option>
            ))}
          </select>
          <input type="date" name="slotDate" defaultValue={selectedDateForSlots} className="border-2 border-black px-3 py-2" />
          <button className="border-2 border-black bg-[var(--panel)] px-3 py-2 font-semibold shadow-[3px_3px_0_0_#000]">Load Slots</button>
        </form>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {availableSlots.length === 0 ? <p className="col-span-2 text-sm">No slots loaded.</p> : null}
          {availableSlots.map((slot) => (
            <div key={`${slot.startTime}-${slot.endTime}`} className="border-2 border-black bg-[var(--panel)] px-2 py-1 text-xs font-semibold">
              {slot.startTime} - {slot.endTime}
            </div>
          ))}
        </div>
      </div>

      <div className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
        <h2 className="text-lg font-black">Book Appointment</h2>
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
          <button disabled={dbUnavailable} className="w-full border-2 border-black bg-black px-3 py-2 font-semibold text-white shadow-[3px_3px_0_0_#000] disabled:opacity-50">Create Appointment</button>
        </form>
      </div>
    </div>
  );
}
