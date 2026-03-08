'use client'

import { useEffect, useRef, useState } from "react"
import { Alert, AlertQuestion, TranscriptLine, useAlertsStore } from "@/lib/stores/alerts"
import { formatCoordinates } from "@/lib/location"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import LocationMap from "@/components/dashboard/location-map"
import StreamingSummaryText from "@/components/dashboard/streaming-summary-text"
import VideoFeed, { type LiveTranscript } from "@/components/dashboard/video-feed"
import {
  MapPin, Heart,
  Clock, MessageSquare, ArrowRight, ArrowUp, Video, Map,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTick } from "@/hooks/use-tick"


/*
  This file was mostly composed by Claude for the boilerplate, but the live updates were written by us.
*/

const priorityConfig = {
  critical: { badge: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900" },
  high:     { badge: "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900" },
  medium:   { badge: "bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:border-yellow-900" },
}

const statusConfig = {
  active:   { dot: "bg-foreground", label: "Active",   next: "Resolve" },
  resolved: { dot: "bg-muted-foreground/50",      label: "Resolved", next: null },
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function normalizeMedicalConditions(raw: unknown): string {
  if (typeof raw === "string") {
    return raw.trim()
  }

  if (Array.isArray(raw)) {
    return raw
      .filter((condition): condition is string => typeof condition === "string")
      .map((condition) => condition.trim())
      .filter(Boolean)
      .join(", ")
  }

  return ""
}

type TimelineEntry =
  | { kind: "transcript"; at: string; line: TranscriptLine }
  | { kind: "question";   at: string; question: AlertQuestion }
  | { kind: "answer";     at: string; question: AlertQuestion }

function buildTimeline(alert: Alert): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  for (const line of alert.transcript) {
    entries.push({ kind: "transcript", at: line.at, line })
  }
  for (const q of alert.questions) {
    entries.push({ kind: "question", at: q.sentAt, question: q })
    if (q.answeredAt && q.answer) {
      entries.push({ kind: "answer", at: q.answeredAt, question: q })
    }
  }

  entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  return entries
}

const STREAMING_CHAR_INTERVAL_MS = 22

function LiveTranscriptStream({ transcript }: { transcript: LiveTranscript }) {
  const [visibleLength, setVisibleLength] = useState(0)
  const previousTranscriptIdRef = useRef(transcript.id)

  useEffect(() => {
    if (previousTranscriptIdRef.current !== transcript.id) {
      previousTranscriptIdRef.current = transcript.id
      setVisibleLength(0)
    }
  }, [transcript.id])

  useEffect(() => {
    const targetLength = transcript.text.length

    if (visibleLength >= targetLength) {
      return
    }

    const interval = window.setInterval(() => {
      setVisibleLength((current) => {
        if (current >= targetLength) {
          window.clearInterval(interval)
          return current
        }

        const remaining = targetLength - current
        const nextStep = remaining > 24 ? 3 : remaining > 10 ? 2 : 1
        return Math.min(targetLength, current + nextStep)
      })
    }, STREAMING_CHAR_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [transcript.id, transcript.text, visibleLength])

  const visibleText = transcript.text.slice(0, visibleLength)
  const isStreaming =
    transcript.isPartial || visibleLength < transcript.text.length

  return (
    <div
      key={`${transcript.id}:${transcript.isPartial ? "partial" : "final"}`}
      className="animate-in fade-in-0 slide-in-from-bottom-2 flex items-start gap-3 py-1.5 duration-300"
    >
      <span
        className="text-[10px] text-muted-foreground/40 tabular-nums pt-0.5 shrink-0 w-16 text-right"
        suppressHydrationWarning
      >
        {formatTime(transcript.at)}
      </span>
      <p className="text-sm leading-relaxed">
        {visibleText}
        <span
          className={cn(
            "ml-0.5 inline-block h-4 w-px align-[-2px] bg-current transition-opacity",
            isStreaming ? "animate-pulse opacity-90" : "opacity-0"
          )}
        />
      </p>
    </div>
  )
}

export default function AlertDetail({ alert }: { alert: Alert }) {
  useTick()
  const advanceAlertStatus = useAlertsStore((s) => s.advanceAlertStatus)
  const priority = priorityConfig[alert.priority]
  const status = statusConfig[alert.status]
  const timeline = buildTimeline(alert)
  const medical = alert.medicalInfo
  const medicalConditions = normalizeMedicalConditions(medical?.conditions)
  const coordinateLabel = formatCoordinates(alert.location)
  const [liveTranscript, setLiveTranscript] = useState<LiveTranscript | null>(null)
  const [questionDraft, setQuestionDraft] = useState("")
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false)
  // we've had some issues with the live transcript not being deduplicated, so we'll just do this
  const hasPersistedLiveTranscript =
    liveTranscript !== null &&
    alert.transcript.some((line) => line.id === liveTranscript.id)
  const pendingQuestions = alert.questions.filter((q) => !q.answer)

  useEffect(() => {
    setLiveTranscript(null)
    setQuestionDraft("")
  }, [alert.id])

  useEffect(() => {
    if (hasPersistedLiveTranscript) {
      setLiveTranscript(null)
    }
  }, [hasPersistedLiveTranscript])

  async function submitBinaryQuestion() {
    const normalizedQuestion = questionDraft.trim().replace(/\?*$/, "?")
    if (!normalizedQuestion || isSubmittingQuestion) return

    try {
      setIsSubmittingQuestion(true)

      const response = await fetch(`/api/alerts/${alert.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "question", text: normalizedQuestion }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit question")
      }

      setQuestionDraft("")
    } finally {
      setIsSubmittingQuestion(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b px-6 py-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 tabular-nums" suppressHydrationWarning>
                <Clock className="size-3" />
                {timeAgo(alert.createdAt)}
              </span>
            </div>
            <h2 className="text-base font-semibold leading-snug">
              <StreamingSummaryText text={alert.title} />
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {alert.subtitle}
            </p>
          </div>
          {status.next && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5 text-xs"
              onClick={() => {
                advanceAlertStatus(alert.id)
                fetch(`/api/alerts/${alert.id}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "update", fields: { status: "resolved" } }),
                })
              }}
            >
              {status.next}
              <ArrowRight className="size-3" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          <Badge variant="outline" className={cn("capitalize text-[10px] h-5 px-2", priority.badge)}>
            {alert.priority}
          </Badge>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-3" />
            <span className="truncate max-w-xs">{alert.location?.address ?? formatCoordinates(alert.location)}</span>
          </span>
        </div>

      </div>

      {/* Content — two columns */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x overflow-hidden">
        {/* Left column: Transcript + Medical */}
        <div className="lg:col-span-2 flex flex-col min-h-0 overflow-hidden">
          {/* Transcript */}
          <div className="flex items-center gap-2 px-6 py-2.5 border-b text-xs font-medium text-muted-foreground uppercase tracking-widest shrink-0">
            <MessageSquare className="size-3" />
            Live Transcript
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-3 space-y-0.5">
            {timeline.length === 0 && !liveTranscript ? (
              <p className="text-sm text-muted-foreground/50 py-8 text-center">No transcript yet</p>
            ) : (
              <>
                {timeline.map((entry, i) => {
                  if (entry.kind === "transcript") {
                    return (
                      <div key={`t-${i}`} className="flex items-start gap-3 py-1.5">
                        <span className="text-[10px] text-muted-foreground/40 tabular-nums pt-0.5 shrink-0 w-16 text-right" suppressHydrationWarning>
                          {formatTime(entry.at)}
                        </span>
                        <p className="text-sm leading-relaxed">{entry.line.text}</p>
                      </div>
                    )
                  }

                  if (entry.kind === "question") {
                    return (
                      <div key={`q-${entry.question.id}`} className="flex items-start gap-3 py-1.5">
                        <span className="text-[10px] text-muted-foreground/40 tabular-nums pt-0.5 shrink-0 w-16 text-right" suppressHydrationWarning>
                          {formatTime(entry.at)}
                        </span>
                        <p className="text-sm leading-relaxed italic text-muted-foreground">
                          [Q: {entry.question.text}]
                        </p>
                      </div>
                    )
                  }

                  // answer
                  return (
                    <div key={`a-${entry.question.id}`} className="flex items-start gap-3 py-1.5">
                      <span className="text-[10px] text-muted-foreground/40 tabular-nums pt-0.5 shrink-0 w-16 text-right" suppressHydrationWarning>
                        {formatTime(entry.at)}
                      </span>
                      <p className="text-sm leading-relaxed italic text-muted-foreground">
                        [A: {entry.question.answer === "yes" ? "Yes" : "No"}]
                      </p>
                    </div>
                  )
                })}
                {liveTranscript && !hasPersistedLiveTranscript ? (
                  <LiveTranscriptStream transcript={liveTranscript} />
                ) : null}
              </>
            )}
            {/* Pending questions at the bottom */}
            {pendingQuestions.map((q) => (
              <div key={`pending-${q.id}`} className="flex items-start gap-3 py-1.5 opacity-60">
                <span className="text-[10px] text-muted-foreground/40 tabular-nums pt-0.5 shrink-0 w-16 text-right" suppressHydrationWarning>
                  {formatTime(q.sentAt)}
                </span>
                <p className="text-sm leading-relaxed italic text-muted-foreground">
                  [Q: {q.text}] <span className="text-[10px] not-italic uppercase tracking-wider">— awaiting</span>
                </p>
              </div>
            ))}
            <div className="w-full h-4 bg-transparent pointer-events-none" />
          </div>
          <div className="shrink-0 border-t px-4 py-3">
            <form
              className="relative"
              onSubmit={(event) => {
                event.preventDefault()
                void submitBinaryQuestion()
              }}
            >
              <Input
                value={questionDraft}
                onChange={(event) => setQuestionDraft(event.target.value)}
                placeholder="Enter a binary question..."
                className="h-10 rounded-2xl border-border/60 bg-background/70 pr-11 text-sm shadow-none"
                maxLength={140}
                disabled={isSubmittingQuestion}
              />
              <button
                type="submit"
                aria-label="Send binary question"
                disabled={!questionDraft.trim() || isSubmittingQuestion}
                className="absolute right-1 top-1 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ArrowUp className="size-4" />
              </button>
            </form>
          </div>

          {/* Medical Info */}
          {medical && (
            <div className="shrink-0 border-t">
              <div className="flex items-center gap-2 px-6 py-2.5 border-b text-xs font-medium text-muted-foreground uppercase tracking-widest">
                <Heart className="size-3" />
                Medical
              </div>
              <div className="px-6 py-3 flex items-center gap-6 text-xs">
                {medical.age && (
                  <div>
                    <span className="text-muted-foreground/50 uppercase tracking-wider text-[10px]">Age</span>
                    <p className="font-medium mt-0.5">{medical.age}y/o</p>
                  </div>
                )}
                {medicalConditions && (
                  <div>
                    <span className="text-muted-foreground/50 uppercase tracking-wider text-[10px]">Conditions</span>
                    <p className="font-medium mt-0.5">{medicalConditions}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* map and video */}
        <div className="lg:col-span-3 flex flex-col min-h-0 overflow-hidden">
          {alert.location !== null ? <div className="flex-[2] flex flex-col min-h-0">
              <div className="flex items-center gap-2 px-6 py-2.5 border-b text-xs font-medium text-muted-foreground uppercase tracking-widest shrink-0">
                <Map className="size-3" />
                Location
              </div>
              <LocationMap location={alert.location} />
            </div> : (
            <div className="flex-[2] flex flex-col min-h-0">
              <div className="flex items-center gap-2 px-6 py-2.5 border-b text-xs font-medium text-muted-foreground uppercase tracking-widest shrink-0">
                <Map className="size-3" />
                No Location
              </div>
              <div className="flex-1 relative bg-muted/30">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <MapPin className="size-8 text-muted-foreground/20 mx-auto" />
                    <div className="text-xs text-muted-foreground/40 max-w-48 text-pretty">{coordinateLabel}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Video Feed */}
          <div className="flex-[3] flex flex-col min-h-0 border-t">
            <div className="flex items-center justify-between px-6 py-2.5 border-b text-xs font-medium text-muted-foreground uppercase tracking-widest shrink-0">
              <span className="flex items-center gap-2">
                <Video className="size-3" />
                Video Feed
              </span>
            </div>
            <div className="flex-1 relative bg-muted/30">
              {alert.meetingId ? (
                <VideoFeed
                  alertId={alert.id}
                  meetingId={alert.meetingId}
                  onLiveTranscriptChange={setLiveTranscript}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Video className="size-8 text-muted-foreground/20 mx-auto" />
                    <div className="text-xs text-muted-foreground/40">No feed available</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
