'use client'

import { useEffect } from 'react'

const SUPPRESSED_PATTERNS = [
  'ERR1608',
  'No speaker found',
  'No audio output devices',
]

// I call it: la HackTJ Demoer Error Suppressor.....

function isSuppressed(value: unknown): boolean {
  const msg =
    value instanceof Error
      ? value.message
      : typeof value === 'string'
        ? value
        : null

  if (!msg) return false
  return SUPPRESSED_PATTERNS.some((p) => msg.includes(p))
}

export function DevErrorSuppressor() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (isSuppressed(e.message) || isSuppressed(e.error)) {
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }

    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      if (isSuppressed(e.reason)) {
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }

    window.addEventListener('error', onError, { capture: true })
    window.addEventListener('unhandledrejection', onUnhandledRejection, { capture: true })

    return () => {
      window.removeEventListener('error', onError, { capture: true })
      window.removeEventListener('unhandledrejection', onUnhandledRejection, { capture: true })
    }
  }, [])

  return null
}
