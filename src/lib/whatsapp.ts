import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
const rawWhatsAppFrom =
  process.env.TWILIO_WHATSAPP_FROM?.trim() || process.env.TWILIO_PHONE_NUMBER?.trim() || "";

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

function normalizePhone(phone?: string) {
  const raw = phone?.trim();
  if (!raw) {
    return null;
  }

  if (raw.startsWith("whatsapp:")) {
    return raw;
  }

  if (raw.startsWith("+")) {
    return `whatsapp:${raw}`;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `whatsapp:+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `whatsapp:+${digits}`;
  }
  if (digits.length >= 11) {
    return `whatsapp:+${digits}`;
  }

  return null;
}

function normalizeFromAddress(raw?: string) {
  const from = raw?.trim();
  if (!from) {
    return null;
  }
  if (from.startsWith("whatsapp:")) {
    return from;
  }
  if (from.startsWith("+")) {
    return `whatsapp:${from}`;
  }

  const digits = from.replace(/\D/g, "");
  if (digits.length >= 10) {
    return `whatsapp:+${digits}`;
  }

  return null;
}

const whatsappFrom = normalizeFromAddress(rawWhatsAppFrom);

export async function sendWhatsAppMessage(params: {
  to?: string;
  body: string;
}) {
  const to = normalizePhone(params.to);
  if (!to || !client || !whatsappFrom) {
    return { skipped: true, reason: "missing-config-or-recipient" };
  }

  try {
    const message = await client.messages.create({
      from: whatsappFrom,
      to,
      body: params.body,
    });

    return {
      skipped: false,
      reason: null,
      sid: message.sid,
      status: message.status,
      to,
      from: whatsappFrom,
    };
  } catch (error) {
    console.error("WhatsApp send failed", error);
    const maybeTwilioError = error as { code?: number; message?: string };
    return {
      skipped: true,
      reason: "provider-error",
      errorCode: maybeTwilioError?.code ?? null,
      errorMessage: maybeTwilioError?.message ?? "Unknown provider error",
      to,
      from: whatsappFrom,
    };
  }
}
