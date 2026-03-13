import Link from "next/link";
import { createLinkedAccountsAction } from "@/app/create-account/actions";

type CreateAccountPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

export default async function CreateAccountPage({ searchParams }: CreateAccountPageProps) {
  const params = await searchParams;
  const error = readValue(params.error);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e8f0ff_0,_#fdf6e9_45%,_#f5fbf6_100%)] px-4 py-8">
      <div className="mx-auto max-w-3xl border-2 border-black bg-white p-6 shadow-[8px_8px_0_0_#000]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Clinic Setup</p>
        <h1 className="mt-2 text-3xl font-black">Create Linked Clinic Accounts</h1>
        <p className="mt-2 text-sm text-zinc-700">
          Set up doctor and receptionist together. Both users will be linked to the same clinic.
        </p>

        {error ? (
          <p className="mt-3 border-2 border-black bg-rose-100 p-2 text-sm font-semibold">
            {error === "exists"
              ? "One of these emails already exists."
              : error === "duplicate-email"
                ? "Doctor and receptionist email must be different."
                : "Invalid input. Check all required fields."}
          </p>
        ) : null}

        <form action={createLinkedAccountsAction} className="mt-5 space-y-5">
          <section className="border-2 border-black bg-[var(--panel)] p-4">
            <h2 className="font-black">Clinic</h2>
            <input name="clinicName" required placeholder="Clinic Name" className="mt-2 w-full border-2 border-black bg-white px-3 py-2" />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="border-2 border-black bg-[#eaf3ff] p-4">
              <h2 className="font-black">Doctor Account</h2>
              <input name="doctorName" required placeholder="Doctor Name" className="mt-2 w-full border-2 border-black bg-white px-3 py-2" />
              <input name="doctorEmail" type="email" required placeholder="Doctor Email" className="mt-2 w-full border-2 border-black bg-white px-3 py-2" />
              <input
                name="doctorPassword"
                type="password"
                required
                minLength={6}
                placeholder="Doctor Password"
                className="mt-2 w-full border-2 border-black bg-white px-3 py-2"
              />
            </div>

            <div className="border-2 border-black bg-[#fff2e6] p-4">
              <h2 className="font-black">Receptionist Account</h2>
              <input name="receptionistName" required placeholder="Receptionist Name" className="mt-2 w-full border-2 border-black bg-white px-3 py-2" />
              <input
                name="receptionistEmail"
                type="email"
                required
                placeholder="Receptionist Email"
                className="mt-2 w-full border-2 border-black bg-white px-3 py-2"
              />
              <input
                name="receptionistPassword"
                type="password"
                required
                minLength={6}
                placeholder="Receptionist Password"
                className="mt-2 w-full border-2 border-black bg-white px-3 py-2"
              />
            </div>
          </section>

          <button className="w-full border-2 border-black bg-black px-4 py-3 font-semibold text-white shadow-[4px_4px_0_0_#000]">
            Create Linked Accounts
          </button>
        </form>

        <p className="mt-4 text-sm">
          Already have accounts? <Link href="/" className="font-bold underline">Go to Login</Link>
        </p>
      </div>
    </div>
  );
}
