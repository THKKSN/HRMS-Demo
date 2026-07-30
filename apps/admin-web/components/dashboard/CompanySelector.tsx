'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Building2, Globe, Check } from 'lucide-react'
import type { AccessibleCompanyItem } from '@hrms/shared-types'

type Props = {
  companies: AccessibleCompanyItem[]
  selectedId: string | undefined
  onChange: (id: string | undefined) => void
}

export function CompanySelector({ companies, selectedId, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selected = companies.find(c => c.id === selectedId)
  const label    = selected ? selected.name : 'ทุกบริษัท'
  const isAll    = !selectedId

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm hover:bg-muted/50"
      >
        {isAll
          ? <Globe className="h-4 w-4 text-blue-500" />
          : <Building2 className="h-4 w-4 text-gray-500" />
        }
        <span className="max-w-[180px] truncate font-medium text-foreground">{label}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
          {/* ตัวเลือก "ทุกบริษัท" */}
          <button
            onClick={() => { onChange(undefined); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted/60"
          >
            <Globe className="h-4 w-4 text-blue-500" />
            <span className="flex-1 text-left font-medium">ทุกบริษัท</span>
            {isAll && <Check className="h-4 w-4 text-blue-500" />}
          </button>

          <div className="h-px bg-border" />

          <div className="max-h-64 overflow-y-auto py-1">
            {companies.map(c => {
              const isSelected = c.id === selectedId
              const indent = c.level * 16
              return (
                <button
                  key={c.id}
                  onClick={() => { onChange(c.id); setOpen(false) }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 ${isSelected ? 'bg-blue-50' : ''}`}
                  style={{ paddingLeft: `${12 + indent}px` }}
                >
                  {c.level > 0 && (
                    <span className="text-muted-foreground">└</span>
                  )}
                  {c.isHeadquarters
                    ? <Globe className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                    : <Building2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  }
                  <span className={`flex-1 truncate text-left ${isSelected ? 'font-semibold text-blue-700' : 'text-foreground'}`}>
                    {c.name}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-blue-500" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
