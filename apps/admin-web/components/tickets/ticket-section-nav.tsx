"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FolderTree,
  MessageSquareWarning,
  Plus,
  Settings2Icon,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasAnyPermission } from "@/lib/permission";
import { useAuthStore } from "@/stores/auth.store";

export type TicketSection = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

type TicketNavigation = {
  primary: TicketSection[];
  utilityActions: TicketSection[];
  createAction?: TicketSection;
};

export function useTicketSections(): TicketNavigation {
  const employee = useAuthStore((state) => state.employee);
  const isAdmin =
    employee?.roles.some((role) => role.role === "Admin") ?? false;
  const isHr = employee?.roles.some((role) => role.role === "Hr") ?? false;
  const isSupervisor =
    employee?.roles.some((role) => role.role === "Supervisor") ?? false;
  const isExecutive =
    employee?.roles.some((role) => role.role === "Executive") ?? false;
  const isEmployee =
    employee?.roles.some((role) => role.role === "Employee") ?? false;
  const permissionCodes = new Set(employee?.permissionCodes ?? []);
  const hasPermissionPayload = Array.isArray(employee?.permissionCodes);
  const canCreateTicket = isAdmin || isHr || isSupervisor || isEmployee;
  // กล่องงานใช้ endpoint ที่ backend คุมด้วย ticket:view-team — Employee ไม่มีสิทธิ์ ห้ามเห็น tab
  const canViewInbox =
    hasAnyPermission(permissionCodes, ["ticket:view-team"]) ||
    (!hasPermissionPayload && (isAdmin || isHr || isSupervisor));
  const canManageTicketTaxonomy = isAdmin || isSupervisor;
  const canViewTicketReports = isAdmin || isSupervisor || isExecutive;

  const primary = [
    ...(canCreateTicket
      ? [
          {
            label: "เรื่องที่แจ้ง",
            description: "ติดตามเรื่องที่คุณเปิดไว้",
            href: "/tickets",
            icon: MessageSquareWarning,
          },
        ]
      : []),
      ...(canViewInbox
      ? [
          {
            label: "กล่องงาน",
            description: "งานปัจจุบันและประวัติงาน",
            href: "/tickets/inbox",
            icon: Wrench,
          },
        ]
      : []),
    ...(canCreateTicket
      ? [
          {
            label: "งานที่รับผิดชอบ",
            description: "งานปัจจุบันและประวัติงาน",
            href: "/tickets/assigned",
            icon: Wrench,
          },
        ]
      : []),
  ] satisfies TicketSection[];

  const utilityActions = [
    ...(canViewTicketReports
      ? [
          {
            label: "รายงาน",
            description: "ปริมาณงาน ระยะเวลา และคุณภาพ",
            href: "/tickets/reports",
            icon: BarChart3,
          },
        ]
      : []),
  ] satisfies TicketSection[];

  const createAction: TicketSection | undefined = canCreateTicket
    ? {
        label: "แจ้งเรื่องใหม่",
        description: "เปิด Ticket ภายใน",
        href: "/tickets/new",
        icon: Plus,
      }
    : undefined;

  return { primary, utilityActions, createAction };
}

export function TicketSectionNav() {
  const pathname = usePathname();
  const { primary, utilityActions, createAction } = useTicketSections();
  const detailMatch = pathname.match(/^\/tickets\/([^/]+)$/);
  const knownSections = new Set([
    "assigned",
    "inbox",
    "new",
    "reports",
  ]);
  const isTicketDetail = !!detailMatch && !knownSections.has(detailMatch[1]);
  const isReportsPage = pathname.startsWith("/tickets/reports");
  if (isTicketDetail || isReportsPage) return null;
  const CreateIcon = createAction?.icon;
  if (primary.length === 0 && utilityActions.length === 0 && !createAction)
    return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Tickets</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {utilityActions.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-muted/40 hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
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
      </div>
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto mb-4">
          {primary.map(({ label, href }) => {
            const active =
              href === "/tickets"
                ? pathname === href
                : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex h-9 shrink-0 items-center rounded px-3 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
    </div>
  );
}
