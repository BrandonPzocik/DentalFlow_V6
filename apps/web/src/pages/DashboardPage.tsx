import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Calendar, DollarSign, AlertCircle, Plus,
  CheckCircle2, XCircle, CalendarClock, Phone, ArrowRight, CalendarX,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMinutes, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { appointmentsApi, patientsApi, billingApi, whatsappApi, settingsApi } from '@/api';
import { useAuthStore } from '@/store/auth.store';
import { AppointmentStatus } from '@dentaflow/shared';
import { cn } from '@/lib/utils';
import { getAppointmentVisual, isCancelledAppointment, getAvailableSlotClass } from '@/lib/appointmentDisplay';
import { Link } from 'react-router-dom';
import { parseAgendaSchedule } from '@/lib/agendaSchedule';
import { AppointmentStatusBadge, WaOriginBadge, hasWaOrigin } from '@/components/ui/AppointmentStatusBadge';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  iconClass,
}: {
  label: string;
  value: string | number;
  icon: typeof Calendar;
  sub?: string;
  iconClass: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="meta-label">{label}</p>
          <p className="text-[26px] font-medium text-slate-900 mt-1 tabular-nums leading-tight">{value}</p>
          {sub && <p className="meta-label mt-2 leading-snug">{sub}</p>}
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', iconClass)}>
          <Icon size={22} strokeWidth={1.75} className="text-white" />
        </div>
      </div>
    </div>
  );
}

type TimelineItem =
  | { kind: 'appointment'; apt: any }
  | { kind: 'slot'; at: Date };

function buildTimeline(apts: any[], minGapMinutes = 30): TimelineItem[] {
  const sorted = [...apts].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
  const items: TimelineItem[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const apt = sorted[i];
    if (isCancelledAppointment(apt)) {
      items.push({ kind: 'slot', at: new Date(apt.scheduledAt) });
      continue;
    }
    items.push({ kind: 'appointment', apt });

    const end = addMinutes(new Date(apt.scheduledAt), apt.durationMinutes ?? 30);
    const nextActive = sorted.slice(i + 1).find((a) => !isCancelledAppointment(a));
    if (nextActive) {
      const gap = differenceInMinutes(new Date(nextActive.scheduledAt), end);
      if (gap >= minGapMinutes) {
        items.push({ kind: 'slot', at: end });
      }
    }
  }

  return items;
}

const ACTIVITY_ICONS: Record<string, { icon: typeof CheckCircle2; cls: string }> = {
  appointment_confirmed: { icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  appointment_cancelled: { icon: XCircle, cls: 'text-red-700 bg-red-50 border-red-200' },
  appointment_reschedule_request: { icon: CalendarClock, cls: 'text-blue-700 bg-blue-50 border-blue-200' },
};

const URGENT_ICONS: Record<string, { icon: typeof XCircle; cls: string; action: string }> = {
  appointment_cancelled: { icon: XCircle, cls: 'text-red-700 bg-red-50 border-red-200', action: 'Cancelación de turno' },
  appointment_reschedule_request: { icon: CalendarClock, cls: 'text-blue-700 bg-blue-50 border-blue-200', action: 'Solicitud de reprogramación' },
};

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const dateLabel = format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es });

  const { data: todayApts = [] } = useQuery({
    queryKey: ['appointments-today', today],
    queryFn: () => appointmentsApi.day(today).then((r) => r.data),
    refetchInterval: 10000,
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
  const { data: settings = {} } = useQuery({
    queryKey: ['settings-flat'],
    queryFn: () => settingsApi.getAll().then((r) => r.data),
  });
  const { data: internalEvents = [] } = useQuery({
    queryKey: ['whatsapp-internal'],
    queryFn: () => whatsappApi.internal({ limit: 20 }).then((r) => r.data),
    refetchInterval: 10000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => whatsappApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-internal'] }),
  });

  const schedule = useMemo(() => parseAgendaSchedule(settings as Record<string, string>), [settings]);
  const timeline = useMemo(
    () => buildTimeline(todayApts, schedule.slotMinutes),
    [todayApts, schedule.slotMinutes],
  );

  const activeToday = todayApts.filter((a: any) => !isCancelledAppointment(a));
  const completedToday = activeToday.filter((a: any) => a.status === AppointmentStatus.COMPLETED).length;
  const pendingToday = activeToday.filter((a: any) =>
    [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.CONFIRMED_BY_PATIENT].includes(a.status),
  ).length;

  const urgentAlerts = (internalEvents as any[]).filter(
    (ev) => !ev.read && ev.type !== 'appointment_confirmed',
  );
  const goalProgress = fin && fin.total > 0 ? Math.min(100, Math.round((fin.paid / fin.total) * 100)) : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <header>
        <p className="meta-label capitalize">{dateLabel}</p>
        <h1 className="page-heading mt-1">
          {greeting}, Dr. {user?.lastName}
        </h1>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Turnos hoy"
          value={activeToday.length}
          icon={Calendar}
          iconClass="bg-teal-700"
          sub={`${completedToday} atendidos · ${pendingToday} pendientes`}
        />
        <StatCard
          label="Pacientes totales"
          value={patientsData?.total ?? '—'}
          icon={Users}
          iconClass="bg-blue-600"
          sub="En la base clínica"
        />
        <StatCard
          label="Facturado (mes)"
          value={fin ? formatCurrency(fin.total) : '—'}
          icon={DollarSign}
          iconClass="bg-indigo-600"
          sub={fin ? `${formatCurrency(fin.paid)} cobrados` : undefined}
        />
        <StatCard
          label="Ausentismo (mes)"
          value={aptStats ? `${aptStats.absenceRate}%` : '—'}
          icon={AlertCircle}
          iconClass="bg-red-600"
          sub={`${aptStats?.absent ?? 0} ausencias registradas`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {urgentAlerts.length > 0 && (
            <section className="urgent-panel overflow-hidden">
              <div className="panel-header flex items-center justify-between">
                <h2 className="section-heading flex items-center gap-2 text-red-900">
                  <AlertCircle size={16} className="text-red-600" />
                  Alertas urgentes
                </h2>
                <span className="badge-pill bg-red-700 text-white border-red-700 text-micro px-2 py-0.5">
                  {urgentAlerts.length} pendientes
                </span>
              </div>
              <ul className="divide-y divide-slate-200">
                {urgentAlerts.slice(0, 5).map((ev: any) => {
                  const meta = URGENT_ICONS[ev.type] ?? URGENT_ICONS.appointment_cancelled;
                  const Icon = meta.icon;
                  return (
                    <li key={ev.id} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-red-50/30">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn('w-8 h-8 border flex items-center justify-center shrink-0', meta.cls)}>
                          <Icon size={15} strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{meta.action}</p>
                          <p className="meta-label mt-0.5">{ev.body ?? ev.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => markReadMutation.mutate(ev.id)}
                          className="btn-secondary btn-sm"
                        >
                          Ignorar
                        </button>
                        {ev.type === 'appointment_reschedule_request' ? (
                          <Link to="/appointments" className="btn-primary btn-sm">
                            Reprogramar
                          </Link>
                        ) : ev.patientId ? (
                          <Link to={`/patients/${ev.patientId}`} className="btn-secondary btn-sm inline-flex">
                            <Phone size={12} /> Ver paciente
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="panel overflow-hidden">
            <div className="panel-header flex items-center justify-between">
              <h2 className="section-heading">Agenda de hoy</h2>
              <Link
                to="/appointments"
                className="text-sm font-medium text-teal-800 hover:text-teal-900 inline-flex items-center gap-1"
              >
                Ver calendario completo <ArrowRight size={14} />
              </Link>
            </div>

            {timeline.length === 0 ? (
              <div className="empty-state">
                <CalendarX className="empty-state-icon" strokeWidth={1.25} />
                <p className="empty-state-text mb-4">No hay turnos activos para hoy.</p>
                <Link to="/appointments" className="btn-primary btn-sm inline-flex">
                  <Plus size={14} /> Agendar turno
                </Link>
              </div>
            ) : (
              <ul className="p-4 space-y-3">
                {timeline.map((item, idx) => {
                  if (item.kind === 'slot') {
                    const time = item.at.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <li key={`slot-${idx}-${item.at.toISOString()}`}>
                        <Link
                          to="/appointments"
                          className={cn(getAvailableSlotClass(), 'text-sm font-medium text-slate-600 hover:text-teal-800')}
                        >
                          <Plus size={16} className="text-teal-700" />
                          <span>Disponible {time} — Agendar turno</span>
                        </Link>
                      </li>
                    );
                  }

                  const apt = item.apt;
                  const visual = getAppointmentVisual(apt);
                  const time = new Date(apt.scheduledAt).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <li
                      key={apt.id}
                      className={cn(
                        'panel p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-slate-50/80 transition-colors',
                        visual.rowClass,
                      )}
                      style={{ borderLeftWidth: 4, borderLeftColor: visual.borderLeftColor, borderLeftStyle: visual.cancelled ? 'dashed' : 'solid' }}
                    >
                      <div className="flex items-center gap-3 sm:w-28 shrink-0">
                        <span className="text-base font-medium text-slate-900 tabular-nums">{time}</span>
                        <span className="meta-label">{apt.durationMinutes} min</span>
                      </div>
                      <div className="flex-1 min-w-0 sm:border-l sm:border-slate-200 sm:pl-4">
                        <p className={cn('text-sm', visual.nameClass)}>
                          {apt.patient?.lastName}, {apt.patient?.firstName}
                        </p>
                        <p className="meta-label mt-0.5">
                          {apt.treatmentType ?? 'Consulta odontológica'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {hasWaOrigin(apt) && <WaOriginBadge />}
                        <AppointmentStatusBadge status={apt.status as AppointmentStatus} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel overflow-hidden">
            <div className="panel-header">
              <h2 className="section-heading">Actividad reciente</h2>
            </div>
            {internalEvents.length === 0 ? (
              <div className="empty-state py-8">
                <p className="empty-state-text">Sin actividad reciente por WhatsApp.</p>
              </div>
            ) : (
              <ul className="p-2">
                {(internalEvents as any[]).slice(0, 8).map((ev: any) => {
                  const meta = ACTIVITY_ICONS[ev.type] ?? ACTIVITY_ICONS.appointment_confirmed;
                  const Icon = meta.icon;
                  return (
                    <li
                      key={ev.id}
                      className={cn(
                        'flex gap-3 py-2 px-2 hover:bg-slate-50 transition-colors',
                        !ev.read && 'bg-slate-50/80',
                      )}
                    >
                      <div className={cn('w-8 h-8 border flex items-center justify-center shrink-0', meta.cls)}>
                        <Icon size={15} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800 leading-snug">{ev.body}</p>
                        <p className="text-sm text-slate-400 mt-0.5">
                          {new Date(ev.createdAt).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {fin && (
            <section className="panel overflow-hidden">
              <div className="panel-header">
                <h2 className="section-heading">Resumen financiero</h2>
              </div>
              <div className="p-4 space-y-4">
                {[
                  { label: 'Cobrado', value: fin.paid, primary: true },
                  { label: 'Pendiente de cobro', value: fin.pending },
                  { label: 'Obras sociales pendientes', value: fin.socialWorkPending },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-2">
                    <span className="meta-label">{row.label}</span>
                    <span className={cn('text-sm tabular-nums', row.primary ? 'font-medium text-slate-900' : 'text-slate-700')}>
                      {formatCurrency(row.value)}
                    </span>
                  </div>
                ))}
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex justify-between meta-label mb-2">
                    <span>Meta del mes</span>
                    <span className="font-medium text-slate-700">{goalProgress}% alcanzado</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 overflow-hidden rounded-full border border-slate-200">
                    <div
                      className="h-full bg-teal-600 transition-all rounded-full"
                      style={{ width: `${goalProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
