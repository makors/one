"use client"

import { useEffect } from "react"
import { useAlertsStore, Alert } from "@/lib/stores/alerts"

function normalizeMedicalInfo(raw: Alert["medicalInfo"] | unknown): Alert["medicalInfo"] {
  if (!raw || typeof raw !== "object") {
    return undefined
  }

  const medical = raw as { age?: unknown; conditions?: unknown }
  const age = typeof medical.age === "number" ? medical.age : undefined
  const conditions = Array.isArray(medical.conditions)
    ? medical.conditions
        .filter((condition): condition is string => typeof condition === "string")
        .map((condition) => condition.trim())
        .filter(Boolean)
        .join(", ")
    : typeof medical.conditions === "string"
      ? medical.conditions.trim()
      : undefined

  if (age === undefined && !conditions) {
    return undefined
  }

  return {
    age,
    conditions,
  }
}

function normalizeAlert(raw: Partial<Alert> & { id: string; summary?: string }): Alert {
  const legacySummary = typeof raw.summary === "string" ? raw.summary : ""
  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title
      : legacySummary || "Pending alert"
  const subtitle =
    typeof raw.subtitle === "string"
      ? raw.subtitle
      : legacySummary && legacySummary !== title
        ? legacySummary
        : "Awaiting transcript and AI triage details."

  return {
    id: raw.id,
    meetingId: raw.meetingId,
    title,
    subtitle,
    streamTitle:
      typeof raw.streamTitle === "string" ? raw.streamTitle : "Live Summary",
    streamSummary:
      typeof raw.streamSummary === "string" ? raw.streamSummary : legacySummary,
    priority: raw.priority ?? "medium",
    location: raw.location ?? null,
    status: raw.status ?? "active",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt,
    transcript: Array.isArray(raw.transcript) ? raw.transcript : [],
    questions: Array.isArray(raw.questions) ? raw.questions : [],
    callersCount: raw.callersCount ?? 1,
    medicalInfo: normalizeMedicalInfo(raw.medicalInfo),
  }
}

export function useAlertStream() {
  useEffect(() => {
    const es = new EventSource("/api/events")

    // Full state dump on connect (handles page refresh)
    es.addEventListener("init", (e) => {
      const alerts = (JSON.parse(e.data) as Array<Partial<Alert> & { id: string; summary?: string }>).map(normalizeAlert)
      useAlertsStore.setState((state) => {
        // merge server alerts with mock alerts, server wins on id collision
        const serverIds = new Set(alerts.map((a) => a.id))
        const kept = state.alerts
          .filter((a) => !serverIds.has(a.id))
          .map(normalizeAlert)
        return { alerts: [...alerts, ...kept] }
      })
    })

    // New alert
    es.addEventListener("new-alert", (e) => {
      const alert = normalizeAlert(
        JSON.parse(e.data) as Partial<Alert> & { id: string; summary?: string }
      )
      useAlertsStore.setState((state) => ({
        alerts: [alert, ...state.alerts],
      }))
    })

    // New transcript line
    es.addEventListener("transcript", (e) => {
      const { id, line } = JSON.parse(e.data)
      useAlertsStore.setState((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === id ? { ...a, transcript: [...a.transcript, line] } : a
        ),
      }))
    })

    // New question sent
    es.addEventListener("question", (e) => {
      const { id, question } = JSON.parse(e.data)
      useAlertsStore.setState((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === id ? { ...a, questions: [...a.questions, question] } : a
        ),
      }))
    })

    // Question answered
    es.addEventListener("answer", (e) => {
      const { id, questionId, answer, answeredAt } = JSON.parse(e.data)
      useAlertsStore.setState((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === id
            ? { ...a, questions: a.questions.map((q) => q.id === questionId ? { ...q, answer, answeredAt } : q) }
            : a
        ),
      }))
    })

    // Field updates (title, subtitle, stream summary, priority, status, etc.)
    es.addEventListener("update-alert", (e) => {
      const { id, ...fields } = JSON.parse(e.data)
      useAlertsStore.setState((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === id ? normalizeAlert({ ...a, ...fields }) : a
        ),
      }))
    })

    return () => es.close()
  }, [])
}
