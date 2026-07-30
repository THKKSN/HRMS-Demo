import { api } from './api'
import type { PagedResult } from '@hrms/shared-types'

export type NotificationDeliveryStatus =
  | 'Pending' | 'Processing' | 'Sent' | 'Failed' | 'DeadLetter'

export type NotificationDeliveryDto = {
  id: string
  channel: 'Line'
  eventType: string
  entityType: string
  entityId: string
  entityReference?: string
  recipientEmployeeId?: string
  recipientName: string
  status: NotificationDeliveryStatus
  attemptCount: number
  nextAttemptAt?: string
  lastError?: string
  sentAt?: string
  createdAt: string
}

export const notificationDeliveriesApi = {
  getAll: async (params: {
    status?: NotificationDeliveryStatus
    search?: string
    page?: number
    pageSize?: number
  }) => {
    const { data } = await api.get<PagedResult<NotificationDeliveryDto>>(
      '/v1/notification-deliveries', { params })
    return data
  },
  retry: async (id: string) => {
    await api.post(`/v1/notification-deliveries/${id}/retry`)
  },
}
