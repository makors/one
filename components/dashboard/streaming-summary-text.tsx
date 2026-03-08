'use client'

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const STREAMING_CHAR_INTERVAL_MS = 20

function getCommonPrefixLength(a: string, b: string) {
  const max = Math.min(a.length, b.length)
  let index = 0

  while (index < max && a[index] === b[index]) {
    index += 1
  }

  return index
}

export default function StreamingSummaryText({
  text,
  className,
}: {
  text?: string | null
  className?: string
}) {
  const safeText = text ?? ""
  const [visibleLength, setVisibleLength] = useState(safeText.length)
  const previousTextRef = useRef(safeText)
  const isFirstRenderRef = useRef(true)

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      previousTextRef.current = safeText
      return
    }

    const previousText = previousTextRef.current
    if (safeText === previousText) return

    previousTextRef.current = safeText
    const commonPrefixLength = getCommonPrefixLength(previousText, safeText)

    setVisibleLength((current) => {
      if (safeText.startsWith(previousText)) {
        return Math.min(current, previousText.length)
      }

      return Math.min(current, commonPrefixLength)
    })
  }, [safeText])

  useEffect(() => {
    if (visibleLength >= safeText.length) return

    const interval = window.setInterval(() => {
      setVisibleLength((current) => {
        if (current >= safeText.length) {
          window.clearInterval(interval)
          return current
        }

        const remaining = safeText.length - current
        const nextStep = remaining > 32 ? 4 : remaining > 16 ? 2 : 1
        return Math.min(safeText.length, current + nextStep)
      })
    }, STREAMING_CHAR_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [safeText, visibleLength])

  const visibleText = safeText.slice(0, visibleLength)
  const isStreaming = visibleLength < safeText.length

  return (
    <span
      className={cn(
        "inline transition-[opacity,filter] duration-300",
        isStreaming && "opacity-95 saturate-150",
        className
      )}
    >
      {visibleText}
      <span
        aria-hidden="true"
        className={cn(
          "ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] rounded-full bg-current align-baseline transition-opacity duration-200",
          isStreaming ? "animate-pulse opacity-75" : "opacity-0"
        )}
      />
    </span>
  )
}
