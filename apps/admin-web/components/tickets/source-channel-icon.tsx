import { Globe, Monitor } from "lucide-react";
import type { TicketSourceChannel } from "@hrms/shared-types";

function LineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 5.66 2 10.17c0 3.98 3.48 7.31 8.19 7.95.32.07.75.21.86.49.1.25.07.65.03.9l-.14.85c-.04.25-.19.98.86.53 1.05-.44 5.68-3.34 7.75-5.73C21.05 13.5 22 11.94 22 10.17 22 5.66 17.52 2 12 2zm-3.6 9.9H7.05a.3.3 0 0 1-.3-.3V7.85a.3.3 0 0 1 .3-.3h.63a.3.3 0 0 1 .3.3v3.15h.43a.3.3 0 0 1 .3.3v.3a.3.3 0 0 1-.31.3zm2.02 0h-.63a.3.3 0 0 1-.3-.3V7.85a.3.3 0 0 1 .3-.3h.63a.3.3 0 0 1 .3.3v3.75a.3.3 0 0 1-.3.3zm4.35 0h-.63a.3.3 0 0 1-.25-.13l-1.5-2.03v1.86a.3.3 0 0 1-.3.3h-.63a.3.3 0 0 1-.3-.3V7.85a.3.3 0 0 1 .3-.3h.63a.3.3 0 0 1 .25.13l1.5 2.03V7.85a.3.3 0 0 1 .3-.3h.63a.3.3 0 0 1 .3.3v3.75a.3.3 0 0 1-.3.3zm3.85-3.15h-1.5v.53h1.5a.3.3 0 0 1 .3.3v.3a.3.3 0 0 1-.3.3h-1.5v.53h1.5a.3.3 0 0 1 .3.3v.3a.3.3 0 0 1-.3.3h-2.13a.3.3 0 0 1-.3-.3V7.85a.3.3 0 0 1 .3-.3h2.13a.3.3 0 0 1 .3.3v.3a.3.3 0 0 1-.3.3z" />
    </svg>
  );
}

function sourceChannelMeta(channel: TicketSourceChannel) {
  if (channel === "LineLiff") {
    return { icon: LineIcon, label: "แจ้งผ่าน LINE (LIFF)", className: "text-[#06C755]" };
  }
  if (channel === "ExternalPortal") {
    return { icon: Globe, label: "แจ้งผ่านช่องทางบุคคลภายนอก", className: "text-sky-600" };
  }
  return { icon: Monitor, label: "แจ้งผ่าน Admin Web", className: "text-muted-foreground" };
}

export function SourceChannelIcon({
  channel,
  className = "h-5 w-5 shrink-0",
}: {
  channel: TicketSourceChannel;
  className?: string;
}) {
  const { icon: Icon, label, className: colorClassName } = sourceChannelMeta(channel);
  return <Icon className={`${className} ${colorClassName}`} aria-label={label} />;
}
