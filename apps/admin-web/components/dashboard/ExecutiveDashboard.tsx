"use client";

import { useState } from "react";
import {
  useCompanyDashboard,
  useAccessibleCompanies,
} from "@/hooks/use-dashboard";
import { CompanyTodayCards } from "./widgets/CompanyTodayCards";
import { AttendanceTrendChart } from "./widgets/AttendanceTrendChart";
import { CompanySelector } from "./CompanySelector";

export function ExecutiveDashboard() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<
    string | undefined
  >(undefined);

  const companyQuery = useCompanyDashboard(selectedCompanyId);
  const companiesQuery = useAccessibleCompanies();

  if (companyQuery.isLoading) return <DashboardSkeleton />;
  if (companyQuery.isError || !companyQuery.data)
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600">
        โหลดข้อมูล dashboard ไม่สำเร็จ กรุณาลองใหม่
      </div>
    );

  const data = companyQuery.data;
  const companies = companiesQuery.data ?? [];
  const showSelector = data.isSystemWide || companies.length > 1;

  return (
    <div className="space-y-5">
      {/* Header + selector */}
      {showSelector && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            ภาพรวมองค์กร
          </p>
          <CompanySelector
            companies={companies}
            selectedId={selectedCompanyId}
            onChange={setSelectedCompanyId}
          />
        </div>
      )}

      <CompanyTodayCards
        stats={data.todayStats}
        totalEmployees={data.totalEmployees}
        isSystemWide={data.isSystemWide && !selectedCompanyId}
      />
      <AttendanceTrendChart trend={data.monthlyTrend} />

      {data.topAbsentDepartments.length > 0 && (
        <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-foreground">
            แผนกที่ขาดงานสูงสุด
          </p>
          <ul className="space-y-2">
            {data.topAbsentDepartments.map((d, i) => (
              <li
                key={d.departmentName}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="text-foreground">{d.departmentName}</span>
                </div>
                <span className="font-bold text-red-600">
                  {d.absentCount} คน
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="h-28 rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
