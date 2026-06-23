import dynamic from 'next/dynamic'

export const AttendanceMap = dynamic(
  () => import('./attendance-map-inner').then(m => m.AttendanceMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 w-full rounded-xl bg-muted animate-pulse" />
    ),
  },
)
