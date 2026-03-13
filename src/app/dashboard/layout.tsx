import Link from "next/link";
import { requireSession } from "@/lib/server-auth";
import { SignOutButton } from "@/components/auth/signout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-6 md:px-8">
      <header className="mx-auto mb-6 flex w-full max-w-7xl items-center justify-between border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Clinic OS</p>
          <h1 className="text-xl font-black">Doctor Appointment System</h1>
          <p className="text-sm font-semibold text-indigo-700">{session.user.clinicName}</p>
          <p className="text-sm">Signed in as {session.user.name} ({session.user.role})</p>
        </div>
        <div className="flex items-center gap-2">
          {session.user.role === "RECEPTIONIST" ? (
            <>
              <Link
                href="/dashboard/receptionist/appointments"
                className="border-2 border-black bg-[var(--panel)] px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_0_#000]"
              >
                Appointments
              </Link>
              <Link
                href="/dashboard/receptionist/book"
                className="border-2 border-black bg-[var(--panel)] px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_0_#000]"
              >
                Book
              </Link>
              <Link
                href="/dashboard/receptionist/patients"
                className="border-2 border-black bg-[var(--panel)] px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_0_#000]"
              >
                Patients
              </Link>
            </>
          ) : null}
          {session.user.role === "DOCTOR" ? (
            <>
              <Link
                href="/dashboard/doctor"
                className="border-2 border-black bg-[var(--panel)] px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_0_#000]"
              >
                Schedule
              </Link>
              <Link
                href="/dashboard/doctor/settings"
                className="border-2 border-black bg-[var(--panel)] px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_0_#000]"
              >
                Clinic Settings
              </Link>
            </>
          ) : null}
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl">{children}</main>
    </div>
  );
}
