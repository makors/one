import { NextResponse } from "next/server";
import { createAlert } from "@/lib/alerts-server";
import { LocationObjectCoords, normalizeLocation } from "@/lib/location";

function calculateAge(dob: string): number {
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--
  return age
}

function normalizeMedicalConditions(raw: unknown): string | undefined {
  if (typeof raw === "string") {
    const normalized = raw.trim()
    return normalized || undefined
  }

  if (Array.isArray(raw)) {
    const normalized = raw
      .filter((condition): condition is string => typeof condition === "string")
      .map((condition) => condition.trim())
      .filter(Boolean)
      .join(", ")

    return normalized || undefined
  }

  return undefined
}

const orgId = process.env.CLOUDFLARE_REALTIMEKIT_ORG_ID!;
const apiKey = process.env.CLOUDFLARE_REALTIMEKIT_API_KEY!;
const presetName = process.env.CLOUDFLARE_REALTIMEKIT_PRESET!;
const transcriptionLanguage =
  process.env.CLOUDFLARE_REALTIMEKIT_TRANSCRIPTION_LANGUAGE ?? "en-US";
const authorization = `Basic ${Buffer.from(`${orgId}:${apiKey}`).toString("base64")}`;

// as of now, this only posts to cloudflare
export async function POST(request: Request) {
  const { name = "Unknown User", dob, location, medicalConditions, ghost = false } = await request.json() as {
    name?: string;
    dob?: string;
    location?: unknown;
    medicalConditions?: string[] | string;
    ghost?: boolean;
  };
  const normalizedMedicalConditions = normalizeMedicalConditions(medicalConditions)

  // location parsing done by Claude...
  const normalizedLocation = await normalizeLocation(location) as unknown as LocationObjectCoords;

  const meetingResponse = await fetch(
    "https://api.realtime.cloudflare.com/v2/meetings",
    {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "One -- Emergency Stream",
        ai_config: {
          transcription: {
            language: transcriptionLanguage,
            profanity_filter: false,
          },
        },
      }),
    }
  );

  const meetingText = await meetingResponse.text();

  if (!meetingResponse.ok) {
    return NextResponse.json(
      {
        step: "create-meeting",
        status: meetingResponse.status,
        body: meetingText,
      },
      { status: 500 }
    );
  }

  const meetingData = JSON.parse(meetingText);
  const meetingId =
    meetingData.data?.id ?? meetingData.id ?? meetingData.result?.id;

  // 30 mins of debugging later :0
  if (!meetingId) {
    return NextResponse.json(
      {
        step: "create-meeting",
        error: "Meeting ID missing from response",
        meetingData,
      },
      { status: 500 }
    );
  }

  // this is quite annoying, this is the HOST participant (which we return at the end, async callback to SSE)
  const participantId = crypto.randomUUID();
  const participantResponse = await fetch(
    `https://api.realtime.cloudflare.com/v2/meetings/${meetingId}/participants`,
    {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        preset_name: presetName,
        custom_participant_id: participantId,
      }),
    }
  );
  
  const participantText = await participantResponse.text();
  
  if (!participantResponse.ok) {
    return NextResponse.json(
      {
        step: "add-participant",
        status: participantResponse.status,
        body: participantText,
        meetingId,
        presetName,
      },
      { status: 500 }
    );
  }
  
  const participantData = JSON.parse(participantText);
  const authToken =
    participantData.data?.authToken ??
    participantData.data?.token ??
    participantData.authToken ??
    participantData.token;

  // store + broadcast to all connected dashboards — instant, no waiting (claude did this, massively boilerplate)
  const alertId = crypto.randomUUID();
  createAlert({
    id: alertId,
    meetingId,
    title: `Pending alert from ${name}`,
    subtitle: "Awaiting transcript and AI triage details.",
    streamTitle: "Live Summary Pending",
    streamSummary: "",
    priority: "medium",
    location: normalizedLocation, // quite loaded
    status: "active",
    createdAt: new Date().toISOString(),
    transcript: [],
    questions: [
      ...(ghost ? [] : [
      {
        id: crypto.randomUUID(),
          text: "Are you in immediate danger?",
          sentAt: new Date().toISOString(),
        },
      ]),
    ],
    callersCount: 1,
    ghost,
    medicalInfo: {
      age: dob ? calculateAge(dob) : undefined,
      conditions: normalizedMedicalConditions,
    }
  });

  return NextResponse.json({
    meetingId,
    authToken,
    participantId,
    alertId,
  });
}