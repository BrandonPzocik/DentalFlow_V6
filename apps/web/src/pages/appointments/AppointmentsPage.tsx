import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Plus, X, CheckCircle, UserX, Play, XCircle,
  Bell, CalendarDays, LayoutGrid, CalendarX,
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { appointmentsApi, settingsApi } from '@/api';
import { AppointmentStatus } from '@dentaflow/shared';
import { cn } from '@/lib/utils';
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal';
import {
  parseAgendaSchedule,
  generateTimeSlots,
  getDaysInWeek,
  appointmentInSlot,
  slotRowHeight,
  isWorkingDay,
  shiftToWorkingDay,
  slotDateTime,
  isDateTimeInPast,
} from '@/lib/agendaSchedule';
import {
  getAppointmentVisual,
  isCancelledAppointment,
  getAvailableSlotClass,
} from '@/lib/appointmentDisplay';
import { AppointmentStatusBadge, WaOriginBadge, hasWaOrigin } from '@/components/ui/AppointmentStatusBadge';

type ViewMode = 'day' | 'week';

const STATUS_ACTIONS = [
  { status: AppointmentStatus.CONFIRMED, label: 'Confirmar', icon: CheckCircle, cls: 'text-blue-800 hover:bg-blue-50 border-blue-200' },
  { status: AppointmentStatus.IN_PROGRESS, label: 'En curso', icon: Play, cls: 'text-amber-800 hover:bg-amber-50 border-amber-200' },
  { status: AppointmentStatus.COMPLETED, label: 'Atendido', icon: CheckCircle, cls: 'text-emerald-800 hover:bg-emerald-50 border-emerald-200' },
  { status: AppointmentStatus.ABSENT, label: 'Ausente', icon: UserX, cls: 'text-red-700 hover:bg-red-50 border-red-200' },
  { status: AppointmentStatus.CANCELLED, label: 'Cancelar', icon: XCircle, cls: 'text-slate-700 hover:bg-slate-50 border-slate-300' },
];

function AppointmentPanel({ apt, onClose, onStatus, onCancel, onReminder, onReassign }: {
  apt: any; onClose: () => void;
  onStatus: (s: AppointmentStatus) => void;
  onCancel: (reason?: string) => void;
  onReminder: () => void;
  onReassign: () => void;
}) {
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const visual = getAppointmentVisual(apt);
  const cancelled = isCancelledAppointment(apt);
  const time = new Date(apt.scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(apt.scheduledAt).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div
        className="modal-shell w-full max-w-sm overflow-hidden"
        style={{ borderLeftWidth: 4, borderLeftColor: visual.borderLeftColor, borderLeftStyle: cancelled ? 'dashed' : 'solid' }}
      >
        <div className="px-4 py-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-medium text-slate-900 text-base leading-tight">
                {apt.patient?.lastName}, {apt.patient?.firstName}
              </p>
              <p className="meta-label capitalize mt-1">{date} · {time} hs</p>
              {apt.treatmentType && <p className="text-sm text-slate-700 mt-1">{apt.treatmentType}</p>}
            </div>
            <button type="button" className="p-1.5 hover:bg-slate-100 border border-transparent" onClick={onClose}>
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="meta-label">Estado:</span>
            <AppointmentStatusBadge status={apt.status as AppointmentStatus} />
            {hasWaOrigin(apt) && <WaOriginBadge />}
          </div>

          {cancelled && (
            <>
              {apt.cancellationReason && (
                <p className="meta-label text-red-700 bg-red-50 border border-red-200 px-2 py-2 mb-3">
                  {apt.cancellationReason}
                </p>
              )}
              <button
                type="button"
                onClick={onReassign}
                className="btn-primary w-full mb-4"
              >
                <Plus size={16} /> Asignar otro paciente en este horario
              </button>
            </>
          )}

          {!cancelled && (
            <>
              <div className="space-y-1.5 text-sm mb-5 text-slate-700">
                {apt.dentist && <p><span className="meta-label">Profesional: </span>Dr. {apt.dentist.lastName}</p>}
                <p><span className="meta-label">Duración: </span>{apt.durationMinutes} min{apt.chair ? ` · ${apt.chair}` : ''}</p>
                {apt.patient?.socialWork && <p><span className="meta-label">OS: </span>{apt.patient.socialWork}</p>}
                {apt.patient?.hasAllergies && <p className="text-red-700 text-micro font-medium">Paciente con alergias</p>}
                {apt.notes && <p className="meta-label italic">{apt.notes}</p>}
              </div>

              <p className="nav-section-label mb-2">Cambiar estado</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_ACTIONS.filter((a) => a.status !== apt.status).map(({ status, label, icon: Icon, cls }) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onStatus(status)}
                    className={cn('flex items-center gap-2 px-3 py-2 border text-sm font-medium transition-colors', cls)}
                  >
                    <Icon size={14} />{label}
                  </button>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                {apt.status !== AppointmentStatus.CANCELLED && apt.status !== AppointmentStatus.COMPLETED && (
                  <button
                    type="button"
                    onClick={onReminder}
                    className="btn-secondary w-full"
                  >
                    <Bell size={14} /> Enviar recordatorio por email
                  </button>
                )}
                {apt.status !== AppointmentStatus.CANCELLED && (
                  showCancel ? (
                    <div className="space-y-2">
                      <input
                        className="input text-micro"
                        placeholder="Motivo (opcional)"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button type="button" className="btn-secondary btn-sm flex-1" onClick={() => setShowCancel(false)}>
                          Volver
                        </button>
                        <button type="button" className="btn-danger btn-sm flex-1" onClick={() => onCancel(cancelReason || undefined)}>
                          Confirmar cancelación
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowCancel(true)} className="btn-danger w-full">
                      <XCircle size={14} /> Cancelar turno
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AppointmentBlock({
  apt,
  onSelect,
  onReassign,
}: {
  apt: any;
  onSelect: () => void;
  onReassign: () => void;
}) {
  const visual = getAppointmentVisual(apt);
  const time = new Date(apt.scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const cancelled = isCancelledAppointment(apt);

  return (
    <div
      className={cn('w-full px-2 py-2 mb-1 last:mb-0 border transition-colors hover:bg-slate-50/80', visual.blockClass)}
      style={{ borderLeftColor: visual.borderLeftColor }}
    >
      <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(); }} className="w-full text-left">
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className={cn('text-sm tabular-nums', cancelled ? 'text-slate-400' : 'text-slate-500')}>
            {time}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {hasWaOrigin(apt) && <WaOriginBadge />}
            <AppointmentStatusBadge status={apt.status as AppointmentStatus} compact />
          </div>
        </div>
        <p className={cn('text-sm truncate leading-tight', visual.nameClass)}>
          {apt.patient?.lastName}, {apt.patient?.firstName}
        </p>
        <p className={cn('meta-label truncate', cancelled && 'text-slate-400')}>
          {apt.treatmentType ?? 'Consulta'}
        </p>
      </button>
      {cancelled && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onReassign(); }}
          className="mt-2 w-full text-center text-micro font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 py-1 transition-colors"
        >
          + Reasignar horario
        </button>
      )}
    </div>
  );
}

export function AppointmentsPage() {
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(() => startOfDay(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [selectedApt, setSelectedApt] = useState<any>(null);

  const { data: settings = {} } = useQuery({
    queryKey: ['settings-flat'],
    queryFn: () => settingsApi.getAll().then((r) => r.data),
  });

  const schedule = useMemo(() => parseAgendaSchedule(settings as Record<string, string>), [settings]);
  const timeSlots = useMemo(() => generateTimeSlots(schedule), [schedule]);
  const rowHeight = slotRowHeight(schedule.slotMinutes);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => getDaysInWeek(weekStart, schedule), [weekStart, schedule]);

  const displayDays = viewMode === 'day'
    ? (isWorkingDay(currentDate, schedule) ? [currentDate] : [])
    : weekDays;

  const rangeFrom = viewMode === 'day'
    ? format(currentDate, 'yyyy-MM-dd') + 'T00:00:00'
    : format(weekStart, 'yyyy-MM-dd') + 'T00:00:00';
  const rangeTo = viewMode === 'day'
    ? format(currentDate, 'yyyy-MM-dd') + 'T23:59:59'
    : format(addDays(weekStart, 6), 'yyyy-MM-dd') + 'T23:59:59';

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments-range', rangeFrom, rangeTo],
    queryFn: () => appointmentsApi.range(rangeFrom, rangeTo).then((r) => r.data),
    refetchInterval: 10000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments-range'] });
      qc.invalidateQueries({ queryKey: ['appointments-today'] });
      qc.invalidateQueries({ queryKey: ['appointment-stats'] });
      setSelectedApt(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      appointmentsApi.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments-range'] });
      qc.invalidateQueries({ queryKey: ['appointments-today'] });
      setSelectedApt(null);
    },
  });

  const reminderMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.sendReminder(id).then((r) => r.data),
    onSuccess: (res: { ok?: boolean; message?: string }) => {
      alert(res?.message ?? 'Recordatorio enviado por email');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message ?? 'No se pudo enviar el recordatorio');
    },
  });

  function navigatePrev() {
    if (viewMode === 'day') {
      setCurrentDate((d) => shiftToWorkingDay(d, schedule, -1));
    } else {
      setCurrentDate((d) => addDays(d, -7));
    }
  }

  function navigateNext() {
    if (viewMode === 'day') {
      setCurrentDate((d) => shiftToWorkingDay(d, schedule, 1));
    } else {
      setCurrentDate((d) => addDays(d, 7));
    }
  }

  function goToday() {
    const today = startOfDay(new Date());
    setCurrentDate(isWorkingDay(today, schedule) ? today : shiftToWorkingDay(today, schedule, 1));
  }

  function openReassign(slotAt: Date) {
    setSelectedApt(null);
    setSelectedSlot(slotAt);
    setShowModal(true);
  }

  const headerSubtitle = viewMode === 'day'
    ? format(currentDate, "EEEE d 'de' MMMM yyyy", { locale: es })
    : weekDays.length > 0
      ? `Semana del ${format(weekDays[0], "d MMM", { locale: es })} al ${format(weekDays[weekDays.length - 1], "d MMM yyyy", { locale: es })}`
      : 'Sin días de atención en esta semana';

  const colCount = displayDays.length;
  const gridCols = colCount > 0 ? `56px repeat(${colCount}, minmax(120px, 1fr))` : '56px 1fr';

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-heading">Agenda</h1>
          <p className="meta-label mt-1 capitalize">{headerSubtitle}</p>
          <p className="meta-label mt-1">
            Horario de atención: {schedule.startTime} – {schedule.endTime}
            {' · '}
            franjas de {schedule.slotMinutes} min
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-1">
            <button
              type="button"
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-md text-base font-medium transition-colors',
                viewMode === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800',
              )}
              onClick={() => setViewMode('day')}
            >
              <CalendarDays size={15} /> Día
            </button>
            <button
              type="button"
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-md text-base font-medium transition-colors',
                viewMode === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800',
              )}
              onClick={() => setViewMode('week')}
            >
              <LayoutGrid size={15} /> Semana
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="btn-secondary btn-sm p-2" onClick={navigatePrev} aria-label="Anterior">
              <ChevronLeft size={16} />
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={goToday}>Hoy</button>
            <button type="button" className="btn-secondary btn-sm p-2" onClick={navigateNext} aria-label="Siguiente">
              <ChevronRight size={16} />
            </button>
          </div>
          <button type="button" className="btn-primary" onClick={() => { setSelectedSlot(null); setShowModal(true); }}>
            <Plus size={16} /> Nuevo turno
          </button>
        </div>
      </div>

      {colCount === 0 ? (
        <div className="panel empty-state">
          <CalendarX className="empty-state-icon" strokeWidth={1.25} />
          <p className="empty-state-text">No hay días de atención en este período.</p>
          <p className="meta-label mt-1">Revisá los días habilitados en Configuración → Agenda.</p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="grid border-b border-slate-300 bg-slate-50" style={{ gridTemplateColumns: gridCols }}>
            <div className="border-r border-slate-300 px-2 py-2" style={{ width: 56 }} />
            {displayDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'px-2 py-2 text-center border-r border-slate-300 last:border-r-0',
                    isToday && 'bg-teal-50/60',
                  )}
                >
                  <p className="nav-section-label text-slate-500">
                    {format(day, 'EEE', { locale: es })}
                  </p>
                  <p className="mt-1 flex justify-center">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-7 h-7 text-sm font-medium tabular-nums',
                        isToday ? 'rounded-full bg-teal-700 text-white' : 'text-slate-900',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-280px)] min-h-[320px]">
            {timeSlots.map((slot, slotIdx) => (
              <div
                key={slot.totalMinutes}
                className="grid border-b border-slate-200"
                style={{ gridTemplateColumns: gridCols, minHeight: rowHeight }}
              >
                <div
                  className="border-r border-slate-300 px-2 flex items-start justify-end pt-2 bg-slate-50"
                  style={{ width: 56 }}
                >
                  <span className="text-sm text-slate-600 tabular-nums">{slot.label}</span>
                </div>
                {displayDays.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  const slotAt = slotDateTime(day, slot);
                  const past = isDateTimeInPast(slotAt);
                  const apts = (appointments as any[]).filter((a) =>
                    appointmentInSlot(a, day, slot, schedule.slotMinutes),
                  );
                  const activeApts = apts.filter((a) => !isCancelledAppointment(a));
                  const empty = apts.length === 0;
                  const hasOnlyCancelled = apts.length > 0 && activeApts.length === 0;

                  return (
                    <div
                      key={`${day.toISOString()}-${slot.totalMinutes}`}
                      className={cn(
                        'border-r border-slate-200 last:border-r-0 p-1 transition-colors relative',
                        slotIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                        isToday && 'bg-teal-50/40',
                        past && 'bg-slate-100/80 cursor-not-allowed opacity-60',
                        !past && empty && 'cursor-pointer hover:bg-teal-50/30',
                      )}
                      onClick={() => {
                        if (past) return;
                        if (activeApts.length > 0) return;
                        openReassign(slotAt);
                      }}
                    >
                      {!past && empty && (
                        <button
                          type="button"
                          className={cn(getAvailableSlotClass(), 'min-h-0 h-full text-sm font-medium opacity-0 hover:opacity-100 focus:opacity-100')}
                          onClick={(e) => { e.stopPropagation(); openReassign(slotAt); }}
                        >
                          Disponible
                        </button>
                      )}
                      {hasOnlyCancelled && !past && (
                        <button
                          type="button"
                          className={cn(getAvailableSlotClass(), 'min-h-0 mb-1 text-sm font-medium')}
                          onClick={(e) => { e.stopPropagation(); openReassign(slotAt); }}
                        >
                          Disponible
                        </button>
                      )}
                      {apts.map((apt: any) => (
                        <AppointmentBlock
                          key={apt.id}
                          apt={apt}
                          onSelect={() => setSelectedApt(apt)}
                          onReassign={() => openReassign(slotAt)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {Object.values(AppointmentStatus).map((s) => (
          <AppointmentStatusBadge key={s} status={s} compact />
        ))}
        <WaOriginBadge />
        <span className="meta-label ml-2">Origen WhatsApp</span>
      </div>

      {selectedApt && (
        <AppointmentPanel
          apt={selectedApt}
          onClose={() => setSelectedApt(null)}
          onStatus={(status) => statusMutation.mutate({ id: selectedApt.id, status })}
          onCancel={(reason) => cancelMutation.mutate({ id: selectedApt.id, reason })}
          onReminder={() => reminderMutation.mutate(selectedApt.id)}
          onReassign={() => openReassign(new Date(selectedApt.scheduledAt))}
        />
      )}

      {showModal && (
        <NewAppointmentModal
          initialDate={selectedSlot}
          schedule={schedule}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['appointments-range'] });
            qc.invalidateQueries({ queryKey: ['appointments-today'] });
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
