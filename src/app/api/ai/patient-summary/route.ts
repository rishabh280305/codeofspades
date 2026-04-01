import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AppointmentModel } from "@/models/Appointment";
import { PatientModel } from "@/models/Patient";
import { PatientFileModel } from "@/models/PatientFile";
import { getOpenAIClient } from "@/lib/openai";

function isRefusalLike(text: string) {
  return /i\s*(am|'m)\s*sorry|can't assist|cannot assist|can't help|cannot help|unable to assist|unable to analyze|cannot analyze/i.test(
    text,
  );
}

// POST /api/ai/patient-summary
// Body: { patientId: string }
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "DOCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { patientId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { patientId } = body;
  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  try {
    await connectToDatabase();
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const patient = await PatientModel.findOne({
    _id: patientId,
    clinicId: session.user.clinicId,
  }).lean();

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Past completed appointments (most recent 10)
  const pastAppointments = await AppointmentModel.find({
    patientId: new Types.ObjectId(patientId),
    clinicId: session.user.clinicId,
    status: "COMPLETED",
  })
    .sort({ startAt: -1 })
    .limit(10)
    .lean();

  // Uploaded files (metadata + data for images)
  const allFiles = await PatientFileModel.find({
    patientId,
    clinicId: session.user.clinicId,
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // History text
  const historyText =
    pastAppointments.length > 0
      ? pastAppointments
          .map(
            (a, i) =>
              `Visit ${i + 1} (${a.appointmentDate}): Reason: ${a.reason || "N/A"} | Doctor notes: ${a.notes || "None recorded"}`,
          )
          .join("\n")
      : "No previous completed visits on record.";

  const filesText =
    allFiles.length > 0
      ? allFiles
          .map(
            (f) =>
              `• ${f.fileName} [${f.category}] — ${f.fileSize ? Math.round((f.fileSize as number) / 1024) + " KB" : "unknown size"} — uploaded ${(f as Record<string, unknown>).createdAt instanceof Date ? ((f as Record<string, unknown>).createdAt as Date).toLocaleDateString() : "recently"}`,
          )
          .join("\n")
      : "No files uploaded for this patient.";

  const patientInfo = `Patient: ${(patient as Record<string, unknown>).fullName}, DOB: ${(patient as Record<string, unknown>).dateOfBirth ? new Date((patient as Record<string, unknown>).dateOfBirth as string).toLocaleDateString() : "N/A"}, Phone: ${(patient as Record<string, unknown>).phone}`;

  // Image files for vision (max 3, most recent)
  const imageFiles = allFiles
    .filter((f) => (f.mimeType as string).startsWith("image/"))
    .slice(0, 3);

  const textPart = `You are a senior clinical assistant for doctors. Give a short, direct, action-oriented summary.

${patientInfo}

APPOINTMENT HISTORY (${pastAppointments.length} completed ${pastAppointments.length === 1 ? "visit" : "visits"}):
${historyText}

UPLOADED FILES (${allFiles.length} total):
${filesText}${imageFiles.length > 0 ? "\n\n[Medical images are attached. Please analyze and include findings.]" : ""}

Rules:
- Be concise: max 8 total bullet points.
- Be specific and to the point.
- Do NOT use long safety disclaimers or generic filler.
- Never say "I can't analyze images", "unable to analyze", or similar.
- If an image is attached, provide your best evidence-based interpretation of visible findings.
- If evidence is strong, state findings confidently.
- If uncertain, write exactly "Confidence: Low" for that item and add one clarifying test.
- Prioritize image findings when medical images are attached.

Respond in this exact structure:
1. Image Findings${imageFiles.length > 0 ? " (mandatory)" : ""}
- 2-3 bullets${imageFiles.length > 0 ? " based on attached image(s)" : ""}

2. Key Findings
- 2-4 bullets, each starting with "Confidence: High|Medium|Low -"

3. Current Assessment
- 1-2 bullets

4. Immediate Plan
- 2-3 bullets for next clinical steps today

5. Risks / Red Flags
- 1-2 bullets only if present, otherwise write "None identified." 

Keep the response short and clinical.`;

  // Build message content with optional images
  type TextPart = { type: "text"; text: string };
  type ImagePart = { type: "image_url"; image_url: { url: string; detail: "auto" } };
  const contentParts: Array<TextPart | ImagePart> = [{ type: "text", text: textPart }];

  for (const f of imageFiles) {
    contentParts.push({
      type: "image_url",
      image_url: {
        url: `data:${f.mimeType};base64,${f.data}`,
        detail: "auto",
      },
    });
  }

  try {
    const openai = getOpenAIClient();
    let imageObservations = "No diagnostic image attached.";

    if (imageFiles.length > 0) {
      const imageOnlyPrompt = `Analyze attached medical image(s) for doctor-facing observations.

Rules:
- Describe only visible findings.
- No refusal/disclaimer language.
- Keep it short: max 3 bullets.
- Each bullet starts with Confidence: High|Medium|Low -`;

      const imageOnlyContent: Array<TextPart | ImagePart> = [
        { type: "text", text: imageOnlyPrompt },
        ...contentParts.filter((part) => part.type === "image_url"),
      ];

      const imagePass = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a concise radiology-style assistant for clinicians.",
          },
          { role: "user", content: imageOnlyContent },
        ],
        temperature: 0.1,
        max_tokens: 180,
      });

      const imageText = imagePass.choices[0]?.message?.content?.trim();
      if (imageText && !isRefusalLike(imageText)) {
        imageObservations = imageText;
      }
    }

    const systemPrompt =
      "You are assisting a doctor inside an EHR. Write concise clinical notes. Provide your best interpretation from available evidence, including attached medical images when present. Avoid generic disclaimers and avoid telling the doctor to consult a specialist unless a specific red flag is identified.";

    const enrichedTextPart = `${textPart}\n\nIMAGE OBSERVATIONS FROM ATTACHED FILES:\n${imageObservations}\n\nUse the image observations explicitly in section 1.`;
    const enrichedContentParts: Array<TextPart | ImagePart> = [
      { type: "text", text: enrichedTextPart },
      ...contentParts.filter((part) => part.type === "image_url"),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: enrichedContentParts },
      ],
      temperature: 0.2,
      max_tokens: 380,
    });

    let summary = completion.choices[0]?.message?.content ?? "Unable to generate summary.";

    // If the model returns refusal-style wording, re-run analysis with an observations-first image prompt.
    if (imageFiles.length > 0 && isRefusalLike(summary)) {
      const imageOnlyPrompt = `You are assisting a doctor. Analyze attached medical image(s) and provide best-effort objective findings.

Rules:
- Do NOT refuse unless images are unreadable.
- Give concrete visual findings first.
- No long disclaimer text.
- If uncertain, mark that bullet as Confidence: Low.

Output format:
1. Image Findings
- 2-4 bullets, each starts with "Confidence: High|Medium|Low -"
2. Most Likely Clinical Impression
- 1-2 bullets
3. Next Best Step Today
- 1-2 bullets`;

      const secondPassContent: Array<TextPart | ImagePart> = [{ type: "text", text: imageOnlyPrompt }, ...contentParts.filter((part) => part.type === "image_url")];

      const secondPass = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a radiology-style clinical assistant writing concise findings for a doctor in an EHR.",
          },
          {
            role: "user",
            content: secondPassContent,
          },
        ],
        temperature: 0.2,
        max_tokens: 280,
      });

      const retried = secondPass.choices[0]?.message?.content?.trim();
      if (retried) {
        summary = retried;
      }

      // Final fallback: compress any remaining verbose output into short doctor notes.
      if (isRefusalLike(summary)) {
        const formatter = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "Convert input into concise doctor-facing bullet notes. No refusal wording. Max 6 bullets total.",
            },
            {
              role: "user",
              content: `Create short, concrete notes from this context. If image detail is uncertain, state Confidence: Low and one specific next test.\n\n${patientInfo}\n\nHistory:\n${historyText}\n\nFiles:\n${filesText}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 220,
        });

        const formatted = formatter.choices[0]?.message?.content?.trim();
        if (formatted) {
          summary = formatted;
        }
      }
    }

    return NextResponse.json({
      summary,
      patientName: (patient as Record<string, unknown>).fullName,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI service error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
