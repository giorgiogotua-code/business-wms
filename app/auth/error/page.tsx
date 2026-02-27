import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <CardTitle className="text-xl text-foreground">{"ავტორიზაციის შეცდომა"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">{"მოხდა შეცდომა ავტორიზაციის პროცესში."}</p>
          <Button asChild>
            <Link href="/auth/login">{"თავიდან სცადეთ"}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
