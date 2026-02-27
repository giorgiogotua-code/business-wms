"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { logAction } from "@/lib/audit"

interface Category {
  id: string
  name: string
}

interface CategoryManagerProps {
  categories: Category[]
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const supabase = createClient()

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatName.trim()) return

    const { error } = await supabase.from("categories").insert({ name: newCatName.trim() })
    if (error) {
      toast.error("კატეგორია უკვე არსებობს ან მოხდა შეცდომა")
      return
    }

    toast.success("კატეგორია დაემატა")
    await logAction("კატეგორიის დამატება", { name: newCatName.trim() })
    setNewCatName("")
    setShowAdd(false)
    mutate("categories")
  }

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{"კატეგორიები"}</h3>
        <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1">
          <Plus className="h-3 w-3" />
          {"დამატება"}
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">{"კატეგორიები არ არის დამატებული"}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Badge key={cat.id} variant="secondary">
              {cat.name}
            </Badge>
          ))}
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleAddCategory} className="mt-3 flex items-center gap-2">
          <Input
            placeholder="კატეგორიის სახელი..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="max-w-xs"
            autoFocus
          />
          <Button type="submit" size="sm">
            {"დამატება"}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => setShowAdd(false)}>
            <X className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  )
}
