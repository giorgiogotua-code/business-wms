"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"

interface RsGeStatusCardProps {
    status: "connected" | "disconnected" | "checking" | "unknown"
    message?: string
}

export function RsGeStatusCard({ status, message }: RsGeStatusCardProps) {
    const config = {
        connected: {
            icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
            label: "დაკავშირებულია",
            bg: "bg-green-50",
            border: "border-green-200",
            text: "text-green-700"
        },
        disconnected: {
            icon: <XCircle className="h-5 w-5 text-destructive" />,
            label: "ვერ უკავშირდება",
            bg: "bg-red-50",
            border: "border-red-200",
            text: "text-red-700"
        },
        checking: {
            icon: <AlertCircle className="h-5 w-5 text-blue-500 animate-pulse" />,
            label: "მოწმდება...",
            bg: "bg-blue-50",
            border: "border-blue-200",
            text: "text-blue-700"
        },
        unknown: {
            icon: <AlertCircle className="h-5 w-5 text-muted-foreground" />,
            label: "არ არის კონფიგურირებული",
            bg: "bg-muted/50",
            border: "border-border",
            text: "text-muted-foreground"
        }
    }

    const { icon, label, bg, border, text } = config[status]

    return (
        <Card className={`${bg} ${border} shadow-none`}>
            <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                    {icon}
                    <div>
                        <p className={`font-bold ${text}`}>{label}</p>
                        {message && <p className={`text-xs ${text} opacity-80 mt-1`}>{message}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
