"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Package, ShieldCheck } from "lucide-react"

export default function SetupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (password.length < 6) {
      setError("პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო")
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName || email,
          role: "admin",
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      // Auto-confirmed, go to dashboard
      router.push("/dashboard")
      router.refresh()
    } else {
      setSuccess(true)
    }

    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <ShieldCheck className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{"ანგარიში შეიქმნა!"}</h2>
            <p className="text-center text-sm text-muted-foreground">
              {"შეამოწმეთ ელ-ფოსტა დადასტურებისთვის, შემდეგ შედით სისტემაში."}
            </p>
            <Button onClick={() => router.push("/auth/login")} className="w-full">
              {"შესვლის გვერდზე გადასვლა"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Package className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">{"პირველადი დაყენება"}</CardTitle>
          <CardDescription>{"შექმენით ადმინისტრატორის ანგარიში"}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">{"სახელი და გვარი"}</Label>
              <Input
                id="fullName"
                type="text"
                placeholder={"მაგ: გიორგი გიორგაძე"}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{"ელ-ფოსტა *"}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{"პაროლი *"}</Label>
              <Input
                id="password"
                type="password"
                placeholder={"მინიმუმ 6 სიმბოლო"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "იქმნება..." : "ადმინის შექმნა"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/auth/login")}
              className="w-full text-muted-foreground"
            >
              {"უკვე გაქვთ ანგარიში? შესვლა"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
