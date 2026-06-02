import { useQuery } from '@tanstack/react-query';
import { Users, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { appointmentsApi, patientsApi, billingApi, whatsappApi } from '@/api';
import { useAuthStore } from '@/store/auth.store';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS, AppointmentStatus } from '@dentaflow/shared';
import { cn } from '@/lib/utils';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: typeof Calendar;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
          <Icon size={18} className="text-slate-600" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const dateLabel = format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es });

  const { data: todayApts = [] } = useQuery({
    queryKey: ['appointments-today', today],
    queryFn: () => appointmentsApi.day(today).then((r) => r.data),
  });
  const { data: aptStats } = useQuery({
    queryKey: ['appointment-stats'],
    queryFn: () => appointmentsApi.stats().then((r) => r.data),
  });
  const { data: patientsData } = useQuery({
    queryKey: ['patients-count'],
    queryFn: () => patientsApi.count().then((r) => r.data),
  });
  const { data: fin } = useQuery({
    queryKey: ['financial-summary', monthStart, monthEnd],
    queryFn: () => billingApi.summary(monthStart + 'T00:00:00', monthEnd + 'T23:59:59').then((r) => r.data),
  });

  const { data: internalEvents = [] } = useQuery({
    queryKey: ['whatsapp-internal'],
    queryFn: () => whatsappApi.internal({ limit: 15 }).then((r) => r.data),
    refetchInterval: 10000,
  });

  const completedToday = todayApts.filter((a: any) => a.status === AppointmentStatus.COMPLETED).length;
  const pendingToday = todayApts.filter((a: any) =>
    [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(a.status),
  ).length;

  const sortedToday = [...todayApts].sort(
    (a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-sm text-slate-500 capitalize">{dateLabel}</p>
        <h1 className="text-2xl font-semibold text-slate-900 mt-1">
          {greeting}, Dr. {user?.lastName}
        </h1>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Turnos hoy"
          value={todayApts.length}
          icon={Calendar}
          sub={`${completedToday} atendidos · ${pendingToday} pendientes`}
        />
        <StatCard
          label="Pacientes"
          value={patientsData?.total ?? '—'}
          icon={Users}
          sub="en la base de datos"
        />
        <StatCard
          label="Facturado (mes)"
          value={fin ? formatCurrency(fin.total) : '—'}
          icon={DollarSign}
          sub={fin ? `${formatCurrency(fin.paid)} cobrado` : undefined}
        />
        <StatCard
          label="Ausentismo (mes)"
          value={aptStats ? `${aptStats.absenceRate}%` : '—'}
          icon={AlertCircle}
          sub={`${aptStats?.absent ?? 0} ausencias`}
        />
      </div>

      {internalEvents.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80">
            <h2 className="text-sm font-semibold text-slate-800">Actividad WhatsApp reciente</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {(internalEvents as any[]).map((ev: any) => (
              <li key={ev.id} className={cn('px-5 py-3', !ev.read && 'bg-teal-50/40')}>
                <p className="text-sm font-medium text-slate-900">{ev.body}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(ev.createdAt).toLocaleString('es-AR')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fin && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80">
            <h2 className="text-sm font-semibold text-slate-800">Resumen financiero del mes</h2>
          </div>
          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {[
              { label: 'Cobrado', value: fin.paid },
              { label: 'Pendiente de cobro', value: fin.pending },
              { label: 'Obras sociales pendientes', value: fin.socialWorkPending },
            ].map((row) => (
              <div key={row.label} className="px-5 py-4">
                <p className="text-xs text-slate-500">{row.label}</p>
                <p className="text-lg font-semibold text-slate-900 mt-0.5 tabular-nums">
                  {formatCurrency(row.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <h2 className="text-sm font-semibold text-slate-800">Agenda de hoy</h2>
          <span className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
            {todayApts.length} turnos
          </span>
        </div>
        {sortedToday.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-slate-500">No hay turnos programados para hoy.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sortedToday.map((apt: any) => {
              const color = APPOINTMENT_STATUS_COLORS[apt.status as AppointmentStatus];
              const time = new Date(apt.scheduledAt).toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <li
                  key={apt.id}
                  className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <time className="text-sm font-medium text-slate-700 w-14 shrink-0 tabular-nums">
                    {time}
                  </time>
                  <span
                    className="w-0.5 h-9 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {apt.patient?.lastName}, {apt.patient?.firstName}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {apt.treatmentType ?? 'Consulta'}
                      {apt.patient?.socialWork ? ` · ${apt.patient.socialWork}` : ''}
                      {' · '}
                      {apt.durationMinutes} min
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded border shrink-0',
                      'border-slate-200 bg-slate-50 text-slate-700',
                    )}
                    style={{ borderColor: color + '55', color }}
                  >
                    {APPOINTMENT_STATUS_LABELS[apt.status as AppointmentStatus]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
