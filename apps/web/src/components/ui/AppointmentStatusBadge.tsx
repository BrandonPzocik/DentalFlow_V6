import { AppointmentStatus } from '@dentaflow/shared';
import { cn } from '@/lib/utils';
import { getStatusConfig } from '@/lib/appointmentStatus';

export function AppointmentStatusBadge({
  status,
  className,
  compact,
}: {
  status: AppointmentStatus;
  className?: string;
  compact?: boolean;
}) {
  const cfg = getStatusConfig(status);
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'badge-pill inline-flex items-center gap-1.5 border',
        cfg.pillClass,
        compact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
        className,
      )}
    >
      <Icon size={compact ? 12 : 14} strokeWidth={2} aria-hidden />
      <span>{cfg.label}</span>
    </span>
  );
}

export function WaOriginBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'badge-pill inline-flex items-center border border-teal-300 bg-teal-50 text-teal-800 text-xs px-2 py-0.5 font-medium',
        className,
      )}
    >
      WA
    </span>
  );
}

export function hasWaOrigin(apt: { whatsappStatus?: string | null }): boolean {
  return !!apt.whatsappStatus;
}
