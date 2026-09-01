"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, FileText, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasAnyPermission, hasAnyRole } from "@/lib/permission";
import { useAuthStore } from "@/stores/auth.store";

type MemoSection = {
  label: string;
  href: string;
  icon: LucideIcon;
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

  const sections: MemoSection[] = [
    ...(canViewOwn
      ? [{ label: "Memo ของฉัน", href: "/my/memos", icon: FileText }]
      : []),
    // "งาน Memo" รวมทั้งอนุมัติ (Executive/Admin) และรายการเข้าแผนก (Supervisor) ไว้หน้าเดียว
    // หน้า /memos/tasks จะแสดงเฉพาะ section ที่มีสิทธิ์
    ...(canApprove || canViewInbox
      ? [{ label: "งาน Memo", href: "/memos/tasks", icon: ClipboardCheck }]
      : []),
  ];

  const createAction: MemoSection | undefined = canViewOwn
    ? { label: "ส่งเรื่องใหม่", href: "/my/memos/new", icon: Plus }
    : undefined;

  // href หลักของเมนู Memo ใน sidebar — ไป section แรกที่มีสิทธิ์เห็น
  const defaultHref = sections[0]?.href ?? "/my/memos";

  return { sections, createAction, defaultHref, canApprove, canViewInbox };
}

export function MemoSectionNav() {
  const pathname = usePathname();
  const { sections, createAction } = useMemoSections();

  const CreateIcon = createAction?.icon;
  if (sections.length <= 1 && !createAction) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
        {sections.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
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
