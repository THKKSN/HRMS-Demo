import { TicketSectionNav } from '@/components/tickets/ticket-section-nav'

export default function TicketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TicketSectionNav />
      {children}
    </>
  )
}
