import { NextResponse } from "next/server"
import { saveWaybill } from "@/lib/rs-ge/waybill"
import { getRsCredentials, handleRsError } from "../../api-utils"

export async function POST(req: Request) {
    try {
        const creds = await getRsCredentials()
        if (!creds) return NextResponse.json({ success: false, error: "rs.ge პარამეტრები არ არის კონფიგურირებული" }, { status: 401 })

        const body = await req.json()
        const result = await saveWaybill(creds, body)

        return NextResponse.json({ success: true, data: result })
    } catch (error) {
        return handleRsError(error)
    }
}
