import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { RsGeError } from "@/lib/rs-ge/soap-client"

export async function getRsCredentials() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: settings } = await supabase
        .from("settings")
        .select("rs_service_user, rs_service_password")
        .eq("user_id", user.id)
        .single()

    if (!settings?.rs_service_user || !settings?.rs_service_password) return null

    return { su: settings.rs_service_user, sp: settings.rs_service_password }
}

export function handleRsError(error: any) {
    console.error("RS.GE API Error:", error)
    if (error instanceof RsGeError) {
        return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: 422 })
    }
    return NextResponse.json({ success: false, error: "დაფიქსირდა სისტემური შეცდომა" }, { status: 500 })
}
