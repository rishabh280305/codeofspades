function clean(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

export function getDemoCredentials() {
  return {
    doctor: {
      name: clean(process.env.SEED_DOCTOR_NAME, "Dr. Clinic"),
      email: clean(process.env.SEED_DOCTOR_EMAIL, "doctor@clinic.local"),
      password: clean(process.env.SEED_DOCTOR_PASSWORD, "Doctor123!"),
    },
    receptionist: {
      name: clean(process.env.SEED_RECEPTIONIST_NAME, "Reception Desk"),
      email: clean(process.env.SEED_RECEPTIONIST_EMAIL, "reception@clinic.local"),
      password: clean(process.env.SEED_RECEPTIONIST_PASSWORD, "Reception123!"),
    },
  };
}
