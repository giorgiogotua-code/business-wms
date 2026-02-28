"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Link as LinkIcon, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { RsGeStatusCard } from "@/components/rs-ge/RsGeStatusCard"

export default function SettingsPage() {
    const [su, setSu] = useState("")
    const [sp, setSp] = useState("")
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<"connected" | "disconnected" | "checking" | "unknown">("unknown")

    useEffect(() => {
        fetch("/api/settings")
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) {
                    setSu(res.data.rs_service_user || "")
                    setSp(res.data.rs_service_password || "")
                    if (res.data.rs_service_user) setStatus("connected")
                }
            })
    }, [])

    const handleSave = async () => {
        setLoading(true)
        const res = await fetch("/api/settings", {
            method: "POST",
            body: JSON.stringify({ rs_service_user: su, rs_service_password: sp })
        })
        const result = await res.json()
        if (result.success) {
            toast.success("პარამეტრები შენახულია")
            setStatus("connected")
        } else {
            toast.error("შენახვა ვერ მოხერხდა")
        }
        setLoading(false)
    }

    return (
        <div className="flex flex-col gap-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold">{"პარამეტრები"}</h1>
                <p className="text-sm text-muted-foreground">{"სისტემის და rs.ge-ს კონფიგურაცია"}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-primary" />
                        {"rs.ge კავშირი"}
                    </CardTitle>
                    <CardDescription>
                        {"შეიყვანეთ rs.ge-ს სერვის-მომხმარებლის მონაცემები ზედნადებების ავტომატური მართვისთვის"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <RsGeStatusCard status={status} />

                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <Label>{"Service User (su)"}</Label>
                            <Input value={su} onChange={(e) => setSu(e.target.value)} placeholder="მაგ: my_company_service" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>{"Service Password (sp)"}</Label>
                            <Input type="password" value={sp} onChange={(e) => setSp(e.target.value)} placeholder="••••••••" />
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                            {"მონაცემები შეგიძლიათ მიიღოთ rs.ge-ზე ავტორიზაციის შემდეგ: ჩემი გვერდი -> სერვისები -> სერვისის მომხმარებლის დამატება. დარწმუნდით, რომ გააქტიურებულია 'ზედნადებების მართვის' უფლება."}
                        </p>
                    </div>

                    <Button className="w-full gap-2" onClick={handleSave} disabled={loading}>
                        <Save className="h-4 w-4" />
                        {loading ? "ინახება..." : "შენახვა"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
