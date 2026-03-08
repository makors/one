import { addClient, removeClient } from "@/lib/events"
import { sendInitTo } from "@/lib/alerts-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// reminds me of golang websockets honestly...
export function GET() {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      addClient(controller)
      // dump all existing alerts so page refreshes work
      sendInitTo(controller)

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"))
        } catch {
          clearInterval(heartbeat)
        }
      }, 30_000) // this is just to keep the connection alive
    },
    cancel(controller) {
      removeClient(controller as ReadableStreamDefaultController<Uint8Array>)
    },
  })

  // returns a websocket-like stream, but with SSE headers
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
