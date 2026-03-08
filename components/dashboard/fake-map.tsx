'use client'

import { cn } from "@/lib/utils"

export function FakeMap({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg border bg-[#e8e4dc] dark:bg-[#2a2a2a]", className)}>
      {/* Grid lines - streets */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-[20%] left-0 right-0 h-[2px] bg-gray-400/50" />
        <div className="absolute top-[45%] left-0 right-0 h-[2px] bg-gray-400/50" />
        <div className="absolute top-[70%] left-0 right-0 h-[2px] bg-gray-400/50" />
        <div className="absolute left-[15%] top-0 bottom-0 w-[2px] bg-gray-400/50" />
        <div className="absolute left-[40%] top-0 bottom-0 w-[2px] bg-gray-400/50" />
        <div className="absolute left-[65%] top-0 bottom-0 w-[2px] bg-gray-400/50" />
        <div className="absolute left-[85%] top-0 bottom-0 w-[2px] bg-gray-400/50" />
      </div>

      {/* Park/area shading */}
      <div className="absolute top-[25%] left-[20%] w-[30%] h-[35%] bg-green-200/30 dark:bg-green-900/20 rounded-lg" />
      <div className="absolute top-[10%] right-[10%] w-[20%] h-[25%] bg-blue-200/20 dark:bg-blue-900/10 rounded-lg" />

      {/* Building blocks */}
      <div className="absolute top-[50%] left-[50%] w-[8%] h-[12%] bg-gray-300/50 dark:bg-gray-600/30 rounded" />
      <div className="absolute top-[55%] left-[60%] w-[6%] h-[8%] bg-gray-300/50 dark:bg-gray-600/30 rounded" />
      <div className="absolute top-[30%] left-[70%] w-[10%] h-[10%] bg-gray-300/50 dark:bg-gray-600/30 rounded" />

      {/* Location marker with pulse */}
      <div className="absolute top-[45%] left-[42%] -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 -m-4">
          <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        <div className="absolute inset-0 -m-2">
          <div className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse" />
        </div>
        <div className="relative w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent border-t-red-500 -mt-1" />
      </div>

      {/* Distance radius circle */}
      <div className="absolute top-[45%] left-[42%] -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] rounded-full border-2 border-dashed border-red-400/40" />

      {/* Top bar - coordinates */}
      <div className="absolute top-0 left-0 right-0 bg-white/90 dark:bg-black/80 backdrop-blur px-3 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-muted-foreground">GPS ACTIVE</span>
        </div>
        <span className="font-mono text-muted-foreground">40.7128° N, 74.0060° W</span>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur rounded-lg shadow-md overflow-hidden">
        <button className="w-8 h-8 flex items-center justify-center hover:bg-muted border-b border-border text-lg font-bold">+</button>
        <button className="w-8 h-8 flex items-center justify-center hover:bg-muted text-lg font-bold">−</button>
      </div>

      {/* Location info card */}
      <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-black/90 backdrop-blur rounded-lg shadow-md p-3 max-w-[180px]">
        <p className="text-xs font-semibold">Incident Location</p>
        <p className="text-[10px] text-muted-foreground mt-1">Accuracy: ±12m</p>
        <div className="flex items-center gap-1 mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-[10px] text-muted-foreground">0.3 mi radius</span>
        </div>
      </div>

      {/* Compass */}
      <div className="absolute top-10 right-3 w-10 h-10 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur shadow-md flex items-center justify-center">
        <div className="relative w-6 h-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] font-bold text-red-500">N</div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] font-bold text-muted-foreground">S</div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted-foreground">W</div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted-foreground">E</div>
        </div>
      </div>
    </div>
  )
}
