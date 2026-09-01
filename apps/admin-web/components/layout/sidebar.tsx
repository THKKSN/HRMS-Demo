"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight, ClipboardList, Settings2Icon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { canSeeItem, hasAnyPermission, hasAnyRole } from "@/lib/permission";
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
};
type NavGroup = { title: string; items: NavItem[] };

function NavLink({
  label,
  href,
  icon: Icon,
  onNavigate,
  collapsed,
}: NavItem & { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  // ใช้ exact match สำหรับ /my/leaves เพื่อกันชนกับ /my/leaves/new และ /my/leaves/balance
  const active =
    pathname === href ||
    (href !== "/my/leaves" && pathname.startsWith(href + "/"));
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-2",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-whited hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && label}
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
  const employee = useAuthStore((s) => s.employee);
  const permissionCodes = new Set(employee?.permissionCodes ?? []);
  const hasPermissionPayload = Array.isArray(employee?.permissionCodes);
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
      title: "ภาพรวม",
      items: [{ label: "แดชบอร์ด", href: "/dashboard", icon: LayoutDashboard }],
    },
    {
      title: "ส่วนตัว",
      items: [
        { label: "โปรไฟล์", href: "/my/profile", icon: UserCircle },
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
      title: "การแจ้งเรื่อง",
      items: [
        {
          label: "Ticket",
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
        },
        {
          label: "Memo",
          href: "/my/memos",
          icon: FileText,
          permissions: ["memo:create", "memo:view-own", "memo:approve", "memo:view-inbox"],
          fallbackRoles: ["Admin", "Hr", "Supervisor", "Executive", "Employee"],
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
      title: "HR management",
      items: [
        {
          label: "พนักงาน",
          href: "/employees",
          icon: Users,
          permissions: ["employee:view"],
          fallbackRoles: ["Admin", "Hr"],
          excludeRoles: ["Executive"],
        },
        {
          label: "บันทึกการเข้างาน",
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
          label: "ประวัติการลา",
          href: "/leave-history",
          icon: ClipboardList,
          permissions: ["leave:view-all"],
          fallbackRoles: ["Admin", "Hr"],
          excludeRoles: ["Executive"],
        },
        {
          label: "ประเภทการลา",
          href: "/leave-types",
          icon: CalendarDays,
          permissions: ["leave:manage-types"],
          fallbackRoles: ["Admin", "Hr"],
        },
        {
          label: "สิทธิ์วันลา",
          href: "/leave-balances",
          icon: BarChart3,
          permissions: ["leave:manage-balance"],
          fallbackRoles: ["Admin", "Hr"],
        },
      ],
    },

    // ── Admin เท่านั้น ────────────────────────────────────────────
    {
      title: "โครงสร้างองค์กร",
      items: [
        {
          label: "บริษัท",
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
          label: "สถานที่",
          href: "/locations",
          icon: MapPin,
          permissions: ["company:manage-locations"],
          fallbackRoles: ["Admin", "Hr"],
        },
        {
          label: "ตำแหน่ง",
          href: "/role-labels",
          icon: Tag,
          permissions: ["company:manage-departments"],
          fallbackRoles: ["Admin", "Hr"],
        },
      ],
    },
    {
      title: "ตั้งค่าระบบ",
      items: [
        {
          label: "ตั้งค่าระบบ",
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
            aria-label="ปิดเมนู"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {/* ปุ่มพับ/ขยายเมนู — desktop เท่านั้น */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-whited hover:text-foreground transition-colors"
            aria-label={collapsed ? "ขยายเมนู" : "พับเมนู"}
            title={collapsed ? "ขยายเมนู" : "พับเมนู"}
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
