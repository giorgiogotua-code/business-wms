"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, ChevronLeft, FileText } from "lucide-react"
import { useRsGe } from "@/hooks/useRsGe"
import { TinInput } from "@/components/rs-ge/TinInput"
import { GoodsTable } from "@/components/rs-ge/GoodsTable"
import { toast } from "sonner"

export default function CreateInvoicePage() {
    const router = useRouter()
    const { saveInvoice, loading } = useRsGe()

    const [buyerTin, setBuyerTin] = useState("")
    const [buyerName, setBuyerName] = useState("")
    const [comment, setComment] = useState("")

    const [goods, setGoods] = useState<any[]>([
        { name: "", quantity: 1, price: 0, unitId: 5 }
    ])

    const subtotal = goods.reduce((sum, g) => sum + (g.quantity * g.price), 0)
    const vat = subtotal * 0.18
    const total = subtotal + vat

    const handleSave = async () => {
        if (!buyerTin || !buyerName) {
            toast.error("გთხოვთ შეავსოთ მყიდველის მონაცემები")
            return
        }

        const data = {
            buyerTin,
            buyerName,
            comment,
            items: goods.map(g => ({ ...g, vatRate: 18 }))
        }

        const result = await saveInvoice(data)
        if (result) {
            toast.success("ფაქტურა წარმატებით აიტვირთა rs.ge-ზე")
            router.push("/dashboard/invoices")
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold">{"ახალი ფაქტურა"}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{"მყიდველი"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <TinInput value={buyerTin} onChange={setBuyerTin} onFound={(r) => setBuyerName(r.name)} />
                            <div className="flex flex-col gap-2">
                                <Label>{"კომენტარი"}</Label>
                                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="..." />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{"საქონელი და მომსახურება"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <GoodsTable goods={goods} onChange={setGoods} />
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>{"დაჯამება"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>{"ქვე-ჯამი"}</span>
                                    <span>{subtotal.toFixed(2)} ₾</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>{"დღგ (18%)"}</span>
                                    <span>{vat.toFixed(2)} ₾</span>
                                </div>
                                <div className="pt-2 border-t flex justify-between font-bold">
                                    <span>{"სულ ჯამი"}</span>
                                    <span className="text-xl text-primary">{total.toFixed(2)} ₾</span>
                                </div>
                            </div>

                            <Button className="w-full gap-2 h-12 text-lg" onClick={handleSave} disabled={loading}>
                                <FileText className="h-5 w-5" />
                                {loading ? "იშვება..." : "ატვირთვა rs.ge-ზე"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
