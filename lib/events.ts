// In-memory SSE event bus.
// Uses globalThis so state is shared across module re-evaluations in dev mode.

type Controller = ReadableStreamDefaultController<Uint8Array>

const g = globalThis as unknown as { __sseClients?: Set<Controller> }
if (!g.__sseClients) g.__sseClients = new Set()
const clients = g.__sseClients

export function addClient(controller: Controller) {
  clients.add(controller)
}

export function removeClient(controller: Controller) {
  clients.delete(controller)
}

export function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  const encoded = new TextEncoder().encode(payload)
  for (const client of clients) {
    try {
      client.enqueue(encoded)
    } catch {
      clients.delete(client)
    }
  }
}

// Send to a single client (used for init on connect)
export function sendTo(controller: Controller, event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  controller.enqueue(new TextEncoder().encode(payload))
}
