"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Search, RefreshCw, Printer, Trash2, Send } from "lucide-react"
import { useRsGe } from "@/hooks/useRsGe"
import { WaybillStatusBadge } from "@/components/rs-ge/WaybillStatusBadge"
import { toast } from "sonner"
import { format, subDays } from "date-fns"
import { generateWaybillPDF } from "@/lib/pdf/generator"

export default function WaybillsPage() {
    const { getWaybills, sendWaybill, deleteWaybill, loading, error } = useRsGe()
    const [waybills, setWaybills] = useState<any[]>([])
    const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"))
    const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"))

    const fetchWaybills = async () => {
        const data = await getWaybills(dateFrom, dateTo)
        if (data) setWaybills(data)
    }

    useEffect(() => {
        fetchWaybills()
    }, [])

    const handleSend = async (id: string) => {
        if (await sendWaybill(id)) {
            toast.success("ზედნადები გაიგზავნა")
            fetchWaybills()
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("დარწმუნებული ხართ რომ გსურთ ზედნადების წაშლა?")) return
        if (await deleteWaybill(id)) {
            toast.success("ზედნადები წაიშალა")
            fetchWaybills()
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{"ზედნადებები"}</h1>
                    <p className="text-sm text-muted-foreground">{"rs.ge-სთან სინქრონიზებული ზედნადებების მართვა"}</p>
                </div>
                <Link href="/dashboard/waybills/create">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        {"ახალი ზედნადები"}
                    </Button>
                </Link>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex flex-col gap-2">
                            <Label>{"თარიღიდან"}</Label>
                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>{"თარიღამდე"}</Label>
                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                        </div>
                        <Button variant="outline" onClick={fetchWaybills} disabled={loading} className="gap-2">
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            {"განახლება"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="p-4 text-left font-medium">{"ნომერი"}</th>
                                    <th className="p-4 text-left font-medium">{"თარიღი"}</th>
                                    <th className="p-4 text-left font-medium">{"მყიდველი"}</th>
                                    <th className="p-4 text-left font-medium">{"სტატუსი"}</th>
                                    <th className="p-4 text-right font-medium">{"ქმედება"}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {waybills.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                                            {loading ? "იტვირთება..." : "ზედნადებები ვერ მოიძებნა"}
                                        </td>
                                    </tr>
                                ) : (
                                    waybills.map((wb) => (
                                        <tr key={wb.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-4 font-mono font-bold text-primary">{wb.number}</td>
                                            <td className="p-4 text-muted-foreground">{wb.createDate}</td>
                                            <td className="p-4">
                                                <p className="font-medium">{wb.buyerName}</p>
                                                <p className="text-xs text-muted-foreground">{wb.buyerTin}</p>
                                            </td>
                                            <td className="p-4">
                                                <WaybillStatusBadge status={wb.status} />
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => generateWaybillPDF(wb)} title="ჩამოტვირთვა PDF">
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                    {wb.status === "0" && (
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500" onClick={() => handleSend(String(wb.id))}>
                                                            <Send className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(String(wb.id))}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
