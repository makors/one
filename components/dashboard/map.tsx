'use client'

import { Alert } from "@/lib/stores/alerts"
import { useState } from "react"
import { RealMap } from "./real-map"
import { FakeMapDynamic } from "./fake-map-dynamic"

export function Map({ alert, className }: { alert: Alert; className?: string }) {
  const [useRealMap, setUseRealMap] = useState(true)

  return (
    <div className="relative h-full">
      {useRealMap ? (
        <RealMap alert={alert} className={className} />
      ) : (
        <FakeMapDynamic alert={alert} className={className} />
      )}
      
      {/* Toggle button */}
      <button 
        onClick={() => setUseRealMap(!useRealMap)}
        className="absolute bottom-16 right-3 z-[1000] bg-white/95 dark:bg-black/90 backdrop-blur text-[10px] px-3 py-1.5 rounded shadow hover:bg-muted transition-colors font-medium"
      >
        {useRealMap ? '🗺️ Using Real Map' : '🎨 Using Mock Map'}
      </button>
    </div>
  )
}
