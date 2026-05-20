import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Settings, Building2, Bell, Calendar, DollarSign, User, KeyRound, Eye, EyeOff } from 'lucide-react';
import { settingsApi, usersApi } from '@/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const TABS = ['Consultorio', 'Notificaciones', 'Agenda', 'Mi cuenta'] as const;
type Tab = typeof TABS[number];

const TAB_ICONS: Record<Tab, any> = {
  'Consultorio': Building2,
  'Notificaciones': Bell,
  'Agenda': Calendar,
  'Mi cuenta': User,
};

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-slate-100 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0 w-64">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const qc = useQueryClient();
  const { user, setAuth, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('Consultorio');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    specialty: user?.specialty ?? '',
    phone: '',
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);

  const { data: flatSettings = {} } = useQuery({
    queryKey: ['settings-flat'],
    queryFn: () => settingsApi.getAll().then((r) => r.data),
  });

  useEffect(() => {
    if (flatSettings && Object.keys(flatSettings).length > 0) {
      setSettings(flatSettings as Record<string, string>);
    }
  }, [flatSettings]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) => settingsApi.bulkSet(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-flat'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => usersApi.update(user!.id, data),
    onSuccess: (res) => {
      setAuth(token!, { ...user!, ...res.data });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const set = (key: string, value: string) => setSettings((s) => ({ ...s, [key]: value }));

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title">Configuración</h1>
        <p className="text-slate-500 text-sm mt-0.5">Ajustes del consultorio y del sistema</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => {
          const Icon = TAB_ICONS[t];
          return (
            <button key={t} onClick={() => setActiveTab(t)}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              <Icon size={15} />
              {t}
            </button>
          );
        })}
      </div>

      {/* Consultorio */}
      {activeTab === 'Consultorio' && (
        <div className="card p-6">
          <h2 className="section-title mb-2">Datos del consultorio</h2>
          <p className="text-sm text-slate-400 mb-5">Estos datos aparecen en las facturas y notificaciones enviadas a pacientes.</p>

          <SettingRow label="Nombre del consultorio">
            <input className="input" value={settings['clinic_name'] ?? ''} onChange={(e) => set('clinic_name', e.target.value)} />
          </SettingRow>
          <SettingRow label="Dirección" description="Incluida en facturas y emails">
            <input className="input" value={settings['clinic_address'] ?? ''} onChange={(e) => set('clinic_address', e.target.value)} />
          </SettingRow>
          <SettingRow label="Teléfono de contacto">
            <input className="input" value={settings['clinic_phone'] ?? ''} onChange={(e) => set('clinic_phone', e.target.value)} />
          </SettingRow>
          <SettingRow label="Email del consultorio" description="Se usa como remitente en emails">
            <input type="email" className="input" value={settings['clinic_email'] ?? ''} onChange={(e) => set('clinic_email', e.target.value)} />
          </SettingRow>
          <SettingRow label="URL del logo" description="HTTPS — se muestra en emails enviados">
            <input className="input" value={settings['clinic_logo_url'] ?? ''} onChange={(e) => set('clinic_logo_url', e.target.value)} placeholder="https://…" />
          </SettingRow>
          <SettingRow label="Moneda" description="Usada en facturas y reportes">
            <select className="input" value={settings['currency'] ?? 'ARS'} onChange={(e) => set('currency', e.target.value)}>
              <option value="ARS">ARS — Peso argentino</option>
              <option value="USD">USD — Dólar</option>
              <option value="UYU">UYU — Peso uruguayo</option>
            </select>
          </SettingRow>
          <SettingRow label="Prefijo de facturas" description="Ej: DF → DF-2025-00001">
            <input className="input w-24 font-mono" value={settings['invoice_prefix'] ?? 'DF'} onChange={(e) => set('invoice_prefix', e.target.value)} />
          </SettingRow>

          <div className="flex justify-end mt-6">
            <button className="btn-primary" onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}>
              <Save size={15} />
              {saved ? '¡Guardado!' : saveMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}

      {/* Notificaciones */}
      {activeTab === 'Notificaciones' && (
        <div className="card p-6">
          <h2 className="section-title mb-2">Recordatorios automáticos</h2>
          <p className="text-sm text-slate-400 mb-5">Configurá cuándo y cómo se envían los recordatorios de turno.</p>

          <SettingRow label="Recordatorio 48hs antes" description="Enviado por email con detalles del turno">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-teal-600 w-4 h-4"
                checked={settings['reminder_48h'] === 'true'}
                onChange={(e) => set('reminder_48h', e.target.checked ? 'true' : 'false')} />
              <span className="text-sm text-slate-700">Activado</span>
            </label>
          </SettingRow>
          <SettingRow label="Recordatorio 24hs antes" description="Enviado por email al paciente">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-teal-600 w-4 h-4"
                checked={settings['reminder_24h'] === 'true'}
                onChange={(e) => set('reminder_24h', e.target.checked ? 'true' : 'false')} />
              <span className="text-sm text-slate-700">Activado</span>
            </label>
          </SettingRow>
          <SettingRow label="Recordatorio 2hs antes" description="Solo si el turno no fue confirmado">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-teal-600 w-4 h-4"
                checked={settings['reminder_2h'] === 'true'}
                onChange={(e) => set('reminder_2h', e.target.checked ? 'true' : 'false')} />
              <span className="text-sm text-slate-700">Activado</span>
            </label>
          </SettingRow>
          <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-xl">
            <p className="text-sm font-medium text-teal-800 mb-1">Envío de emails (Gmail)</p>
            <p className="text-xs text-teal-700">
              Configurá <code className="font-mono bg-teal-100 px-1 rounded">GMAIL_USER</code> y{' '}
              <code className="font-mono bg-teal-100 px-1 rounded">GMAIL_APP_PASSWORD</code> en{' '}
              <code className="font-mono bg-teal-100 px-1 rounded">apps/api/.env</code>.
              Para links de confirmación de turnos, agregá también{' '}
              <code className="font-mono bg-teal-100 px-1 rounded">APP_URL</code> (ej.{' '}
              <code className="font-mono bg-teal-100 px-1 rounded">http://localhost:5173</code>).
              Sin credenciales, los envíos se simulan y quedan en el historial.
            </p>
          </div>

          <div className="flex justify-end mt-6">
            <button className="btn-primary" onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}>
              <Save size={15} />
              {saved ? '¡Guardado!' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}

      {/* Agenda */}
      {activeTab === 'Agenda' && (
        <div className="card p-6">
          <h2 className="section-title mb-2">Configuración de agenda</h2>
          <p className="text-sm text-slate-400 mb-5">
            Define en qué días y horarios podés agendar turnos. La vista de Agenda usa solo esta ventana.
          </p>

          <SettingRow label="Duración de cada franja" description="Tamaño de los bloques en el calendario y duración sugerida al crear turnos">
            <select className="input" value={settings['default_appointment_duration'] ?? '30'}
              onChange={(e) => set('default_appointment_duration', e.target.value)}>
              {[15, 20, 30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={String(m)}>{m} minutos</option>
              ))}
            </select>
          </SettingRow>
          <SettingRow label="Hora de inicio" description="Primera franja visible en la agenda">
            <input type="time" className="input" value={settings['working_hours_start'] ?? '08:00'}
              onChange={(e) => set('working_hours_start', e.target.value)} />
          </SettingRow>
          <SettingRow label="Hora de cierre" description="Última franja (no inclusive); ej. 20:00 con franjas de 30 min termina a las 19:30">
            <input type="time" className="input" value={settings['working_hours_end'] ?? '19:00'}
              onChange={(e) => set('working_hours_end', e.target.value)} />
          </SettingRow>
          <SettingRow label="Días de atención" description="Solo estos días aparecen en la agenda semanal">
            <div className="flex flex-wrap gap-2 justify-end">
              {[
                { v: 1, l: 'Lun' },
                { v: 2, l: 'Mar' },
                { v: 3, l: 'Mié' },
                { v: 4, l: 'Jue' },
                { v: 5, l: 'Vie' },
                { v: 6, l: 'Sáb' },
                { v: 0, l: 'Dom' },
              ].map(({ v, l }) => {
                const days = (settings['working_days'] ?? '1,2,3,4,5').split(',').map((d) => d.trim());
                const on = days.includes(String(v));
                return (
                  <button
                    key={v}
                    type="button"
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                      on
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400',
                    )}
                    onClick={() => {
                      const next = on ? days.filter((d) => d !== String(v)) : [...days, String(v)];
                      set('working_days', next.sort((a, b) => Number(a) - Number(b)).join(','));
                    }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </SettingRow>

          <div className="flex justify-end mt-6">
            <button className="btn-primary" onClick={() => saveMutation.mutate(settings)} disabled={saveMutation.isPending}>
              <Save size={15} />
              {saved ? '¡Guardado!' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}

      {/* Mi cuenta */}
      {activeTab === 'Mi cuenta' && (
        <div className="space-y-4">
          {/* Profile */}
          <div className="card p-6">
            <h2 className="section-title mb-5">Datos del perfil</h2>
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 text-xl font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-slate-500">{user?.email}</p>
                <p className="text-xs text-teal-600 font-medium mt-0.5">{user?.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre</label>
                <input className="input" value={profileForm.firstName}
                  onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="label">Apellido</label>
                <input className="input" value={profileForm.lastName}
                  onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
              <div>
                <label className="label">Especialidad</label>
                <input className="input" value={profileForm.specialty}
                  onChange={(e) => setProfileForm((f) => ({ ...f, specialty: e.target.value }))} />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={profileForm.phone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <button className="btn-primary"
                onClick={() => updateProfileMutation.mutate(profileForm)}
                disabled={updateProfileMutation.isPending}>
                <Save size={15} />
                {saved ? '¡Guardado!' : 'Actualizar perfil'}
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="card p-6">
            <h2 className="section-title mb-5 flex items-center gap-2">
              <KeyRound size={18} className="text-slate-500" />
              Cambiar contraseña
            </h2>
            <div className="space-y-3 max-w-sm">
              <div>
                <label className="label">Contraseña actual</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="input pr-10"
                    value={passwordForm.current} onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    onClick={() => setShowPass((s) => !s)}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Nueva contraseña</label>
                <input type="password" className="input" value={passwordForm.next}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))} />
              </div>
              <div>
                <label className="label">Confirmar nueva contraseña</label>
                <input type="password" className="input" value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))} />
                {passwordForm.next && passwordForm.confirm && passwordForm.next !== passwordForm.confirm && (
                  <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
              <button className="btn-primary"
                disabled={!passwordForm.current || !passwordForm.next || passwordForm.next !== passwordForm.confirm}>
                <KeyRound size={14} /> Cambiar contraseña
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
