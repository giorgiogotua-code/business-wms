"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus } from "lucide-react"

interface Good {
    name: string
    quantity: number
    price: number
    unitId: number
}

interface GoodsTableProps {
    goods: Good[]
    onChange: (goods: Good[]) => void
}

export function GoodsTable({ goods, onChange }: GoodsTableProps) {
    const units = [
        { id: 1, name: "კგ" },
        { id: 2, name: "ტონა" },
        { id: 3, name: "ლიტრი" },
        { id: 4, name: "მლ" },
        { id: 5, name: "ცალი" },
        { id: 6, name: "მეტრი" },
        { id: 7, name: "მ²" },
        { id: 8, name: "მ³" }
    ]

    const addRow = () => {
        onChange([...goods, { name: "", quantity: 1, price: 0, unitId: 5 }])
    }

    const removeRow = (index: number) => {
        onChange(goods.filter((_, i) => i !== index))
    }

    const updateRow = (index: number, field: keyof Good, value: any) => {
        const newGoods = [...goods]
        newGoods[index] = { ...newGoods[index], [field]: value }
        onChange(newGoods)
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{"დასახელება"}</TableHead>
                        <TableHead className="w-[120px]">{"რაოდენობა"}</TableHead>
                        <TableHead className="w-[120px]">{"ერთეული"}</TableHead>
                        <TableHead className="w-[120px]">{"ფასი (₾)"}</TableHead>
                        <TableHead className="w-[100px]">{"ჯამი"}</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {goods.map((good, index) => (
                        <TableRow key={index}>
                            <TableCell>
                                <Input value={good.name} onChange={(e) => updateRow(index, "name", e.target.value)} />
                            </TableCell>
                            <TableCell>
                                <Input type="number" value={good.quantity} onChange={(e) => updateRow(index, "quantity", parseFloat(e.target.value))} />
                            </TableCell>
                            <TableCell>
                                <Select value={String(good.unitId)} onValueChange={(v) => updateRow(index, "unitId", parseInt(v))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {units.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell>
                                <Input type="number" step="0.01" value={good.price} onChange={(e) => updateRow(index, "price", parseFloat(e.target.value))} />
                            </TableCell>
                            <TableCell className="font-medium">
                                {(good.quantity * good.price).toFixed(2)}
                            </TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => removeRow(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <div className="p-2 border-t flex justify-center">
                <Button variant="outline" size="sm" onClick={addRow} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {"დამატება"}
                </Button>
            </div>
        </div>
    )
}
