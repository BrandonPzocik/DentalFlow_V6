import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Send, Bell, Mail, CheckCircle, XCircle, Clock, Search, MessageCircle } from 'lucide-react';
import { notificationsApi, patientsApi } from '@/api';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  sent: { label: 'Enviado', icon: CheckCircle, color: 'text-emerald-600' },
  failed: { label: 'Fallido', icon: XCircle, color: 'text-red-500' },
  pending: { label: 'Pendiente', icon: Clock, color: 'text-amber-500' },
  bounced: { label: 'Rebotado', icon: XCircle, color: 'text-orange-500' },
};

const TYPE_LABELS: Record<string, string> = {
  appointment_reminder: 'Recordatorio turno',
  appointment_confirm: 'Confirmación turno',
  appointment_cancel: 'Cancelación turno',
  prescription: 'Receta médica',
  budget: 'Presupuesto',
  invoice: 'Comprobante / factura',
  birthday: 'Cumpleaños',
  inactive_patient: 'Paciente inactivo',
  custom: 'Mensaje personalizado',
};

export function NotificationsPage() {
  const [showCompose, setShowCompose] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [compose, setCompose] = useState({ subject: '', emailBody: '' });

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['notification-logs'],
    queryFn: () => notificationsApi.logs({ limit: 100 }).then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: searchResults } = useQuery({
    queryKey: ['patient-search-notif', patientSearch],
    queryFn: () => patientsApi.search(patientSearch).then((r) => r.data),
    enabled: patientSearch.length >= 2,
  });

  const sendMutation = useMutation({
    mutationFn: (data: { patientId: string; email?: string; subject: string; emailBody: string }) =>
      notificationsApi.sendCustom(data).then((r) => r.data),
    onSuccess: (res) => {
      setShowCompose(false);
      setSelectedPatient(null);
      setCompose({ subject: '', emailBody: '' });
      refetch();
      alert(res.simulated ? res.message : res.message);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message ?? 'Error al enviar');
    },
  });

  const stats = {
    total: (logs as any[]).length,
    sent: (logs as any[]).filter((l: any) => l.status === 'sent').length,
    failed: (logs as any[]).filter((l: any) => l.status === 'failed').length,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notificaciones por email</h1>
          <p className="text-slate-500 text-sm mt-0.5">Historial de correos enviados a pacientes</p>
        </div>
        <div className="flex gap-2">
          <Link to="/notifications/whatsapp" className="btn-secondary">
            <MessageCircle size={16} /> WhatsApp
          </Link>
          <button className="btn-primary" onClick={() => setShowCompose(true)}>
            <Send size={16} /> Enviar email
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-800' },
          { label: 'Exitosos', value: stats.sent, color: 'text-emerald-700' },
          { label: 'Fallidos', value: stats.failed, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {showCompose && (
        <div className="card p-5 border-teal-200 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Nuevo email</h3>
            <button className="btn-ghost btn-sm" onClick={() => setShowCompose(false)}>✕</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Paciente *</label>
              {selectedPatient ? (
                <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
                  <div>
                    <p className="font-medium text-teal-800 text-sm">
                      {selectedPatient.lastName}, {selectedPatient.firstName}
                    </p>
                    <p className="text-xs text-teal-600">{selectedPatient.email ?? 'Sin email'}</p>
                  </div>
                  <button className="text-teal-400 hover:text-teal-600" onClick={() => setSelectedPatient(null)}>✕</button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    className="input pl-8"
                    placeholder="Buscar paciente…"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                  {searchResults && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10">
                      {(searchResults as any[]).map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-sm"
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientSearch('');
                          }}
                        >
                          {p.lastName}, {p.firstName} · {p.email ?? 'sin email'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="label">Asunto *</label>
              <input
                className="input"
                value={compose.subject}
                onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Mensaje *</label>
              <textarea
                className="input resize-none h-28"
                value={compose.emailBody}
                onChange={(e) => setCompose((c) => ({ ...c, emailBody: e.target.value }))}
                placeholder="Escribí el mensaje para el paciente…"
              />
            </div>

            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setShowCompose(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary flex-1"
                disabled={!selectedPatient?.email || !compose.subject || !compose.emailBody || sendMutation.isPending}
                onClick={() =>
                  sendMutation.mutate({
                    patientId: selectedPatient.id,
                    email: selectedPatient.email,
                    subject: compose.subject,
                    emailBody: compose.emailBody.replace(/\n/g, '<br/>'),
                  })
                }
              >
                <Mail size={14} />
                {sendMutation.isPending ? 'Enviando…' : 'Enviar email'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Cargando…</div>
        ) : (logs as any[]).length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Bell className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No hay emails enviados aún</p>
          </div>
        ) : (
          (logs as any[]).map((log: any) => {
            const st = STATUS_STYLES[log.status] ?? STATUS_STYLES.pending;
            const StIcon = st.icon;
            return (
              <div key={log.id} className="px-5 py-4 flex items-start gap-4 hover:bg-slate-50">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Mail size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-slate-800 truncate">{log.subject}</p>
                    <span className="badge bg-slate-100 text-slate-500 shrink-0">
                      {TYPE_LABELS[log.type] ?? log.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">Para: {log.recipient}</p>
                  {log.errorMessage && (
                    <p className="text-xs text-red-500 mt-0.5">{log.errorMessage}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className={cn('flex items-center gap-1 justify-end text-xs font-medium', st.color)}>
                    <StIcon size={13} />
                    {st.label}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(log.sentAt).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
