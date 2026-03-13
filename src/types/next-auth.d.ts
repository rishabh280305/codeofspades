import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "DOCTOR" | "RECEPTIONIST";
      clinicId: string;
      clinicName: string;
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    role: "DOCTOR" | "RECEPTIONIST";
    clinicId: string;
    clinicName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "DOCTOR" | "RECEPTIONIST";
    userId?: string;
    clinicId?: string;
    clinicName?: string;
  }
}
