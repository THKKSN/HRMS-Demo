"use client";

import { useTranslations } from "next-intl";
import { CaseSensitive, Check, Globe, Info, Monitor, Moon, Sun } from "lucide-react";
import { useFontSize, type FontSize } from "@/hooks/use-font-size";
import { useTheme, type ThemeMode } from "@/hooks/use-theme";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { cn } from "@/lib/utils";

// ── ตัวเลือกโหมดสี พร้อมกล่อง preview จำลองหน้าจอ ──────────────────────────────

function ThemePreview({ mode }: { mode: ThemeMode }) {
  if (mode === "system") {
    return (
      <div className="flex h-14 w-full overflow-hidden rounded-lg border border-border">
        <div className="flex-1 space-y-1 bg-white p-2">
          <div className="h-1.5 w-3/4 rounded bg-slate-300" />
          <div className="h-1.5 w-1/2 rounded bg-slate-200" />
        </div>
        <div className="flex-1 space-y-1 bg-slate-900 p-2">
          <div className="h-1.5 w-3/4 rounded bg-slate-600" />
          <div className="h-1.5 w-1/2 rounded bg-slate-700" />
        </div>
      </div>
    );
  }
  const dark = mode === "dark";
  return (
    <div className={cn("h-14 w-full space-y-1 overflow-hidden rounded-lg border border-border p-2", dark ? "bg-slate-900" : "bg-white")}>
      <div className={cn("h-1.5 w-3/4 rounded", dark ? "bg-slate-600" : "bg-slate-300")} />
      <div className={cn("h-1.5 w-1/2 rounded", dark ? "bg-slate-700" : "bg-slate-200")} />
      <div className={cn("h-1.5 w-2/3 rounded", dark ? "bg-slate-700" : "bg-slate-200")} />
    </div>
  );
}

const THEME_VALUES: ThemeMode[] = ["light", "dark", "system"];
const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const;

const FONT_VALUES: { value: FontSize; previewClass: string }[] = [
  { value: "small", previewClass: "text-base" },
  { value: "normal", previewClass: "text-xl" },
  { value: "large", previewClass: "text-2xl" },
];

// ── การ์ดตัวเลือกร่วม: ขอบ primary + เครื่องหมายถูกมุมขวาบนเมื่อถูกเลือก ─────────

function OptionCard({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 px-4 pb-4 pt-5 text-center transition-all",
        active
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-background text-muted-foreground hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm",
      )}
    >
      <span
        className={cn(
          "absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full transition-opacity",
          active ? "bg-primary text-primary-foreground opacity-100" : "opacity-0",
        )}
      >
        <Check className="h-3 w-3 stroke-3" />
      </span>
      {children}
    </button>
  );
}

function SectionCard({
  icon: Icon,
  iconClass,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className={cn("inline-flex rounded-xl p-2", iconClass)}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function GeneralSettingsPage() {
  const t = useTranslations("admin.settings.general");
  const { mode, setMode } = useTheme();
  const { fontSize, setFontSize } = useFontSize();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* ภาษา — ตัวสลับตัวเดียวกับปุ่มบน header (แผน i18n งาน 2.2) */}
      <SectionCard
        icon={Globe}
        iconClass="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400"
        title={t("language.title")}
        description={t("language.description")}
      >
        <LanguageSwitcher variant="cards" />
      </SectionCard>

      <SectionCard
        icon={Moon}
        iconClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
        title={t("theme.title")}
        description={t("theme.description")}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEME_VALUES.map((value) => {
            const Icon = THEME_ICON[value];
            const active = mode === value;
            return (
              <OptionCard key={value} active={active} onClick={() => setMode(value)}>
                <ThemePreview mode={value} />
                <span className={cn("mt-1 flex items-center gap-1.5 text-sm font-semibold", active && "text-foreground")}>
                  <Icon className={cn("h-4 w-4", active && "text-primary")} />
                  {t(`theme.${value}`)}
                </span>
                <span className="text-xs text-muted-foreground">{t(`theme.${value}Hint`)}</span>
              </OptionCard>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        icon={CaseSensitive}
        iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
        title={t("fontSize.title")}
        description={t("fontSize.description")}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FONT_VALUES.map((option) => {
            const active = fontSize === option.value;
            return (
              <OptionCard key={option.value} active={active} onClick={() => setFontSize(option.value)}>
                <span className="flex h-12 items-center justify-center">
                  <span className={cn("font-semibold leading-none", option.previewClass, active ? "text-primary" : "text-foreground/70")}>
                    {t("fontSize.sample")}
                  </span>
                </span>
                <span className={cn("text-sm font-semibold", active && "text-foreground")}>
                  {t(`fontSize.${option.value}`)}
                </span>
                <span className="text-xs text-muted-foreground">{t(`fontSize.${option.value}Hint`)}</span>
              </OptionCard>
            );
          })}
        </div>
      </SectionCard>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-5 py-3.5 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" /> {t("version")}
        </span>
        <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold tabular-nums shadow-sm">
          v{process.env.NEXT_PUBLIC_APP_VERSION ?? "-"}
        </span>
      </div>
    </div>
  );
}
