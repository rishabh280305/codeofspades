"use client";

import { useEffect, useMemo, useState } from "react";
import { createAppointmentAction } from "@/app/dashboard/receptionist/actions";
import { AddPatientInline } from "./AddPatientInline";

type DoctorOption = { _id: string; name: string };
type PatientOption = { _id: string; fullName: string; phone: string };
type SlotOption = { startTime: string; endTime: string };

type BookAppointmentFormProps = {
  doctors: DoctorOption[];
  patients: PatientOption[];
  initialDoctorId: string;
  initialDate: string;
  initialSlots: SlotOption[];
  slotMinutes: number;
  dbUnavailable: boolean;
};

export function BookAppointmentForm({
  doctors,
  patients,
  initialDoctorId,
  initialDate,
  initialSlots,
  slotMinutes,
  dbUnavailable,
}: BookAppointmentFormProps) {
  const [doctorId, setDoctorId] = useState(initialDoctorId);
  const [appointmentDate, setAppointmentDate] = useState(initialDate);
  const [slots, setSlots] = useState<SlotOption[]>(initialSlots);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadSlots() {
      if (!doctorId || !appointmentDate) {
        setSlots([]);
        setSelectedStartTime("");
        return;
      }

      setSlotsLoading(true);
      setSlotsError(null);

      try {
        const query = new URLSearchParams({
          doctorId,
          appointmentDate,
          slotMinutes: String(slotMinutes),
        });
        const response = await fetch(`/api/appointments/slots?${query.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Could not load slots.");
        }

        const payload = (await response.json()) as { slots?: SlotOption[] };
        if (isCancelled) {
          return;
        }

        const nextSlots = Array.isArray(payload.slots) ? payload.slots : [];
        setSlots(nextSlots);
        setSelectedStartTime((current) =>
          nextSlots.some((slot) => slot.startTime === current) ? current : "",
        );
      } catch {
        if (!isCancelled) {
          setSlots([]);
          setSelectedStartTime("");
          setSlotsError("Unable to load slots for this doctor and date.");
        }
      } finally {
        if (!isCancelled) {
          setSlotsLoading(false);
        }
      }
    }

    void loadSlots();

    return () => {
      isCancelled = true;
    };
  }, [doctorId, appointmentDate, slotMinutes]);

  const showNoSlots = useMemo(() => {
    return !!doctorId && !!appointmentDate && !slotsLoading && !slotsError && slots.length === 0;
  }, [doctorId, appointmentDate, slotsLoading, slotsError, slots.length]);

  return (
    <div className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
      <h2 className="text-lg font-black">Book Appointment</h2>
      <form action={createAppointmentAction} className="mt-3 space-y-2">
        <input type="hidden" name="slotMinutes" value={String(slotMinutes)} />

        <div>
          <select name="patientId" required className="w-full border-2 border-black px-3 py-2">
            <option value="">Select patient</option>
            {patients.map((patient) => (
              <option key={String(patient._id)} value={String(patient._id)}>
                {patient.fullName} | {patient.phone}
              </option>
            ))}
          </select>
          <AddPatientInline />
        </div>

        <select
          name="doctorId"
          required
          value={doctorId}
          onChange={(event) => setDoctorId(event.target.value)}
          className="w-full border-2 border-black px-3 py-2"
        >
          <option value="">Select doctor</option>
          {doctors.map((doctor) => (
            <option key={String(doctor._id)} value={String(doctor._id)}>
              {doctor.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          name="appointmentDate"
          required
          value={appointmentDate}
          onChange={(event) => setAppointmentDate(event.target.value)}
          className="w-full border-2 border-black px-3 py-2"
        />

        <select
          name="startTime"
          required
          value={selectedStartTime}
          onChange={(event) => setSelectedStartTime(event.target.value)}
          className="w-full border-2 border-black px-3 py-2"
        >
          <option value="">Select available slot</option>
          {slots.map((slot) => (
            <option key={`${slot.startTime}-${slot.endTime}`} value={slot.startTime}>
              {slot.startTime} - {slot.endTime}
            </option>
          ))}
        </select>

        {slotsLoading ? <p className="text-xs font-semibold">Loading slots...</p> : null}
        {slotsError ? <p className="text-xs font-semibold text-red-700">{slotsError}</p> : null}
        {showNoSlots ? <p className="text-xs font-semibold">No slots available for selected doctor/date.</p> : null}

        <textarea name="reason" placeholder="Reason for visit" className="w-full border-2 border-black px-3 py-2" />
        <button
          disabled={dbUnavailable || slotsLoading}
          className="w-full border-2 border-black bg-black px-3 py-2 font-semibold text-white shadow-[3px_3px_0_0_#000] disabled:opacity-50"
        >
          Create Appointment
        </button>
      </form>
    </div>
  );
}