import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, X, CheckCircle, UserX, Play, XCircle, Bell, CalendarDays, LayoutGrid } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { appointmentsApi, settingsApi } from '@/api';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS, AppointmentStatus } from '@dentaflow/shared';
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

type ViewMode = 'day' | 'week';

const STATUS_ACTIONS = [
  { status: AppointmentStatus.CONFIRMED,   label: 'Confirmar',  icon: CheckCircle, cls: 'text-blue-700 hover:bg-blue-50 border-blue-200' },
  { status: AppointmentStatus.IN_PROGRESS, label: 'En curso',   icon: Play,        cls: 'text-amber-700 hover:bg-amber-50 border-amber-200' },
  { status: AppointmentStatus.COMPLETED,   label: 'Atendido',   icon: CheckCircle, cls: 'text-emerald-700 hover:bg-emerald-50 border-emerald-200' },
  { status: AppointmentStatus.ABSENT,      label: 'Ausente',    icon: UserX,       cls: 'text-red-600 hover:bg-red-50 border-red-200' },
  { status: AppointmentStatus.CANCELLED,   label: 'Cancelar',   icon: XCircle,     cls: 'text-slate-600 hover:bg-slate-100 border-slate-300' },
];

function AppointmentPanel({ apt, onClose, onStatus, onCancel, onReminder }: {
  apt: any; onClose: () => void;
  onStatus: (s: AppointmentStatus) => void;
  onCancel: (reason?: string) => void;
  onReminder: () => void;
}) {
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const color = APPOINTMENT_STATUS_COLORS[apt.status as AppointmentStatus];
  const time = new Date(apt.scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(apt.scheduledAt).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-slide-up overflow-hidden border border-slate-200">
        <div className="h-1" style={{ backgroundColor: color }} />
        <div className="px-5 py-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-semibold text-slate-900 text-lg leading-tight">
                {apt.patient?.lastName}, {apt.patient?.firstName}
              </p>
              <p className="text-sm text-slate-500 capitalize mt-0.5">{date} · {time} hs</p>
              {apt.treatmentType && <p className="text-sm text-slate-700 font-medium mt-0.5">{apt.treatmentType}</p>}
            </div>
            <button className="p-1.5 hover:bg-slate-100 rounded-lg" onClick={onClose}><X size={16} className="text-slate-400" /></button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-slate-500">Estado:</span>
            <span className="badge font-medium text-xs border" style={{ borderColor: color + '66', color, backgroundColor: color + '14' }}>
              {APPOINTMENT_STATUS_LABELS[apt.status as AppointmentStatus]}
            </span>
          </div>

          <div className="space-y-1.5 text-sm mb-5 text-slate-700">
            {apt.dentist && <p><span className="text-slate-500">Profesional: </span>Dr. {apt.dentist.lastName}</p>}
            <p><span className="text-slate-500">Duración: </span>{apt.durationMinutes} min{apt.chair ? ` · ${apt.chair}` : ''}</p>
            {apt.patient?.socialWork && <p><span className="text-slate-500">OS: </span>{apt.patient.socialWork}</p>}
            {apt.patient?.hasAllergies && <p className="text-red-600 font-medium text-xs">Paciente con alergias</p>}
            {apt.notes && <p className="text-slate-500 italic text-xs">{apt.notes}</p>}
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cambiar estado</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_ACTIONS.filter((a) => a.status !== apt.status).map(({ status, label, icon: Icon, cls }) => (
              <button key={status} onClick={() => onStatus(status)}
                className={cn('flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all', cls)}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
            {apt.status !== AppointmentStatus.CANCELLED && apt.status !== AppointmentStatus.COMPLETED && (
              <button onClick={onReminder}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium">
                <Bell size={14} /> Enviar recordatorio por email
              </button>
            )}
            {apt.status !== AppointmentStatus.CANCELLED && (
              showCancel ? (
                <div className="space-y-2">
                  <input className="input text-xs py-1.5" placeholder="Motivo (opcional)"
                    value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                  <div className="flex gap-2">
                    <button className="flex-1 text-xs py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      onClick={() => setShowCancel(false)}>Volver</button>
                    <button className="flex-1 text-xs py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium"
                      onClick={() => onCancel(cancelReason || undefined)}>Confirmar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowCancel(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium">
                  <XCircle size={14} /> Cancelar turno
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const WA_BADGES: Record<string, { label: string; cls: string }> = {
  sent: { label: 'WA enviado', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  confirmed: { label: 'WA confirmado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'WA cancelado', cls: 'bg-red-50 text-red-700 border-red-200' },
  reschedule_requested: { label: 'WA reprogramar', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
};

function AppointmentBlock({ apt, onSelect }: { apt: any; onSelect: () => void }) {
  const color = APPOINTMENT_STATUS_COLORS[apt.status as AppointmentStatus];
  const time = new Date(apt.scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const wa = apt.whatsappStatus ? WA_BADGES[apt.whatsappStatus] : null;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className="w-full text-left rounded-md px-2.5 py-2 mb-1.5 last:mb-0 border shadow-sm hover:shadow transition-shadow"
      style={{
        backgroundColor: '#fff',
        borderColor: color + '99',
        borderLeftWidth: 4,
        borderLeftColor: color,
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs font-semibold text-slate-500 tabular-nums">{time}</p>
        {wa && (
          <span className={cn('text-[10px] px-1.5 py-0 rounded border font-medium', wa.cls)}>
            {wa.label}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
        {apt.patient?.lastName}, {apt.patient?.firstName}
      </p>
      <p className="text-xs text-slate-600 truncate">{apt.treatmentType ?? 'Consulta'}</p>
    </button>
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
          <h1 className="page-title">Agenda</h1>
          <p className="text-slate-600 text-sm mt-0.5 capitalize">{headerSubtitle}</p>
          <p className="text-xs text-slate-500 mt-1">
            Horario de atención: {schedule.startTime} – {schedule.endTime}
            {' · '}
            franjas de {schedule.slotMinutes} min
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5">
            <button
              type="button"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800',
              )}
              onClick={() => setViewMode('day')}
            >
              <CalendarDays size={15} /> Día
            </button>
            <button
              type="button"
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800',
              )}
              onClick={() => setViewMode('week')}
            >
              <LayoutGrid size={15} /> Semana
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button className="btn-secondary btn-sm p-2 border-slate-300" onClick={navigatePrev} aria-label="Anterior">
              <ChevronLeft size={16} />
            </button>
            <button className="btn-secondary btn-sm border-slate-300" onClick={goToday}>Hoy</button>
            <button className="btn-secondary btn-sm p-2 border-slate-300" onClick={navigateNext} aria-label="Siguiente">
              <ChevronRight size={16} />
            </button>
          </div>
          <button className="btn-primary" onClick={() => { setSelectedSlot(null); setShowModal(true); }}>
            <Plus size={16} /> Nuevo turno
          </button>
        </div>
      </div>

      {colCount === 0 ? (
        <div className="rounded-lg border border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <p className="text-slate-700 font-medium">No hay días de atención en este período</p>
          <p className="text-sm text-slate-500 mt-1">
            Revisá los días habilitados en Configuración → Agenda.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-300 bg-white overflow-hidden shadow-sm">
          <div className="grid border-b-2 border-slate-300 bg-slate-100" style={{ gridTemplateColumns: gridCols }}>
            <div className="border-r border-slate-300 px-2 py-2" />
            {displayDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'px-2 py-2 text-center border-r border-slate-300 last:border-r-0',
                    isToday && 'bg-slate-800 text-white',
                  )}
                >
                  <p className={cn('text-xs font-semibold uppercase tracking-wide', isToday ? 'text-slate-200' : 'text-slate-600')}>
                    {format(day, 'EEE', { locale: es })}
                  </p>
                  <p className={cn('text-xl font-bold tabular-nums', isToday ? 'text-white' : 'text-slate-900')}>
                    {format(day, 'd')}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-280px)] min-h-[320px] bg-slate-50/50">
            {timeSlots.map((slot, slotIdx) => (
              <div
                key={slot.totalMinutes}
                className="grid border-b border-slate-200"
                style={{ gridTemplateColumns: gridCols, minHeight: rowHeight }}
              >
                <div className={cn(
                  'border-r border-slate-300 px-2 flex items-start justify-end pt-2 bg-slate-100',
                  slotIdx % 2 === 0 && 'bg-slate-100',
                )}>
                  <span className="text-xs font-medium text-slate-600 tabular-nums">{slot.label}</span>
                </div>
                {displayDays.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  const slotAt = slotDateTime(day, slot);
                  const past = isDateTimeInPast(slotAt);
                  const apts = (appointments as any[]).filter((a) =>
                    appointmentInSlot(a, day, slot, schedule.slotMinutes),
                  );
                  return (
                    <div
                      key={`${day.toISOString()}-${slot.totalMinutes}`}
                      className={cn(
                        'border-r border-slate-200 last:border-r-0 p-1.5 transition-colors',
                        slotIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80',
                        isToday && !past && 'ring-1 ring-inset ring-slate-400/30',
                        past
                          ? 'bg-slate-100/90 cursor-not-allowed opacity-60'
                          : 'cursor-pointer hover:bg-slate-100',
                      )}
                      onClick={() => {
                        if (past) return;
                        setSelectedSlot(slotAt);
                        setShowModal(true);
                      }}
                    >
                      {apts.map((apt: any) => (
                        <AppointmentBlock key={apt.id} apt={apt} onSelect={() => setSelectedApt(apt)} />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-2 items-center text-xs text-slate-600">
        {Object.values(AppointmentStatus).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: APPOINTMENT_STATUS_COLORS[s] }} />
            {APPOINTMENT_STATUS_LABELS[s]}
          </div>
        ))}
        <span className="text-slate-400">Clic en celda vacía: nuevo turno · Clic en turno: detalle</span>
      </div>

      {selectedApt && (
        <AppointmentPanel
          apt={selectedApt}
          onClose={() => setSelectedApt(null)}
          onStatus={(status) => statusMutation.mutate({ id: selectedApt.id, status })}
          onCancel={(reason) => cancelMutation.mutate({ id: selectedApt.id, reason })}
          onReminder={() => reminderMutation.mutate(selectedApt.id)}
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
