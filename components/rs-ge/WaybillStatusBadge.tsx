import { Badge } from "@/components/ui/badge"

interface WaybillStatusBadgeProps {
    status: string
}

export function WaybillStatusBadge({ status }: WaybillStatusBadgeProps) {
    // rs.ge statuses: 0-შენახული, 1-გააქტიურებული, 2-დასრულებული, -1-წაშლილი
    const config: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
        "0": { label: "შენახული", variant: "secondary" },
        "1": { label: "გაგზავნილი", variant: "default" },
        "2": { label: "დადასტურებული", variant: "outline" },
        "-1": { label: "წაშლილი", variant: "destructive" },
        "DEFAULT": { label: "უცნობი", variant: "outline" }
    }

    const { label, variant } = config[status] || config["DEFAULT"]

    return (
        <Badge variant={variant}>
            {label}
        </Badge>
    )
}
