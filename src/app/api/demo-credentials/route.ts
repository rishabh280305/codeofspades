import { NextResponse } from "next/server";
import { getDemoCredentials } from "@/lib/demo-credentials";

export async function GET() {
  const credentials = getDemoCredentials();

  return NextResponse.json({
    doctor: credentials.doctor,
    receptionist: credentials.receptionist,
  });
}
