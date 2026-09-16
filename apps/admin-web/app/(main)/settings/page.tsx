import { useTranslations } from 'next-intl'

export default function SettingsIndexPage() {
  const t = useTranslations('admin.settings.shell')
  return (
    <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-12 text-center text-sm text-muted-foreground">
      {t('pickMenu')}
    </div>
  )
}
