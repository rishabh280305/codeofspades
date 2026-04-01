const DEFAULT_APP_BASE_URL = "https://codeofspades.vercel.app";

function normalizeRawUrl(raw?: string) {
  const value = raw?.trim();
  if (!value) {
    return "";
  }

  // Accept bare hostnames by prepending https.
  const candidate = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;

  try {
    const parsed = new URL(candidate);
    const host = parsed.hostname.toLowerCase();

    // Twilio/vercel links must use .vercel.app, not .vercel.com.
    if (host.endsWith(".vercel.com")) {
      parsed.hostname = host.replace(/\.vercel\.com$/, ".vercel.app");
    }

    // Prefer canonical alias over generated techblitz hostnames.
    if (parsed.hostname.includes("techblitz")) {
      return DEFAULT_APP_BASE_URL;
    }

    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function getAppBaseUrl() {
  const explicit = normalizeRawUrl(process.env.APPOINTMENT_PUBLIC_BASE_URL);
  if (explicit) {
    return explicit;
  }

  const publicUrl = normalizeRawUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (publicUrl) {
    return publicUrl;
  }

  const authUrl = normalizeRawUrl(process.env.NEXTAUTH_URL);
  if (authUrl) {
    return authUrl;
  }

  return DEFAULT_APP_BASE_URL;
}
