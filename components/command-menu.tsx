"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    Home,
    ShoppingCart,
    TrendingUp,
    Package,
    FileText,
    Settings,
    Truck,
    Plus,
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"

export function CommandMenu() {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="აკრიფეთ ბრძანება ან საძიებო სიტყვა..." />
            <CommandList>
                <CommandEmpty>შედეგი ვერ მოიძებნა.</CommandEmpty>
                <CommandGroup heading="ნავიგაცია">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                        <Home className="mr-2 h-4 w-4" />
                        <span>მთავარი გვერდი</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/inventory"))}>
                        <Package className="mr-2 h-4 w-4" />
                        <span>ნაშთი / ინვენტარი</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/sales"))}>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        <span>გაყიდვა</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/purchases"))}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        <span>შესყიდვა</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/accounting"))}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>ბუღალტერია</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/suppliers"))}>
                        <Truck className="mr-2 h-4 w-4" />
                        <span>მომწოდებლები</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="სწრაფი ქმედებები">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/inventory"))}>
                        <Plus className="mr-2 h-4 w-4" />
                        <span>პროდუქტის დამატება</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/admin"))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>პარამეტრები</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
