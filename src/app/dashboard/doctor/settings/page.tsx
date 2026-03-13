import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/server-auth";
import { ClinicSettingsModel } from "@/models/ClinicSettings";
import { updateClinicSettingsAction } from "@/app/dashboard/doctor/actions";

export default async function DoctorClinicSettingsPage() {
  const session = await requireRole("DOCTOR");
  await connectToDatabase();

  const settings = await ClinicSettingsModel.findOne({ clinicId: session.user.clinicId }).lean();

  return (
    <div className="mx-auto max-w-4xl border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
      <h2 className="text-xl font-black">Clinic Settings</h2>
      <p className="mt-1 text-sm text-zinc-600">Update clinic identity, hours, and contact details used across patient communication.</p>

      <form action={updateClinicSettingsAction} className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-bold">Clinic Name</span>
          <input name="clinicName" required defaultValue={String(settings?.clinicName || session.user.clinicName || "Clinic")} className="w-full border-2 border-black px-3 py-2" />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-bold">Address Line 1</span>
          <input name="addressLine1" defaultValue={String(settings?.addressLine1 || "")} className="w-full border-2 border-black px-3 py-2" />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-bold">Address Line 2</span>
          <input name="addressLine2" defaultValue={String(settings?.addressLine2 || "")} className="w-full border-2 border-black px-3 py-2" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-bold">City</span>
          <input name="city" defaultValue={String(settings?.city || "")} className="w-full border-2 border-black px-3 py-2" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-bold">State</span>
          <input name="state" defaultValue={String(settings?.state || "")} className="w-full border-2 border-black px-3 py-2" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-bold">Postal Code</span>
          <input name="postalCode" defaultValue={String(settings?.postalCode || "")} className="w-full border-2 border-black px-3 py-2" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-bold">Country</span>
          <input name="country" defaultValue={String(settings?.country || "India")} className="w-full border-2 border-black px-3 py-2" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-bold">Contact Phone</span>
          <input name="contactPhone" defaultValue={String(settings?.contactPhone || "")} className="w-full border-2 border-black px-3 py-2" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-bold">Contact Email</span>
          <input name="contactEmail" type="email" defaultValue={String(settings?.contactEmail || "")} className="w-full border-2 border-black px-3 py-2" />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-bold">Website</span>
          <input name="website" defaultValue={String(settings?.website || "")} className="w-full border-2 border-black px-3 py-2" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-bold">Opening Time</span>
          <input type="time" name="openingTime" required defaultValue={String(settings?.openingTime || "09:00")} className="w-full border-2 border-black px-3 py-2" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-bold">Closing Time</span>
          <input type="time" name="closingTime" required defaultValue={String(settings?.closingTime || "18:00")} className="w-full border-2 border-black px-3 py-2" />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-bold">Timezone</span>
          <input name="timezone" required defaultValue={String(settings?.timezone || "Asia/Kolkata")} className="w-full border-2 border-black px-3 py-2" />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-bold">Cancellation Policy</span>
          <textarea name="cancellationPolicy" defaultValue={String(settings?.cancellationPolicy || "Please notify us at least 24 hours in advance for cancellations.")} className="w-full border-2 border-black px-3 py-2" rows={4} />
        </label>

        <button className="md:col-span-2 border-2 border-black bg-black px-3 py-2 font-semibold text-white shadow-[3px_3px_0_0_#000]">
          Save Clinic Settings
        </button>
      </form>
    </div>
  );
}
