import { createClient } from "./supabase/client"

const supabase = createClient()

export async function logAction(action: string, details: any = {}) {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase.from("audit_logs").insert({
            user_id: user.id,
            action,
            details,
        })
    } catch (err) {
        console.error("Audit logging failed:", err)
    }
}
