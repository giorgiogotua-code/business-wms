"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
    role: "user" | "assistant"
    content: string
}

export function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState("")
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "გამარჯობა! მე ვარ JabsOna AI. რით შემიძლია დაგეხმაროთ?" }
    ])
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || loading) return

        const userMsg: Message = { role: "user", content: input }
        setMessages(prev => [...prev, userMsg])
        setInput("")
        setLoading(true)

        try {
            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
                }),
            })

            const data = await response.json()
            if (data.message) {
                setMessages(prev => [...prev, { role: "assistant", content: data.message }])
            } else if (data.error) {
                setMessages(prev => [...prev, { role: "assistant", content: data.error }])
            } else {
                throw new Error("No response")
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: "assistant", content: "უკაცრავად, კავშირის შეცდომაა. დარწმუნდით, რომ ინტერნეტი ჩართულია და API Key სწორია." }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {/* Floating Button */}
            <Button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl transition-all hover:scale-110 no-print z-50",
                    isOpen && "scale-0"
                )}
            >
                <MessageCircle className="h-7 w-7" />
            </Button>

            {/* Chat Windows */}
            <Card className={cn(
                "fixed bottom-6 right-6 w-[350px] sm:w-[400px] h-[550px] flex flex-col shadow-2xl transition-all duration-300 transform no-print z-50",
                !isOpen && "translate-y-full opacity-0 pointer-events-none"
            )}>
                <CardHeader className="flex flex-row items-center justify-between border-b p-4 bg-primary text-primary-foreground rounded-t-lg">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        JabsOna AI
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-primary-foreground hover:bg-primary-foreground/20">
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 p-0 overflow-hidden bg-muted/30">
                    <ScrollArea ref={scrollRef} className="h-full p-4">
                        <div className="flex flex-col gap-4">
                            {messages.map((m, i) => (
                                <div key={i} className={cn(
                                    "flex items-end gap-2 max-w-[85%]",
                                    m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                                )}>
                                    <div className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                                        m.role === "user" ? "bg-primary text-primary-foreground" : "bg-white border text-primary"
                                    )}>
                                        {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                    </div>
                                    <div className={cn(
                                        "p-3 rounded-2xl text-sm shadow-sm",
                                        m.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-br-none"
                                            : "bg-white text-foreground rounded-bl-none border"
                                    )}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex items-end gap-2 mr-auto max-w-[85%]">
                                    <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center shrink-0">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white border text-sm rounded-bl-none">
                                        ...
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>

                <CardFooter className="p-4 border-t bg-white rounded-b-lg">
                    <form className="flex w-full gap-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
                        <Input
                            placeholder="დასვით კითხვა..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1"
                        />
                        <Button type="submit" size="icon" disabled={loading}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </>
    )
}
