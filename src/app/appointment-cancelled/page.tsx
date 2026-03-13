type AppointmentCancelledPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readValue(param: string | string[] | undefined) {
  if (Array.isArray(param)) {
    return param[0] ?? "";
  }
  return param ?? "";
}

export default async function AppointmentCancelledPage({ searchParams }: AppointmentCancelledPageProps) {
  const params = await searchParams;
  const status = readValue(params.status);

  const message =
    status === "success"
      ? "Your appointment has been cancelled successfully."
      : status === "not-found"
        ? "This cancellation link is invalid or the appointment is already cancelled."
        : "The cancellation link is invalid.";

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-12">
      <div className="mx-auto max-w-xl border-2 border-black bg-white p-6 text-center shadow-[6px_6px_0_0_#000]">
        <h1 className="text-2xl font-black">Appointment Cancellation</h1>
        <p className="mt-3 text-sm">{message}</p>
      </div>
    </div>
  );
}
