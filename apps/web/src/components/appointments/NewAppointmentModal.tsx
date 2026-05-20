import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Save, Search } from 'lucide-react';
import { format } from 'date-fns';
import { appointmentsApi, patientsApi, usersApi } from '@/api';
import { useAuthStore } from '@/store/auth.store';
import {
  AgendaSchedule,
  datetimeLocalBounds,
  isWorkingDay,
  isDateTimeInPast,
  minDateTimeForBooking,
} from '@/lib/agendaSchedule';

interface Props {
  initialDate: Date | null;
  schedule: AgendaSchedule;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewAppointmentModal({ initialDate, schedule, onClose, onSuccess }: Props) {
  const user = useAuthStore((s) => s.user);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const defaultWhen = initialDate
    ? format(initialDate, "yyyy-MM-dd'T'HH:mm")
    : '';

  const [form, setForm] = useState({
    dentistId: user?.id ?? '',
    scheduledAt: defaultWhen,
    durationMinutes: schedule.slotMinutes,
    treatmentType: '',
    notes: '',
    chair: '',
  });

  const { data: searchResults } = useQuery({
    queryKey: ['patient-search', patientSearch],
    queryFn: () => patientsApi.search(patientSearch).then((r) => r.data),
    enabled: patientSearch.length >= 2,
  });

  const { data: dentists } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => appointmentsApi.create(data),
    onSuccess,
  });

  const selectedDate = form.scheduledAt ? new Date(form.scheduledAt) : null;
  const bounds = selectedDate ? datetimeLocalBounds(selectedDate, schedule) : null;
  const dayOk = selectedDate ? isWorkingDay(selectedDate, schedule) : true;
  const isPast = selectedDate ? isDateTimeInPast(selectedDate) : false;
  const minDateTime = minDateTimeForBooking(schedule, form.scheduledAt);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!dayOk) {
      alert('Ese día no está habilitado para atención. Elegí un día laboral en Configuración → Agenda.');
      return;
    }
    if (isPast) {
      alert('No podés agendar un turno en una fecha u horario que ya pasó.');
      return;
    }
    mutation.mutate({
      ...form,
      patientId: selectedPatient.id,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
    });
  }

  const set = (field: string, value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-slide-up border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Nuevo turno</h2>
          <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" onClick={onClose}>
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            Horario permitido: {schedule.startTime} a {schedule.endTime}
          </p>

          <div>
            <label className="label">Paciente *</label>
            {selectedPatient ? (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {selectedPatient.lastName}, {selectedPatient.firstName}
                  </p>
                  <p className="text-xs text-slate-500">DNI {selectedPatient.dni}</p>
                </div>
                <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setSelectedPatient(null)}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  className="input pl-8"
                  placeholder="Buscar por nombre o DNI…"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
                {searchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {searchResults.map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                        onClick={() => { setSelectedPatient(p); setPatientSearch(''); }}
                      >
                        <p className="text-sm font-medium text-slate-800">{p.lastName}, {p.firstName}</p>
                        <p className="text-xs text-slate-500">DNI {p.dni}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="label">Fecha y hora *</label>
            <input
              type="datetime-local"
              className="input"
              value={form.scheduledAt}
              onChange={(e) => set('scheduledAt', e.target.value)}
              min={minDateTime}
              max={bounds?.max}
              required
            />
            {!dayOk && form.scheduledAt && (
              <p className="text-xs text-amber-700 mt-1">Este día no está dentro de tu agenda laboral.</p>
            )}
            {isPast && form.scheduledAt && (
              <p className="text-xs text-red-600 mt-1">Elegí una fecha y hora futura.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Duración (min)</label>
              <select className="input" value={form.durationMinutes} onChange={(e) => set('durationMinutes', +e.target.value)}>
                {[15, 20, 30, 45, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sillón</label>
              <input className="input" value={form.chair} onChange={(e) => set('chair', e.target.value)} placeholder="Sillón 1" />
            </div>
          </div>

          <div>
            <label className="label">Tipo de prestación</label>
            <input
              className="input"
              value={form.treatmentType}
              onChange={(e) => set('treatmentType', e.target.value)}
              placeholder="Obturación, Limpieza…"
            />
          </div>

          {dentists && (
            <div>
              <label className="label">Profesional</label>
              <select className="input" value={form.dentistId} onChange={(e) => set('dentistId', e.target.value)}>
                {dentists.map((d: any) => (
                  <option key={d.id} value={d.id}>Dr. {d.lastName}, {d.firstName}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Notas</label>
            <textarea className="input resize-none h-16 text-xs" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          {mutation.isError && (
            <p className="text-xs text-red-600">
              {(mutation.error as any)?.response?.data?.message ?? 'Error al crear el turno'}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending || !selectedPatient || !dayOk || isPast}>
              <Save size={14} />
              {mutation.isPending ? 'Guardando…' : 'Crear turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
