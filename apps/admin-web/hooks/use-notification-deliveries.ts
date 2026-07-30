import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  notificationDeliveriesApi,
  type NotificationDeliveryStatus,
} from '@/lib/notification-deliveries.api'

const keys = {
  all: ['notification-deliveries'] as const,
  list: (params: object) => [...keys.all, params] as const,
}

export function useNotificationDeliveries(params: {
  status?: NotificationDeliveryStatus
  search?: string
  page: number
  pageSize: number
}) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => notificationDeliveriesApi.getAll(params),
    refetchInterval: 30_000,
  })
}

export function useRetryNotificationDelivery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: notificationDeliveriesApi.retry,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  })
}
