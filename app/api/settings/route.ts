import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .single()

    return NextResponse.json({ success: true, data })
}

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()

    const { error } = await supabase
        .from("settings")
        .upsert({
            user_id: user.id,
            ...body,
            updated_at: new Date().toISOString()
        })

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
