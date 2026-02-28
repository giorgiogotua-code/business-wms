import { NextResponse } from "next/server"
import { sendWaybill } from "@/lib/rs-ge/waybill"
import { getRsCredentials, handleRsError } from "../../api-utils"

export async function POST(req: Request) {
    try {
        const creds = await getRsCredentials()
        if (!creds) return NextResponse.json({ success: false, error: "rs.ge პარამეტრები არ არის კონფიგურირებული" }, { status: 401 })

        const { waybillId } = await req.json()
        await sendWaybill(creds, waybillId)

        return NextResponse.json({ success: true })
    } catch (error) {
        return handleRsError(error)
    }
}
