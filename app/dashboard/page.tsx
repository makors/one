'use client';

import { useState } from 'react';
import { useAlertsStore } from "@/lib/stores/alerts"
import AlertCard from "@/components/dashboard/alert-card"
import { AlertDetailsPanel } from "@/components/dashboard/alert-details"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import { CircleAlert } from "lucide-react";

export default function DashboardPage() {
    const alerts = useAlertsStore((state) => state.alerts);
    const activeAlerts = alerts.filter((alert) => alert.status === "active");
    const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
    
    const selectedAlert = selectedAlertId ? alerts.find(a => a.id === selectedAlertId) : null;

    return (
        <div className="flex h-full">
            {/* Left Panel - Alert List */}
            <div className="flex flex-col h-full w-2/5 border-r overflow-y-auto">
                <div className="w-full sticky top-0 bg-background z-10">
                    <div className="flex items-center gap-2 border-b px-8 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                        Alerts
                    </div>
                </div>
                {activeAlerts.length === 0 ? (
                    <Empty className="h-full">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <CircleAlert className="size-10 bg-[oklch(0.145_0_0)]" />
                            </EmptyMedia>
                            <EmptyTitle>No Alerts</EmptyTitle>
                            <EmptyDescription className="max-w-xs text-pretty">
                                You're all caught up. New alerts will appear here.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    activeAlerts.map((alert) => (
                        <AlertCard 
                            key={alert.id} 
                            alert={alert} 
                            onClick={() => setSelectedAlertId(alert.id)} 
                            isSelected={selectedAlertId === alert.id}
                        />
                    ))
                )}
            </div>

            {/* Right Panel - Alert Details */}
            <div className="flex-1 bg-muted/30">
                {selectedAlert ? (
                    <AlertDetailsPanel alert={selectedAlert} />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                        <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                            <CircleAlert className="size-8 opacity-40" />
                        </div>
                        <div className="text-center">
                            <p className="font-medium">No alert selected</p>
                            <p className="text-sm opacity-60">Click an alert to view details</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
