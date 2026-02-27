"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, User, Phone, Mail, MapPin, Trash2, Edit2 } from "lucide-react"
import { toast } from "sonner"
import { logAction } from "@/lib/audit"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

const supabase = createClient()

async function fetchSuppliers() {
    const { data } = await supabase.from("suppliers").select("*").order("name")
    return data || []
}

export default function SuppliersPage() {
    const { data: suppliers = [], isLoading } = useSWR("suppliers", fetchSuppliers)
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<any>(null)

    // Form state
    const [name, setName] = useState("")
    const [phone, setPhone] = useState("")
    const [email, setEmail] = useState("")
    const [address, setAddress] = useState("")
    const [notes, setNotes] = useState("")

    function resetForm() {
        setName("")
        setPhone("")
        setEmail("")
        setAddress("")
        setNotes("")
        setEditingSupplier(null)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        const payload = { name, phone, email, address, notes }

        let error
        if (editingSupplier) {
            const { error: err } = await supabase.from("suppliers").update(payload).eq("id", editingSupplier.id)
            error = err
        } else {
            const { error: err } = await supabase.from("suppliers").insert(payload)
            error = err
        }

        if (error) {
            toast.error("შეცდომა შენახვისას. დარწმუნდით რომ SQL სკრიპტი გაშვებულია.")
            setLoading(false)
            return
        }

        toast.success(editingSupplier ? "მომწოდებელი განახლდა" : "მომწოდებელი დაემატა")
        await logAction(editingSupplier ? "მომწოდებლის რედაქტირება" : "მომწოდებლის დამატება", { name, phone })
        resetForm()
        setOpen(false)
        setLoading(false)
        mutate("suppliers")
    }

    async function handleDelete(id: string) {
        if (!confirm("ნამდვილად გსურთ წაშლა?")) return
        const { error } = await supabase.from("suppliers").delete().eq("id", id)
        if (error) {
            toast.error("შეცდომა წაშლისას")
            return
        }
        toast.success("მომწოდებელი წაიშალა")
        await logAction("მომწოდებლის წაშლა", { id })
        mutate("suppliers")
    }

    function handleEdit(s: any) {
        setEditingSupplier(s)
        setName(s.name)
        setPhone(s.phone || "")
        setEmail(s.email || "")
        setAddress(s.address || "")
        setNotes(s.notes || "")
        setOpen(true)
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">{"მომწოდებლები"}</h1>
                <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            {"დამატება"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingSupplier ? "რედაქტირება" : "ახალი მომწოდებელი"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                            <div className="flex flex-col gap-2">
                                <Label>{"სახელი *"}</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="მომწოდებლის დასახელება" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <Label>{"ტელეფონი"}</Label>
                                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555..." />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label>{"ელ-ფოსტა"}</Label>
                                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mail@example.com" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>{"მისამართი"}</Label>
                                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="თბილისი, ..." />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>{"შენიშვნა"}</Label>
                                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="..." />
                            </div>
                            <Button type="submit" disabled={loading} className="mt-2">
                                {loading ? "ინახება..." : "შენახვა"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <Card key={i} className="h-32 animate-pulse bg-muted" />)}
                </div>
            ) : suppliers.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                        <User className="h-12 w-12 mb-4 opacity-20" />
                        {"მომწოდებლები არ არიან"}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suppliers.map((s: any) => (
                        <Card key={s.id} className="group overflow-hidden">
                            <CardContent className="p-5 flex flex-col gap-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground">{s.name}</h3>
                                            <p className="text-xs text-muted-foreground">{"რეგ. "}{new Date(s.created_at).toLocaleDateString("ka-GE")}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(s)} className="h-8 w-8">
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="h-8 w-8 text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 text-sm">
                                    {s.phone && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Phone className="h-4 w-4" />
                                            {s.phone}
                                        </div>
                                    )}
                                    {s.email && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Mail className="h-4 w-4" />
                                            {s.email}
                                        </div>
                                    )}
                                    {s.address && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="h-4 w-4" />
                                            {s.address}
                                        </div>
                                    )}
                                </div>

                                {s.notes && (
                                    <div className="pt-2 border-t border-border mt-1">
                                        <p className="text-xs text-muted-foreground italic truncate" title={s.notes}>
                                            {s.notes}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
