// Server-side alert state. In-memory — survives refreshes, dies on redeploy.
// Uses globalThis so state is shared across module re-evaluations in dev mode.

import type { LocationObjectCoords } from "./location"
import { broadcast, sendTo } from "./events"

export type ServerAlert = {
  id: string
  meetingId?: string
  title: string
  subtitle: string
  streamTitle: string
  streamSummary: string
  priority: "critical" | "high" | "medium"
  location: LocationObjectCoords | null
  status: "active" | "resolved"
  createdAt: string
  updatedAt?: string
  transcript: { id?: string; text: string; at: string }[]
  questions: { id: string; text: string; sentAt: string; answeredAt?: string; answer?: "yes" | "no" }[]
  callersCount: number
  ghost: boolean
  medicalInfo?: { age?: number; conditions?: string }
}

const g = globalThis as unknown as { __alerts?: Map<string, ServerAlert> }
if (!g.__alerts) g.__alerts = new Map()
const alerts = g.__alerts

export function getAll(): ServerAlert[] {
  return Array.from(alerts.values())
}

export function get(id: string): ServerAlert | undefined {
  return alerts.get(id)
}

export function createAlert(alert: ServerAlert) {
  alerts.set(alert.id, alert)
  broadcast("new-alert", alert)
}

export function appendTranscript(
  id: string,
  text: string,
  options?: { transcriptId?: string; at?: string }
) {
  const alert = alerts.get(id)
  if (!alert) return

  const normalizedText = text.trim()
  if (!normalizedText) return

  if (
    options?.transcriptId &&
    alert.transcript.some((line) => line.id === options.transcriptId)
  ) {
    return
  }

  const line = {
    id: options?.transcriptId,
    text: normalizedText,
    at: options?.at ?? new Date().toISOString(),
  }
  alert.transcript.push(line)
  broadcast("transcript", { id, line })
}

export function addQuestion(id: string, questionText: string) {
  const alert = alerts.get(id)
  if (!alert) return
  const question = { id: crypto.randomUUID(), text: questionText, sentAt: new Date().toISOString() }
  alert.questions.push(question)
  broadcast("question", { id, question })
}

export function answerQuestion(alertId: string, questionId: string, answer: "yes" | "no") {
  const alert = alerts.get(alertId)
  if (!alert) return
  const q = alert.questions.find((q) => q.id === questionId)
  if (!q) return


  q.answeredAt = new Date().toISOString()
  q.answer = answer
  broadcast("answer", { id: alertId, questionId, answer, answeredAt: q.answeredAt })
}

export function updateAlert(
  id: string,
  fields: Partial<
    Pick<
      ServerAlert,
      "title" | "subtitle" | "streamTitle" | "streamSummary" | "priority" | "status" | "medicalInfo"
    >
  >
) {
  const alert = alerts.get(id)
  if (!alert) return
  
  Object.assign(alert, fields, { updatedAt: new Date().toISOString() })
  broadcast("update-alert", { id, ...fields })
}

// Send full state to a single newly-connected client
export function sendInitTo(controller: ReadableStreamDefaultController<Uint8Array>) {
  sendTo(controller, "init", getAll())
}
