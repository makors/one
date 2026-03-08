'use client'

import { useEffect, useRef, useState } from "react"
import {
  RealtimeKitProvider,
  useRealtimeKitClient,
  useRealtimeKitMeeting,
  useRealtimeKitSelector,
} from "@cloudflare/realtimekit-react"
import { RtkGrid } from "@cloudflare/realtimekit-react-ui"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, TriangleAlert } from "lucide-react"

type VideoFeedProps = {
  alertId: string
  meetingId: string
  onLiveTranscriptChange?: (caption: LiveTranscript | null) => void
}

type MeetingInstance = ReturnType<typeof useRealtimeKitClient>[0]
type TranscriptEvent = {
  id: string
  name?: string
  transcript?: string
  isPartialTranscript?: boolean
  date?: Date | string
}
export type LiveTranscript = {
  id: string
  at: string
  text: string
  isPartial: boolean
}

const AUTH_MAX_RETRIES = 3
const AUTH_RETRY_BASE_MS = 1000
const LIVE_CAPTION_PARTIAL_TTL_MS = 2200
const LIVE_CAPTION_FINAL_TTL_MS = 4200
const authTokenCache = new Map<string, string>()
const authTokenRequests = new Map<string, Promise<string>>()
const joiningClients = new WeakMap<object, Promise<void>>()
const joinedClients = new WeakSet<object>()

function getDispatcherSessionId(): string {
  const key = "one:dispatcher-session-id"
  const existing = window.sessionStorage.getItem(key)
  if (existing) return existing
  const next = crypto.randomUUID()
  window.sessionStorage.setItem(key, next)
  return next
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isIgnoredRealtimeKitError(value: unknown): boolean {
  if (value instanceof Error) {
    return isIgnoredRealtimeKitError(value.message)
  }

  if (typeof value !== "string") {
    return false
  }

  return (
    value.includes("ERR1608") ||
    value.includes("No speaker found") ||
    value.includes("No audio output devices")
  )
}

async function requestMeetingAuthToken(meetingId: string): Promise<string> {
  const cached = authTokenCache.get(meetingId)
  if (cached) return cached

  const inFlight = authTokenRequests.get(meetingId)
  if (inFlight) return inFlight

  const request = fetch(`/api/meetings/${meetingId}/auth-token`, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { "x-dispatcher-session-id": getDispatcherSessionId() },
  })
    .then(async (res) => {
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.authToken) {
        throw new Error(data?.error ?? "Missing auth token")
      }
      authTokenCache.set(meetingId, data.authToken)
      return data.authToken as string
    })
    .finally(() => authTokenRequests.delete(meetingId))

  authTokenRequests.set(meetingId, request)
  return request
}

function clearMeetingAuthToken(meetingId: string) {
  authTokenCache.delete(meetingId)
  authTokenRequests.delete(meetingId)
}

function formatTranscriptLine(event: TranscriptEvent): string | null {
  const transcript = event.transcript?.trim()
  if (!transcript) return null
  return transcript
}

function createLiveTranscript(event: TranscriptEvent): LiveTranscript | null {
  const transcript = formatTranscriptLine(event)
  if (!transcript) return null

  return {
    id: event.id,
    at: event.date instanceof Date ? event.date.toISOString() : event.date ?? new Date().toISOString(),
    text: transcript,
    isPartial: Boolean(event.isPartialTranscript),
  }
}

async function persistTranscript(alertId: string, event: TranscriptEvent) {
  const text = formatTranscriptLine(event)
  if (!text) return

  const at =
    event.date instanceof Date ? event.date.toISOString() : event.date

  const response = await fetch(`/api/alerts/${alertId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "transcript",
      text,
      transcriptId: event.id,
      at,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error ?? "Failed to persist transcript")
  }
}

// ---------------------------------------------------------------------------
// FeedGrid — joins once, renders RtkGrid (video tiles only, no meeting shell)
// ---------------------------------------------------------------------------

function FeedGrid({
  alertId,
  meeting,
  onLiveTranscriptChange,
}: {
  alertId: string
  meeting: MeetingInstance
  onLiveTranscriptChange?: (caption: LiveTranscript | null) => void
}) {
  const { meeting: client } = useRealtimeKitMeeting()
  const roomJoined = useRealtimeKitSelector(
    (m: any) => Boolean(m?.self?.roomJoined)
  )
  const [joinError, setJoinError] = useState<string | null>(null)
  const syncedTranscriptIdsRef = useRef<Set<string>>(new Set())
  const liveCaptionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (liveCaptionTimeoutRef.current) {
        clearTimeout(liveCaptionTimeoutRef.current)
      }

      onLiveTranscriptChange?.(null)
    }
  }, [onLiveTranscriptChange])

  useEffect(() => {
    if (client && roomJoined) {
      joinedClients.add(client as object)
      setJoinError(null)
    }
  }, [client, roomJoined])

  useEffect(() => {
    if (!client) return

    if (roomJoined || joinedClients.has(client as object)) {
      return
    }

    if (joiningClients.has(client as object)) {
      return
    }

    setJoinError(null)

    const join =
      typeof (client as any).join === "function"
        ? () => (client as any).join()
        : typeof (client as any).joinRoom === "function"
          ? () => (client as any).joinRoom()
          : null

    if (!join) {
      setJoinError("Meeting client does not support joining")
      return
    }

    const joinPromise = Promise.resolve(join())
      .then(() => {
        joinedClients.add(client as object)
        setJoinError(null)
      })
      .catch((err) => {
        setJoinError(err instanceof Error ? err.message : "Failed to join room")
      })
      .finally(() => {
        joiningClients.delete(client as object)
      })

    joiningClients.set(client as object, joinPromise)
  }, [client, roomJoined])

  useEffect(() => {
    if (!client || !roomJoined) return

    const ai = (client as any).ai
    if (!ai) return

    let cancelled = false

    const setLiveTranscript = (event: TranscriptEvent) => {
      const nextCaption = createLiveTranscript(event)
      if (!nextCaption) return

      onLiveTranscriptChange?.(nextCaption)

      if (liveCaptionTimeoutRef.current) {
        clearTimeout(liveCaptionTimeoutRef.current)
      }

      liveCaptionTimeoutRef.current = setTimeout(() => {
        onLiveTranscriptChange?.(null)
      }, event.isPartialTranscript ? LIVE_CAPTION_PARTIAL_TTL_MS : LIVE_CAPTION_FINAL_TTL_MS)
    }

    const syncTranscript = (event: TranscriptEvent) => {
      setLiveTranscript(event)

      if (
        cancelled ||
        !event?.id ||
        event.isPartialTranscript ||
        syncedTranscriptIdsRef.current.has(event.id)
      ) {
        return
      }

      syncedTranscriptIdsRef.current.add(event.id)

      void persistTranscript(alertId, event).catch((err) => {
        syncedTranscriptIdsRef.current.delete(event.id)

        if (!isIgnoredRealtimeKitError(err)) {
          console.error("[VideoFeed][transcript]", err)
        }
      })
    }

    const existingTranscripts = Array.isArray(ai.transcripts)
      ? (ai.transcripts as TranscriptEvent[])
      : []

    for (const transcript of existingTranscripts) {
      syncTranscript(transcript)
    }

    if (typeof ai.on === "function") {
      ai.on("transcript", syncTranscript)
    }

    return () => {
      cancelled = true

      if (typeof ai.off === "function") {
        ai.off("transcript", syncTranscript)
      }

      if (liveCaptionTimeoutRef.current) {
        clearTimeout(liveCaptionTimeoutRef.current)
      }

      onLiveTranscriptChange?.(null)
    }
  }, [alertId, client, onLiveTranscriptChange, roomJoined])

  if (!roomJoined) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          {joinError ? (
            <>
              <TriangleAlert className="size-5 text-muted-foreground/30" />
              <p className="max-w-xs text-xs text-muted-foreground/50">{joinError}</p>
            </>
          ) : (
            <>
              <Loader2 className="size-5 animate-spin text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground/50">Connecting to caller…</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return <RtkGrid meeting={meeting} gap={8} aspectRatio="16:9" size="sm" />
}

// ---------------------------------------------------------------------------
// VideoFeed — visibility gate
// ---------------------------------------------------------------------------

export default function VideoFeed({
  alertId,
  meetingId,
  onLiveTranscriptChange,
}: VideoFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="h-full">
      {visible ? (
        <VideoFeedInner
          key={`${alertId}:${meetingId}`}
          alertId={alertId}
          meetingId={meetingId}
          onLiveTranscriptChange={onLiveTranscriptChange}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground/30" />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// VideoFeedInner — token fetch + init + provider
// ---------------------------------------------------------------------------

function VideoFeedInner({
  alertId,
  meetingId,
  onLiveTranscriptChange,
}: VideoFeedProps) {
  const [meeting, initMeeting] = useRealtimeKitClient()
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const initializedTokenRef = useRef<string | null>(null)

  useEffect(() => {
    const originalConsoleError = console.error

    console.error = (...args: unknown[]) => {
      if (args.some((arg) => isIgnoredRealtimeKitError(arg))) {
        return
      }

      originalConsoleError.apply(console, args)
    }

    return () => {
      console.error = originalConsoleError
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setError(null)
      setAuthToken(null)

      for (let i = 0; i <= AUTH_MAX_RETRIES; i++) {
        if (cancelled) return
        try {
          const token = await requestMeetingAuthToken(meetingId)
          if (!cancelled) setAuthToken(token)
          return
        } catch (err) {
          if (i === AUTH_MAX_RETRIES) {
            if (!cancelled) setError(err instanceof Error ? err.message : String(err))
          } else {
            await sleep(AUTH_RETRY_BASE_MS * 2 ** i)
          }
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [meetingId, retryKey])

  useEffect(() => {
    if (!authToken || initializedTokenRef.current === authToken) return
    initializedTokenRef.current = authToken
    initMeeting({
      authToken,
      defaults: { audio: false, video: false },
      onError: (err) => {
        if (isIgnoredRealtimeKitError(err)) {
          return
        }

        console.error("[VideoFeed]", err)
      },
    })
  }, [authToken, initMeeting])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-xs space-y-3 text-center">
          <TriangleAlert className="mx-auto size-8 text-muted-foreground/20" />
          <p className="text-sm font-medium">Couldn&apos;t load feed</p>
          <p className="text-xs text-muted-foreground/50">{error}</p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => {
              initializedTokenRef.current = null
              clearMeetingAuthToken(meetingId)
              setRetryKey((k) => k + 1)
            }}
          >
            <RefreshCw className="size-3" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!authToken) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground/30" />
      </div>
    )
  }

  return (
    <RealtimeKitProvider
      value={meeting}
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground/30" />
        </div>
      }
    >
      <FeedGrid
        alertId={alertId}
        meeting={meeting}
        onLiveTranscriptChange={onLiveTranscriptChange}
      />
    </RealtimeKitProvider>
  )
}
