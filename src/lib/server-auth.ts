import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/");
  }
  return session;
}

export async function requireRole(role: "DOCTOR" | "RECEPTIONIST") {
  const session = await requireSession();
  if (session.user.role !== role) {
    redirect("/dashboard");
  }
  return session;
}
