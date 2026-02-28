"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useRsGe } from "@/hooks/useRsGe"
import { TinLookupResult } from "@/lib/rs-ge/types"

interface TinInputProps {
    value: string
    onChange: (value: string) => void
    onFound: (result: TinLookupResult) => void
}

export function TinInput({ value, onChange, onFound }: TinInputProps) {
    const { lookupTin, loading, error } = useRsGe()
    const [name, setName] = useState("")

    const handleBlur = async () => {
        if (value.length >= 9) {
            const result = await lookupTin(value)
            if (result) {
                setName(result.name)
                onFound(result)
            }
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <Label>{"საიდენტიფიკაციო კოდი (ს/კ) *"}</Label>
            <div className="relative">
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={handleBlur}
                    placeholder="9 ან 11 ნიშნა კოდი"
                    className={loading ? "pr-10" : ""}
                />
                {loading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                {!loading && name && <CheckCircle2 className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />}
            </div>
            {name && (
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium">{name}</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {"დღგ-ს გადამხდელი"}
                    </Badge>
                </div>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    )
}
