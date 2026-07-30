'use client'

import { useState, useCallback } from 'react'
import { reportsApi } from '@/lib/reports.api'
import type {
  AttendanceDailySummaryDto,
  AttendanceTrendItemDto,
  AttendanceMonthlySummaryDto,
} from '@hrms/shared-types'

export function useDailySummary() {
  const [data, setData]       = useState<AttendanceDailySummaryDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async (date?: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await reportsApi.getDailySummary(date)
      setData(result)
    } catch {
      setError('โหลดข้อมูลสรุปวันนี้ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetch }
}

export function useAttendanceTrend() {
  const [data, setData]       = useState<AttendanceTrendItemDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async (params?: { dateFrom?: string; dateTo?: string }) => {
    setLoading(true)
    setError(null)
    try {
      const result = await reportsApi.getTrend(params)
      setData(result)
    } catch {
      setError('โหลดข้อมูล trend ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetch }
}

export function useMonthlySummary() {
  const [data, setData]       = useState<AttendanceMonthlySummaryDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(
    async (params?: { year?: number; month?: number; departmentId?: string }) => {
      setLoading(true)
      setError(null)
      try {
        const result = await reportsApi.getMonthlySummary(params)
        setData(result)
      } catch {
        setError('โหลดข้อมูลสรุปเดือนไม่สำเร็จ')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return { data, loading, error, fetch }
}

export function useExportExcel() {
  const [loading, setLoading] = useState(false)

  const exportExcel = useCallback(
    async (params?: { year?: number; month?: number; departmentId?: string }) => {
      setLoading(true)
      try {
        const blob = await reportsApi.exportExcel(params)
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        const y    = params?.year  ?? new Date().getFullYear()
        const m    = String(params?.month ?? (new Date().getMonth() + 1)).padStart(2, '0')
        a.href     = url
        a.download = `attendance_${y}_${m}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        alert('Export Excel ไม่สำเร็จ')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return { exportExcel, loading }
}
