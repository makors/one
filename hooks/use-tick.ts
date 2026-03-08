"use client"

import { useState, useEffect } from "react"

// Forces a re-render every `ms` milliseconds. Used to keep timeAgo values live.
export function useTick(ms = 1000) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms)
    return () => clearInterval(id)
  }, [ms])
}
