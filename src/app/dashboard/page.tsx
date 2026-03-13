import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server-auth";

export default async function DashboardIndexPage() {
  const session = await requireSession();

  if (session.user.role === "DOCTOR") {
    redirect("/dashboard/doctor");
  }

  redirect("/dashboard/receptionist");
}
