"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Send, ChevronLeft } from "lucide-react"
import { useRsGe } from "@/hooks/useRsGe"
import { TinInput } from "@/components/rs-ge/TinInput"
import { GoodsTable } from "@/components/rs-ge/GoodsTable"
import { toast } from "sonner"

export default function CreateWaybillPage() {
    const router = useRouter()
    const { saveWaybill, sendWaybill, loading } = useRsGe()

    const [type, setType] = useState("1") // შიდა
    const [buyerTin, setBuyerTin] = useState("")
    const [buyerName, setBuyerName] = useState("")
    const [isVatPayer, setIsVatPayer] = useState(false)

    const [startAddress, setStartAddress] = useState("")
    const [endAddress, setEndAddress] = useState("")
    const [carNumber, setCarNumber] = useState("")
    const [driverPin, setDriverPin] = useState("")

    const [goods, setGoods] = useState<any[]>([
        { name: "", quantity: 1, price: 0, unitId: 5 }
    ])

    const subtotal = goods.reduce((sum, g) => sum + (g.quantity * g.price), 0)
    const vat = isVatPayer ? subtotal * 0.18 : 0
    const total = subtotal + vat

    const handleSave = async (shouldSend = false) => {
        if (!buyerTin || !buyerName || !startAddress || !endAddress) {
            toast.error("გთხოვთ შეავსოთ სავალდებულო ველები")
            return
        }

        const data = {
            type: parseInt(type),
            status: shouldSend ? 1 : 0,
            buyerTin,
            buyerName,
            startAddress,
            endAddress,
            transportationCost: 0,
            carNumber,
            driverPin,
            goods
        }

        const result = await saveWaybill(data)
        if (result) {
            toast.success(shouldSend ? "ზედნადები გაიგზავნა" : "ზედნადები შენახულია")
            router.push("/dashboard/waybills")
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold">{"ახალი ზედნადები"}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Main Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{"ძირითადი ინფორმაცია"}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <Label>{"ტიპი"}</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">{"შიდა გადაზიდვა"}</SelectItem>
                                        <SelectItem value="2">{"ექსპორტი"}</SelectItem>
                                        <SelectItem value="3">{"იმპორტი"}</SelectItem>
                                        <SelectItem value="4">{"დაბრუნება"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <TinInput
                                value={buyerTin}
                                onChange={setBuyerTin}
                                onFound={(r) => {
                                    setBuyerName(r.name)
                                    setIsVatPayer(r.isVatPayer)
                                }}
                            />
                        </CardContent>
                    </Card>

                    {/* Transportation */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{"ტრანსპორტირება"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <Label>{"დაწყების მისამართი *"}</Label>
                                    <Input value={startAddress} onChange={(e) => setStartAddress(e.target.value)} placeholder="ქალაქი, ქუჩა..." />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label>{"დასრულების მისამართი *"}</Label>
                                    <Input value={endAddress} onChange={(e) => setEndAddress(e.target.value)} placeholder="ქალაქი, ქუჩა..." />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <Label>{"მძღოლის პირადი ნომერი"}</Label>
                                    <Input value={driverPin} onChange={(e) => setDriverPin(e.target.value)} maxLength={11} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label>{"მანქანის ნომერი"}</Label>
                                    <Input value={carNumber} onChange={(e) => setCarNumber(e.target.value)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Goods */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{"საქონელი"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <GoodsTable goods={goods} onChange={setGoods} />
                        </CardContent>
                    </Card>
                </div>

                {/* Summary Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>{"შეჯამება"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>{"ქვე-ჯამი"}</span>
                                    <span className="font-medium">{subtotal.toFixed(2)} ₾</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>{"დღგ (18%)"}</span>
                                    <span className="font-medium">{vat.toFixed(2)} ₾</span>
                                </div>
                                <div className="pt-2 border-t flex justify-between">
                                    <span className="font-bold">{"ჯამი"}</span>
                                    <span className="font-bold text-xl text-primary">{total.toFixed(2)} ₾</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <Button variant="outline" className="gap-2" onClick={() => handleSave(false)} disabled={loading}>
                                    <Save className="h-4 w-4" />
                                    {"შენახვა"}
                                </Button>
                                <Button className="gap-2" onClick={() => handleSave(true)} disabled={loading}>
                                    <Send className="h-4 w-4" />
                                    {"გაგზავნა rs.ge-ზე"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
