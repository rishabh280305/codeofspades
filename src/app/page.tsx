import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { authOptions } from "@/lib/auth";
import { getDemoCredentials } from "@/lib/demo-credentials";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const created = readValue(params.created) === "1";
  const demoCredentials = getDemoCredentials();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,_#dce7ff_0,_#fef6e8_45%,_#e9fce7_100%)] px-4 py-10">
      <main className="grid w-full max-w-5xl gap-5 md:grid-cols-[1.2fr_1fr]">
        <section className="border-2 border-black bg-white p-8 shadow-[8px_8px_0_0_#000]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Clinic Operating System</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">Appointments, scheduling, and daily operations in one dashboard.</h1>
          <p className="mt-4 max-w-xl text-base text-zinc-700">
            Receptionists can book, cancel, and reschedule without double bookings. Doctors can view schedules,
            block time, and close visits with notes.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="border-2 border-black bg-[#e6eeff] p-4">
              <h3 className="font-black">No overlap</h3>
              <p className="text-sm">Hard conflict checks on every create and reschedule.</p>
            </div>
            <div className="border-2 border-black bg-[#fff1dc] p-4">
              <h3 className="font-black">Role-based</h3>
              <p className="text-sm">Separate workflows for doctor and receptionist.</p>
            </div>
            <div className="border-2 border-black bg-[#e8f8e8] p-4">
              <h3 className="font-black">Persistent</h3>
              <p className="text-sm">MongoDB-backed records for every visit.</p>
            </div>
          </div>
        </section>

        <section className="border-2 border-black bg-white p-6 shadow-[8px_8px_0_0_#000]">
          <h2 className="text-2xl font-black">Sign In</h2>
          <p className="mt-1 text-sm text-zinc-600">Use your doctor or receptionist credentials.</p>

          {created ? (
            <p className="mt-3 border-2 border-black bg-[#e8f8e8] p-2 text-sm font-semibold">
              Accounts created successfully. You can log in now.
            </p>
          ) : null}

          <div className="mt-4">
            <LoginForm demoCredentials={demoCredentials} />
          </div>

          <div className="mt-4 border-2 border-black bg-[var(--panel)] p-3 text-xs">
            <p className="font-bold">Bootstrap tip</p>
            <p>Set seed env variables to auto-create one doctor and one receptionist at first login.</p>
          </div>

          <Link
            href="/create-account"
            className="mt-3 block border-2 border-black bg-[#ffd66b] px-3 py-2 text-center text-sm font-semibold shadow-[3px_3px_0_0_#000]"
          >
            Create Linked Doctor + Receptionist Accounts
          </Link>
        </section>
      </main>
    </div>
  );
}
