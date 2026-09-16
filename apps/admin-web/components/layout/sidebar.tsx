"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ClipboardList, Settings2Icon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { canSeeItem, hasAnyPermission, hasAnyRole } from "@/lib/permission";
import { useTicketPendingCounts } from "@/hooks/use-tickets";
import { useMemoSections } from "@/components/memos/memo-section-nav";
import { useAuthStore } from "@/stores/auth.store";
import { useSidebar } from "./sidebar-context";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BarChart3,
  Building2,
  MapPin,
  Tag,
  Clock,
  ShieldCheck,
  UserCircle,
  Wallet,
  Receipt,
  Fingerprint,
  FileSpreadsheet,
  FileText,
  ClipboardCheck,
  AlarmClock,
  FolderTree,
  BellRing,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissions?: string[];
  allPermissions?: string[];
  fallbackRoles?: string[];
  excludeRoles?: string[];
  // จำนวนงานค้างของเมนูนั้น — ไม่ใส่ / null / 0 คือไม่แสดงตัวเลข
  count?: number | null;
};
type NavGroup = { title: string; items: NavItem[] };

function NavLink({
  label,
  href,
  icon: Icon,
  count,
  onNavigate,
  collapsed,
}: NavItem & { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  // ใช้ exact match สำหรับ /my/leaves และ /my/memos เพื่อกันชนกับ sub-route (/new, /balance, /<id>)
  const exactOnly = href === "/my/leaves" || href === "/my/memos";
  const active =
    pathname === href || (!exactOnly && pathname.startsWith(href + "/"));
  const badge = count && count > 0 ? (count > 99 ? "99+" : String(count)) : null;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-2",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-whited hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && label}
      {/* กางอยู่ → ตัวเลขท้ายแถว · ย่ออยู่ → จุดแดงมุมไอคอน (ไม่มีที่ให้ตัวเลข) */}
      {badge &&
        (collapsed ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        ) : (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
            {badge}
          </span>
        ))}
    </Link>
  );
}

function SidebarContent({
  onNavigate,
  collapsed,
  onToggleCollapse,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const t = useTranslations("admin.nav");
  const employee = useAuthStore((s) => s.employee);
  const permissionCodes = new Set(employee?.permissionCodes ?? []);
  const hasPermissionPayload = Array.isArray(employee?.permissionCodes);
  // ตัวเลขงานค้างสำหรับ badge — endpoint เดียวคืนครบทุกโมดูล (staleTime 30 วิ)
  const { data: pendingCounts } = useTicketPendingCounts(!!employee);
  // ปลายทางเมนู Memo ใช้ตัวเดียวกับที่ tab ในหน้าใช้ จะได้ไม่หลุดกัน
  const { defaultHref: memoHref } = useMemoSections();
  const memoWorkTotal =
    (pendingCounts?.memoStepTasks ?? 0) +
    (pendingCounts?.memoAwaitingApproval ?? 0) +
    (pendingCounts?.memoAwaitingAck ?? 0);
  // งาน ticket ที่ "ต้องลงมือ" เท่านั้น — ไม่รวม myOpen (เรื่องที่เราแจ้งแล้วรอคนอื่นทำ ไม่ใช่งานของเรา)
  // ชุดเดียวกับ chip บน dashboard จะได้ไม่ขัดกันเอง
  const ticketWorkTotal =
    (pendingCounts?.inboxUntriaged ?? 0) +
    (pendingCounts?.cancellationPending ?? 0) +
    (pendingCounts?.assignedActive ?? 0) +
    (pendingCounts?.assignedWaitingInfo ?? 0) +
    (pendingCounts?.claimable ?? 0) +
    (pendingCounts?.awaitingMyConfirmation ?? 0);
  const canApproveOt =
    hasAnyPermission(permissionCodes, [
      "ot:approve-supervisor",
      "ot:approve-hr",
    ]) ||
    (!hasPermissionPayload &&
      hasAnyRole(employee, ["Admin", "Hr", "Supervisor"]));
  const hasTicketOperationalAccess =
    hasAnyPermission(permissionCodes, [
      "ticket:create",
      "ticket:view-own",
      "ticket:view-team",
      "ticket:view-assigned",
      "ticket:update-status",
    ]) ||
    (!hasPermissionPayload &&
      hasAnyRole(employee, ["Admin", "Hr", "Supervisor", "Employee"]));
  const ticketHref = hasTicketOperationalAccess ? "/tickets" : "/tickets/reports";

  const groups: NavGroup[] = [
    // ── ทุก role ────────────────────────────────────────────────
    {
      title: t("group.overview"),
      items: [{ label: t("item.dashboard"), href: "/dashboard", icon: LayoutDashboard }],
    },
    {
      title: t("group.personal"),
      items: [
        { label: t("item.profile"), href: "/my/profile", icon: UserCircle },
        // { label: 'วันลาค  งเหลือ',  href: '/my/leaves/balance', icon: Wallet },
        // {
        //   label: "ประวัติการเข้างาน",
        //   href: "/my/attendance",
        //   icon: Fingerprint,
        //   permissions: ["attendance:view-own"],
        //   fallbackRoles: ["Admin", "Hr", "Supervisor", "Executive", "Employee"],
        // },
        // { label: "สลิปเงินเดือน", href: "/my/payslips", icon: Receipt },
      ],
    },
    // {
    //   title: "การลา",
    //   items: [
    //     // { label: 'ยื่นลา',       href: '/my/leaves/new', icon: FileText },
    //     {
    //       label: "การลาของฉัน",
    //       href: "/my/leaves",
    //       icon: CalendarDays,
    //       permissions: ["leave:view-own", "leave:request"],
    //       fallbackRoles: ["Admin", "Hr", "Supervisor", "Executive", "Employee"],
    //     },
    //     // ── Admin / HR / Supervisor ─────────────────────────────────
    //     {
    //       label: "คำขอลาที่รออนุมัติ",
    //       href: "/approvals/leaves",
    //       icon: ClipboardCheck,
    //       permissions: ["leave:approve-supervisor", "leave:approve-hr"],
    //       fallbackRoles: ["Admin", "Hr", "Supervisor"],
    //     },
    //   ],
    // },

    // {
    //   title: "OT",
    //   items: [
    //     {
    //       label: canApproveOt ? "คำขอ OT" : "OT ของฉัน",
    //       href: "/ot-requests",
    //       icon: AlarmClock,
    //       permissions: [
    //         "ot:request",
    //         "ot:view-own",
    //         "ot:view-team",
    //         "ot:view-all",
    //         "ot:approve-supervisor",
    //         "ot:approve-hr",
    //       ],
    //       fallbackRoles: ["Admin", "Hr", "Supervisor", "Employee"],
    //     },
    //   ],
    // },

    {
      title: t("group.tickets"),
      items: [
        {
          label: t("item.ticket"),
          href: ticketHref,
          icon: FolderTree,
          permissions: [
            "ticket:create",
            "ticket:view-own",
            "ticket:view-team",
            "ticket:view-assigned",
            "ticket:view-all",
            "ticket:update-status",
            "ticket:view-report",
          ],
          fallbackRoles: ["Admin", "Hr", "Supervisor", "Executive", "Employee"],
          count: ticketWorkTotal,
        },
        // Memo เมนูเดียวแบบเดียวกับ Ticket — ปลายทางเปลี่ยนตามงานที่ค้างจริงของแต่ละคน
        // แล้วสลับมุมมองด้วย tab ในหน้า ส่วนตัวเลขคือผลรวมงาน memo ที่รอเราทุกแบบ
        {
          label: t("item.memo"),
          href: memoHref,
          icon: FileText,
          permissions: ["memo:create", "memo:view-own", "memo:approve", "memo:view-inbox"],
          fallbackRoles: ["Admin", "Hr", "Supervisor", "Executive", "Employee"],
          count: memoWorkTotal,
        },
        // {
        //   label: "ตรวจบิลค่าใช้จ่าย",
        //   href: "/expenses",
        //   icon: Receipt,
        //   permissions: ["expense:view-all", "expense:review", "expense:export"],
        //   fallbackRoles: ["Admin", "Hr", "Executive"],
        // },
        // {
        //   label: "รอบวางบิล",
        //   href: "/expense-billing-batches",
        //   icon: FileSpreadsheet,
        //   permissions: ["expense:view-all"],
        //   fallbackRoles: ["Admin", "Hr", "Executive"],
        // },
      ],
    },

    // ── Admin / HR ───────────────────────────────────────────────
    {
      title: t("group.hr"),
      items: [
        {
          label: t("item.employees"),
          href: "/employees",
          icon: Users,
          permissions: ["employee:view"],
          fallbackRoles: ["Admin", "Hr"],
          excludeRoles: ["Executive"],
        },
        {
          label: t("item.attendance"),
          href: "/attendance",
          icon: Clock,
          permissions: [
            "attendance:view-all",
            "attendance:edit",
            "attendance:report",
          ],
          fallbackRoles: ["Admin", "Hr"],
          excludeRoles: ["Executive"],
        },
        {
          label: t("item.leaveHistory"),
          href: "/leave-history",
          icon: ClipboardList,
          permissions: ["leave:view-all"],
          fallbackRoles: ["Admin", "Hr"],
          excludeRoles: ["Executive"],
        },
        {
          label: t("item.leaveTypes"),
          href: "/leave-types",
          icon: CalendarDays,
          permissions: ["leave:manage-types"],
          fallbackRoles: ["Admin", "Hr"],
        },
        {
          label: t("item.leaveBalances"),
          href: "/leave-balances",
          icon: BarChart3,
          permissions: ["leave:manage-balance"],
          fallbackRoles: ["Admin", "Hr"],
        },
      ],
    },

    // ── Admin เท่านั้น ────────────────────────────────────────────
    {
      title: t("group.organization"),
      items: [
        {
          label: t("item.companies"),
          href: "/companies",
          icon: Building2,
          permissions: [
            "company:view",
            "company:edit",
            "system:manage-companies",
          ],
          fallbackRoles: ["Admin", "Hr"],
          excludeRoles: ["Executive"],
        },
        {
          label: t("item.locations"),
          href: "/locations",
          icon: MapPin,
          permissions: ["company:manage-locations"],
          fallbackRoles: ["Admin", "Hr"],
        },
        {
          label: t("item.roleLabels"),
          href: "/role-labels",
          icon: Tag,
          permissions: ["company:manage-departments"],
          fallbackRoles: ["Admin", "Hr"],
        },
      ],
    },
    {
      title: t("group.system"),
      items: [
        {
          label: t("item.settings"),
          href: "/settings",
          icon: Settings2Icon,
        },
      ],
    },
  ];

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canSeeItem(item, employee, permissionCodes, hasPermissionPayload),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <div className={cn("flex h-14 items-center border-b border-border shrink-0", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        {!collapsed && (
          <span className="text-base font-semibold text-foreground truncate">
            TBG Assistant
          </span>
        )}
        {/* ปุ่มปิดบน mobile เท่านั้น */}
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="lg:hidden flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-whited hover:text-foreground transition-colors"
            aria-label={t("action.closeMenu")}
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {/* ปุ่มพับ/ขยายเมนู — desktop เท่านั้น */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-whited hover:text-foreground transition-colors"
            aria-label={collapsed ? t("action.expandMenu") : t("action.collapseMenu")}
            title={collapsed ? t("action.expandMenu") : t("action.collapseMenu")}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-none">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} {...item} onNavigate={onNavigate} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}

// ── Desktop sidebar (lg+) ──────────────────────────────────────────────────────
export function Sidebar() {
  const { collapsed, toggleCollapsed } = useSidebar();
  return (
    <aside
      className={cn(
        "hidden lg:flex h-full flex-col border-r border-border bg-background transition-[width] duration-200",
        collapsed ? "w-16" : "w-(--sidebar-width)",
      )}
    >
      <SidebarContent collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
    </aside>
  );
}

// ── Mobile drawer ─────────────────────────────────────────────────────────────
export function MobileDrawer() {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();

  // ปิด drawer เมื่อ navigate
  useEffect(() => {
    close();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent onNavigate={close} />
      </aside>
    </>
  );
}
