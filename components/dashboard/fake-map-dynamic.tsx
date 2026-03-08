'use client'

import { Alert } from "@/lib/stores/alerts"
import { cn } from "@/lib/utils"

// Generate deterministic pseudo-random numbers from a string seed
function seededRandom(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash) / 2147483647
}

export function FakeMapDynamic({ alert, className }: { alert: Alert; className?: string }) {
  const seed = alert.id
  const rand = (offset: string) => seededRandom(seed + offset)
  
  // Generate dynamic values based on alert ID
  const markerTop = 30 + rand('top') * 40  // 30-70%
  const markerLeft = 20 + rand('left') * 60 // 20-80%
  const rotation = Math.floor(rand('rot') * 360)
  const zoomLevel = Math.floor(rand('zoom') * 3) + 1
  
  // Different color themes based on priority
  const themes = {
    critical: { bg: 'bg-red-50 dark:bg-red-950/20', marker: 'bg-red-500' },
    high: { bg: 'bg-orange-50 dark:bg-orange-950/20', marker: 'bg-orange-500' },
    medium: { bg: 'bg-yellow-50 dark:bg-yellow-950/20', marker: 'bg-yellow-500' },
  }
  const theme = themes[alert.priority]
  
  return (
    <div className={cn("relative overflow-hidden rounded-lg border", theme.bg, className)}>
      {/* Rotating map grid based on alert */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{ transform: `rotate(${rotation}deg) scale(${1 + zoomLevel * 0.1})` }}
      >
        {/* Streets */}
        {[...Array(5)].map((_, i) => (
          <div 
            key={`h-${i}`}
            className="absolute left-0 right-0 h-[1px] bg-gray-400"
            style={{ top: `${20 + i * 15}%` }}
          />
        ))}
        {[...Array(5)].map((_, i) => (
          <div 
            key={`v-${i}`}
            className="absolute top-0 bottom-0 w-[1px] bg-gray-400"
            style={{ left: `${15 + i * 17}%` }}
          />
        ))}
      </div>

      {/* Dynamic landmark areas */}
      <div 
        className="absolute bg-green-200/40 dark:bg-green-800/20 rounded-xl"
        style={{ 
          top: `${rand('park1') * 60}%`, 
          left: `${rand('park1x') * 60}%`, 
          width: `${20 + rand('park1w') * 20}%`,
          height: `${15 + rand('park1h') * 15}%`
        }}
      />
      <div 
        className="absolute bg-blue-200/30 dark:bg-blue-800/15 rounded-xl"
        style={{ 
          top: `${rand('water1') * 50}%`, 
          right: `${rand('water1x') * 30}%`, 
          width: `${25 + rand('water1w') * 15}%`,
          height: `${20 + rand('water1h') * 20}%`
        }}
      />

      {/* Buildings */}
      {[...Array(3)].map((_, i) => (
        <div 
          key={`bldg-${i}`}
          className="absolute bg-gray-400/40 dark:bg-gray-500/30 rounded"
          style={{
            top: `${30 + rand(`bldg${i}t`) * 50}%`,
            left: `${20 + rand(`bldg${i}l`) * 60}%`,
            width: `${6 + rand(`bldg${i}w`) * 8}%`,
            height: `${8 + rand(`bldg${i}h`) * 10}%`
          }}
        />
      ))}

      {/* Pulsing marker */}
      <div 
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ top: `${markerTop}%`, left: `${markerLeft}%` }}
      >
        <div className="absolute inset-0 -m-6">
          <div 
            className={cn("absolute inset-0 rounded-full animate-ping", theme.marker.replace('bg-', 'bg-').replace('500', '500/20'))}
            style={{ animationDuration: `${2 + rand('pulse')}s` }}
          />
        </div>
        <div className="absolute inset-0 -m-3">
          <div className={cn("absolute inset-0 rounded-full animate-pulse", theme.marker.replace('bg-', 'bg-').replace('500', '500/30'))} />
        </div>
        <div className={cn("relative w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center", theme.marker)}>
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
        <div className={cn("absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent -mt-1", theme.marker.replace('bg-', 'border-t-'))} />
      </div>

      {/* Dynamic radius circle */}
      <div 
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-red-400/40"
        style={{ 
          top: `${markerTop}%`, 
          left: `${markerLeft}%`,
          width: `${80 + rand('radius') * 60}px`,
          height: `${80 + rand('radius') * 60}px`
        }}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-white/90 dark:bg-black/80 backdrop-blur px-3 py-2 flex items-center justify-between text-xs z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-muted-foreground">GPS ACTIVE</span>
        </div>
        <span className="font-mono text-muted-foreground">
          {(40 + rand('lat') * 0.1).toFixed(4)}° N, {(74 + rand('lng') * 0.1).toFixed(4)}° W
        </span>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur rounded-lg shadow-md overflow-hidden z-10">
        <button className="w-8 h-8 flex items-center justify-center hover:bg-muted border-b border-border text-lg font-bold">+</button>
        <button className="w-8 h-8 flex items-center justify-center hover:bg-muted text-lg font-bold">−</button>
      </div>

      {/* Location info */}
      <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-black/90 backdrop-blur rounded-lg shadow-md p-3 max-w-[180px] z-10">
        <p className="text-xs font-semibold">{alert.location.split('—')[0]?.trim() || 'Incident'}</p>
        <p className="text-[10px] text-muted-foreground mt-1">Accuracy: ±{(5 + rand('acc') * 20).toFixed(0)}m</p>
        <div className="flex items-center gap-1 mt-1">
          <div className={cn("w-1.5 h-1.5 rounded-full", theme.marker)} />
          <span className="text-[10px] text-muted-foreground">{(0.1 + rand('radius-mi') * 0.5).toFixed(1)} mi radius</span>
        </div>
      </div>

      {/* Compass */}
      <div className="absolute top-10 right-3 w-10 h-10 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur shadow-md flex items-center justify-center z-10">
        <div className="relative w-6 h-6" style={{ transform: `rotate(${rotation}deg)` }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] font-bold text-red-500">N</div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] font-bold text-muted-foreground">S</div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted-foreground">W</div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted-foreground">E</div>
        </div>
      </div>
    </div>
  )
}
