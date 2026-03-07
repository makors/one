'use client';

import { useAlertsStore } from "@/lib/stores/alerts"
import AlertCard from "@/components/dashboard/alert-card"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
  } from "@/components/ui/empty"
import { AlertCircle, CircleAlert } from "lucide-react";

export default function DashboardPage() {
    const alerts = useAlertsStore((state) => state.alerts);
    const activeAlerts = alerts.filter((alert) => alert.status === "active");

    return (
        <div className="flex flex-col h-full w-full border-r md:w-2/7 overflow-y-auto">
            <div className="w-full sticky top-0 bg-background z-10">
                <div className="flex items-center gap-2 border-b px-8 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Alerts
                </div>
            </div>
            {activeAlerts.length === 0 ? <>
                <Empty className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleAlert className="size-10 bg-[oklch(0.145_0_0)]" />
        </EmptyMedia>
        <EmptyTitle>No Alerts</EmptyTitle>
        <EmptyDescription className="max-w-xs text-pretty">
          You&apos;re all caught up. New alerts will appear here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
            </> : (
                activeAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                ))
            )}
        </div>
    )
}
