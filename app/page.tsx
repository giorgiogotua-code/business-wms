import { redirect } from "next/navigation"

export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams
  
  // If there's a verification code, redirect to the callback handler
  if (params.code) {
    redirect(`/auth/callback?code=${params.code}`)
  }
  
  redirect("/dashboard")
}
