"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, FileText, Inbox, ListChecks, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasAnyPermission, hasAnyRole } from "@/lib/permission";
import { useTicketPendingCounts } from "@/hooks/use-tickets";
import { useAuthStore } from "@/stores/auth.store";

type MemoSection = {
  label: string;
  href: string;
  icon: LucideIcon;
  // งานค้างของมุมมองนั้น — ไม่ใส่หรือ 0 คือไม่แสดงตัวเลข
  count?: number | null;
};

export function useMemoSections() {
  const employee = useAuthStore((state) => state.employee);
  const permissionCodes = new Set(employee?.permissionCodes ?? []);
  const hasPermissionPayload = Array.isArray(employee?.permissionCodes);

  const allowed = (permissions: string[], fallbackRoles: string[]) =>
    hasAnyPermission(permissionCodes, permissions) ||
    (!hasPermissionPayload && hasAnyRole(employee, fallbackRoles));

  const canViewOwn = allowed(
    ["memo:create", "memo:view-own"],
    ["Admin", "Hr", "Supervisor", "Executive", "Employee"],
  );
  const canApprove = allowed(["memo:approve"], ["Admin", "Executive"]);
  const canViewInbox = allowed(["memo:view-inbox"], ["Supervisor"]);

  // งานขั้นตอนไม่ผูก permission — โผล่เมื่อมีงานค้างจริงเท่านั้น
  // ใช้ตัวเลขจาก endpoint นับงานค้าง (cache ร่วมกับ sidebar อยู่แล้ว จึงไม่ยิง request เพิ่ม)
  const { data: pendingCounts } = useTicketPendingCounts(!!employee);
  const hasStepTasks = (pendingCounts?.memoStepTasks ?? 0) > 0;

  const sections: MemoSection[] = [
    ...(canViewOwn
      ? [{ label: "My memo", href: "/my/memos", icon: FileText }]
      : []),
    ...(hasStepTasks
      ? [{
          label: "Memo tasks",
          href: "/memos/tasks",
          icon: ListChecks,
          count: pendingCounts?.memoStepTasks,
        }]
      : []),
    ...(canApprove
      ? [{
          label: " Approval List",
          href: "/memos/approvals",
          icon: ClipboardCheck,
          count: pendingCounts?.memoAwaitingApproval,
        }]
      : []),
    ...(canViewInbox
      ? [{
          label: "Inbox",
          href: "/memos/inbox",
          icon: Inbox,
          count: pendingCounts?.memoAwaitingAck,
        }]
      : []),
  ];

  const createAction: MemoSection | undefined = canViewOwn
    ? { label: "New Memo", href: "/my/memos/new", icon: Plus }
    : undefined;

  // ปลายทางเริ่มต้นตามงานที่ค้างจริงก่อน แล้วจึงตามหน้าที่ — กันการพาไปหน้าที่ว่างเปล่า
  const defaultHref = hasStepTasks
    ? "/memos/tasks"
    : canApprove
      ? "/memos/approvals"
      : canViewInbox
        ? "/memos/inbox"
        : "/my/memos";

  return { sections, createAction, defaultHref, canApprove, canViewInbox, hasStepTasks };
}

// อยู่บนหน้า detail (/memos/<id>) หรือไม่ — ที่นั่นกำลังดูเรื่องเดียว ไม่ต้องมี nav หรือรายการงานค้าง
const MEMO_LIST_ROUTES = new Set(["approvals", "inbox", "tasks"]);

export function useIsMemoDetailPage() {
  const pathname = usePathname();
  const match = pathname.match(/^\/memos\/([^/]+)$/);
  return !!match && !MEMO_LIST_ROUTES.has(match[1]);
}

export function MemoSectionNav() {
  const pathname = usePathname();
  const { sections, createAction } = useMemoSections();
  const isDetailPage = useIsMemoDetailPage();

  if (isDetailPage) return null;

  const CreateIcon = createAction?.icon;
  if (sections.length <= 1 && !createAction) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
        {sections.map(({ label, href, icon: Icon, count }) => {
          // /my/memos ใช้ exact match กัน /my/memos/new และ /my/memos/<id> ทำให้ pill ค้าง active
          const active =
            href === "/my/memos"
              ? pathname === href
              : pathname === href || pathname.startsWith(href + "/");
          const badge = count && count > 0 ? (count > 99 ? "99+" : String(count)) : null;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 rounded px-3 text-sm font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {badge && (
                <span
                  className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                    active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive text-white",
                  )}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      {createAction && CreateIcon && (
        <Link
          href={createAction.href}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <CreateIcon className="h-4 w-4" />
          {createAction.label}
        </Link>
      )}
    </div>
  );
}
