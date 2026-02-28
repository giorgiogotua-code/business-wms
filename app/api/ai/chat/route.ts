import { OpenAI } from "openai"
import { getBusinessContext } from "@/lib/ai/context-prompt"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    try {
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { error: "OpenAI API Key არ არის მითითებული .env.local ფაილში" },
                { status: 500 }
            )
        }

        const openai = new OpenAI({ apiKey })
        const { messages } = await req.json()
        const context = await getBusinessContext()

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Or "gpt-3.5-turbo"
            messages: [
                { role: "system", content: context },
                ...messages,
            ],
            temperature: 0.7,
        })

        return NextResponse.json({
            message: response.choices[0].message.content,
        })
    } catch (error: any) {
        console.error("AI Chat Error:", error)
        return NextResponse.json(
            { error: "AI-სთან დაკავშირების შეცდომა" },
            { status: 500 }
        )
    }
}
