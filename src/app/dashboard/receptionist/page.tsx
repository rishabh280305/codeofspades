import { redirect } from "next/navigation";

export default function ReceptionistDashboardIndexPage() {
  redirect("/dashboard/receptionist/appointments");
}
