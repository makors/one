import { groq } from "@ai-sdk/groq"
import { generateObject, streamText } from "ai"
import { z } from "zod"
import { type ServerAlert, updateAlert, addQuestion } from "./alerts-server"
import { broadcast } from "./events"

const QUESTION_BANK = [
  "Are you injured?",
  "Is the threat still nearby?",
  "Are others with you?",
  "Do you need medical attention?",
  "Can you move to a safe location?",
  "Is anyone else injured?",
  "Can you describe the threat?",
] as const

const model = groq("meta-llama/llama-4-scout-17b-16e-instruct")

function isQuestionTranscriptLine(text: string) {
  return /^\[?Q:/i.test(text.trim())
}

function buildAiTranscript(alert: ServerAlert) {
  return alert.transcript
    .map((t) => t.text.trim())
    .filter(Boolean)
    .filter((line) => !isQuestionTranscriptLine(line))
    .join("\n")
}

export async function streamSummary(alert: ServerAlert) {
  const transcript = buildAiTranscript(alert)
  if (!transcript.trim()) return

  const metadataPromise = generateObject({
    model,
    schema: z.object({
      title: z
        .string()
        .describe("A single-sentence alert title the dispatcher can scan instantly."),
      subtitle: z
        .string()
        .describe("A more detailed 1-2 sentence preview that adds important context."),
      streamTitle: z
        .string()
        .describe("A short heading for the longer live summary panel."),
    }),
    messages: [
      {
        role: "system",
        content:
          "You are a dispatcher triage AI. Given an emergency transcript, generate concise structured copy for the dashboard. `title` must be exactly one sentence and easy to scan. `subtitle` should add a bit more detail in 1-2 sentences. `streamTitle` should be a short heading for the longer summary panel. Never include labels like Q:, A:, [Q:], or [A:].",
      },
      { role: "user", content: transcript },
    ],
  })

  const result = streamText({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are a dispatcher triage AI. Write a longer live summary of this emergency transcript in 3-5 short sentences. Be direct, no filler, and focus on the key situation, risk, and immediate context. Never include labels like Q:, A:, [Q:], or [A:].",
      },
      { role: "user", content: transcript },
    ],
  })

  const { object } = await metadataPromise
  updateAlert(alert.id, object)

  let accumulated = ""
  for await (const chunk of result.textStream) {
    accumulated += chunk
    broadcast("update-alert", { id: alert.id, streamSummary: accumulated }) // chunk by chunk streaming
  }

  updateAlert(alert.id, { streamSummary: accumulated })
}

// the actual "bread and butter" of our app
export async function triageAlert(alert: ServerAlert) {
  const transcript = buildAiTranscript(alert)
  if (!transcript.trim()) return

  const alreadyAsked = new Set(alert.questions.map((q) => q.text))
  const availableQuestions = QUESTION_BANK.filter((q) => !alreadyAsked.has(q))

  const { object } = await generateObject({
    model,
    schema: z.object({
      priority: z.enum(["critical", "high", "medium"]).describe(
        "critical = active threat / someone is hurt. high = potential danger. medium = unclear / no immediate threat."
      ),
      questionIndex: z
        .number()
        .describe(
          "Index of the most relevant next question to ask from the available list, or -1 if none are relevant right now."
        ),
    }),
    messages: [
      {
        role: "system",
        content: `You are an AI triage assistant for emergency dispatchers. You receive a live transcript from a silent panic button -- the caller may not be able to speak.

Respond with:
1. priority: critical (active threat, injury), high (potential danger), or medium (unclear)
2. questionIndex: pick the most useful next question to send to the caller's phone (they answer yes/no). Return -1 if none fit.

Available questions:
${availableQuestions.map((q, i) => `${i}: "${q}"`).join("\n")}`,
      },
      { role: "user", content: transcript },
    ],
  })

  updateAlert(alert.id, { priority: object.priority })

  if (
    object.questionIndex >= 0 &&
    object.questionIndex < availableQuestions.length
  ) {
    addQuestion(alert.id, availableQuestions[object.questionIndex])
  }
}
