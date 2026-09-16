'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FilePenLine, FolderTree } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExternalTaxonomyPanel } from '../external-panel'
import { ExternalTemplateGuidancePanel } from '../external-template-panel'

export default function ExternalTicketTaxonomyPage() {
  const t = useTranslations('admin.settings.taxonomy')
  const [view, setView] = useState<'taxonomy' | 'template'>('taxonomy')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t('externalTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('externalSubtitle')}</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        <Button variant={view === 'taxonomy' ? 'default' : 'ghost'} onClick={() => setView('taxonomy')}>
          <FolderTree className="h-4 w-4" /> {t('tabTaxonomy')}
        </Button>
        <Button variant={view === 'template' ? 'default' : 'ghost'} onClick={() => setView('template')}>
          <FilePenLine className="h-4 w-4" /> {t('tabTemplate')}
        </Button>
      </div>

      {view === 'taxonomy' ? <ExternalTaxonomyPanel /> : <ExternalTemplateGuidancePanel />}
    </div>
  )
}
