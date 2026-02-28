"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, RefreshCw, FileText } from "lucide-react"
import { useRsGe } from "@/hooks/useRsGe"
import { format, subDays } from "date-fns"
import { generateInvoicePDF } from "@/lib/pdf/generator"
import { Printer } from "lucide-react"

export default function InvoicesPage() {
    const { getInvoices, loading } = useRsGe()
    const [invoices, setInvoices] = useState<any[]>([])
    const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"))
    const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"))

    const fetchInvoices = async () => {
        const data = await getInvoices(dateFrom, dateTo)
        if (data) setInvoices(data)
    }

    useEffect(() => {
        fetchInvoices()
    }, [])

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{"ფაქტურები"}</h1>
                    <p className="text-sm text-muted-foreground">{"დღგ-ს საგადასახადო ფაქტურების მართვა"}</p>
                </div>
                <Link href="/dashboard/invoices/create">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        {"ახალი ფაქტურა"}
                    </Button>
                </Link>
            </div>

            <Card>
                <CardContent className="pt-6 flex flex-wrap items-end gap-4">
                    <div className="flex flex-col gap-2">
                        <Label>{"თარიღიდან"}</Label>
                        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>{"თარიღამდე"}</Label>
                        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                    </div>
                    <Button variant="outline" onClick={fetchInvoices} disabled={loading} className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        {"განახლება"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="p-4 text-left">{"ნომერი"}</th>
                                <th className="p-4 text-left">{"თარიღი"}</th>
                                <th className="p-4 text-left">{"მყიდველი"}</th>
                                <th className="p-4 text-right">{"თანხა"}</th>
                                <th className="p-4 text-right">{"დღგ"}</th>
                                <th className="p-4 text-center">{"სტატუსი"}</th>
                                <th className="p-4 text-right">{"ქმედება"}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                        {loading ? "იტვირთება..." : "ფაქტურები ვერ მოიძებნა"}
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="p-4 font-bold">{inv.number}</td>
                                        <td className="p-4 text-muted-foreground">{inv.createDate}</td>
                                        <td className="p-4">
                                            <p>{inv.buyerName}</p>
                                            <p className="text-xs text-muted-foreground">{inv.buyerTin}</p>
                                        </td>
                                        <td className="p-4 text-right font-medium">{inv.totalAmount.toFixed(2)} ₾</td>
                                        <td className="p-4 text-right">{inv.vatAmount.toFixed(2)} ₾</td>
                                        <td className="p-4 text-center">{inv.status}</td>
                                        <td className="p-4 text-right">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => generateInvoicePDF(inv)} title="ჩამოტვირთვა PDF">
                                                <Printer className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    )
}
