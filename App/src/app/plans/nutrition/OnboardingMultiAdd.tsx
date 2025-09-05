"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

type Props = {
  onParse: (rows: Array<{ name: string; amount: number; unit: string }>) => void
}

export function OnboardingMultiAdd({ onParse }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  const parse = () => {
    const rows: Array<{ name: string; amount: number; unit: string }> = []
    text
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean)
      .forEach((line) => {
        // formats: "tomatoes, 2 kg" or "milk 1 l"
        const parts = line.split(',').map((p) => p.trim())
        const left = parts[0] || ''
        const qty = parts[1] || ''
        let name = left
        let amount = 0
        let unit = ''
        const m = qty.match(/([\d.]+)\s*(\w+)/)
        if (m) {
          amount = parseFloat(m[1])
          unit = m[2]
        }
        if (!m) {
          const m2 = left.match(/(.+?)\s+([\d.]+)\s*(\w+)/)
          if (m2) {
            name = m2[1].trim()
            amount = parseFloat(m2[2])
            unit = m2[3]
          }
        }
        if (name && amount && unit) rows.push({ name, amount, unit })
      })
    onParse(rows)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Bulk add ingredients</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Paste ingredients</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="multi">One per line, e.g. "tomatoes, 2 kg"</Label>
          <Textarea id="multi" value={text} onChange={(e) => setText(e.target.value)} rows={8} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={parse}>Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


