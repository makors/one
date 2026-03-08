import { NextResponse } from "next/server"
import { appendTranscript, addQuestion, answerQuestion, updateAlert, get } from "@/lib/alerts-server"
import { streamSummary, triageAlert } from "@/lib/ai-tool"

const AI_ANALYSIS_DELAY_MS = 6_000

function isQuestionTranscriptLine(text: string) {
  return /^\[?Q:/i.test(text.trim())
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const alert = get(id)

  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 })
  }

  return NextResponse.json(alert)
}

// allows us to switch up the alerts....
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()

  // from the map
  if (!get(id)) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 })
  }

  switch (body.action) {
    case "transcript": {
      const hadAnalyzableTranscript = Boolean(
        get(id)?.transcript.some((line) => !isQuestionTranscriptLine(line.text))
      )

      appendTranscript(id, body.text, {
        transcriptId: body.transcriptId,
        at: body.at,
      })

      const alert = get(id)
      const hasAnalyzableTranscript = Boolean(
        alert?.transcript.some((line) => !isQuestionTranscriptLine(line.text))
      )

      if (!hadAnalyzableTranscript && hasAnalyzableTranscript && alert) {
        void (async () => {
          await new Promise((resolve) => setTimeout(resolve, AI_ANALYSIS_DELAY_MS))
          await Promise.allSettled([
            streamSummary(alert),
            triageAlert(alert),
          ])
        })()
      }

      break
    }
    case "question":
      addQuestion(id, body.text)
      break
    case "answer":
      answerQuestion(id, body.questionId, body.answer)
      break
    case "update":
      updateAlert(id, body.fields)
      break
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
