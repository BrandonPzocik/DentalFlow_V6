import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { patientsApi, socialWorksApi } from '@/api';

export function NewPatientPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    firstName: '', lastName: '', dni: '', dateOfBirth: '',
    phone: '', email: '', address: '', city: '', occupation: '',
    socialWork: '', affiliateNumber: '', plan: '',
    bloodType: '', hasAllergies: false, allergiesDetail: '',
    currentMedication: '', systemicDiseases: '',
    isPregnant: false, isBruxist: false,
    acceptsWhatsapp: true,
    acceptsEmail: true,
    medicalNotes: '',
  });

  const { data: socialWorks = [] } = useQuery({
    queryKey: ['social-works'],
    queryFn: () => socialWorksApi.list().then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => patientsApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      navigate(`/patients/${res.data.id}`);
    },
  });

  const set = (field: string, value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.bloodType) delete (payload as any).bloodType;
    if (!payload.email) delete (payload as any).email;
    mutation.mutate(payload);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button className="btn-ghost btn-sm" onClick={() => navigate('/patients')}>
          <ArrowLeft size={16} />
          Volver
        </button>
        <div>
          <h1 className="page-heading">Nuevo paciente</h1>
          <p className="text-slate-500 text-sm">Completá la ficha clínica</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="panel p-5 space-y-4">
          <h2 className="section-heading">Datos personales</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre *</label>
              <input className="input" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
            </div>
            <div>
              <label className="label">Apellido *</label>
              <input className="input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
            </div>
            <div>
              <label className="label">DNI *</label>
              <input className="input font-mono" value={form.dni} onChange={(e) => set('dni', e.target.value)} required placeholder="32456789" />
            </div>
            <div>
              <label className="label">Fecha de nacimiento *</label>
              <input type="date" className="input" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} required />
            </div>
            <div>
              <label className="label">Teléfono *</label>
              <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} required placeholder="+54 9 11 1234-5678" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">Dirección</label>
              <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div>
              <label className="label">Ciudad</label>
              <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div>
              <label className="label">Ocupación</label>
              <input className="input" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="panel p-5 space-y-4">
          <h2 className="section-heading">Cobertura médica</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Obra social</label>
              <select className="input" value={form.socialWork} onChange={(e) => set('socialWork', e.target.value)}>
                <option value="">Particular (sin obra social)</option>
                {(socialWorks as any[]).map((sw: any) => (
                  <option key={sw.id} value={sw.name}>{sw.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nº de afiliado</label>
              <input className="input font-mono" value={form.affiliateNumber} onChange={(e) => set('affiliateNumber', e.target.value)} />
            </div>
            <div>
              <label className="label">Plan</label>
              <input className="input" value={form.plan} onChange={(e) => set('plan', e.target.value)} placeholder="210, Gold, etc." />
            </div>
          </div>
        </div>

        <div className="panel p-5 space-y-4">
          <h2 className="section-heading">Antecedentes médicos</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Grupo sanguíneo</label>
              <select className="input" value={form.bloodType} onChange={(e) => set('bloodType', e.target.value)}>
                <option value="">Desconocido</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="text-teal-600" checked={form.hasAllergies} onChange={(e) => set('hasAllergies', e.target.checked)} />
                <span className="text-sm text-slate-700">Tiene alergias</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="text-teal-600" checked={form.isBruxist} onChange={(e) => set('isBruxist', e.target.checked)} />
                <span className="text-sm text-slate-700">Bruxismo</span>
              </label>
            </div>
            {form.hasAllergies && (
              <div className="col-span-2">
                <label className="label">Detalle de alergias</label>
                <input className="input" value={form.allergiesDetail} onChange={(e) => set('allergiesDetail', e.target.value)} placeholder="Penicilina, Ibuprofeno…" />
              </div>
            )}
            <div className="col-span-2">
              <label className="label">Medicación actual</label>
              <input className="input" value={form.currentMedication} onChange={(e) => set('currentMedication', e.target.value)} placeholder="Enalapril 10mg, Metformina 500mg…" />
            </div>
            <div className="col-span-2">
              <label className="label">Enfermedades sistémicas</label>
              <input className="input" value={form.systemicDiseases} onChange={(e) => set('systemicDiseases', e.target.value)} placeholder="Diabetes tipo 2, Hipertensión…" />
            </div>
            <div className="col-span-2">
              <label className="label">Notas médicas adicionales</label>
              <textarea className="input min-h-[80px] resize-none" value={form.medicalNotes} onChange={(e) => set('medicalNotes', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="panel p-5 space-y-3">
          <h2 className="section-heading">Notificaciones</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="text-teal-600" checked={form.acceptsWhatsapp} onChange={(e) => set('acceptsWhatsapp', e.target.checked)} />
            <span className="text-sm text-slate-700">Acepta turnos y recordatorios por WhatsApp</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="text-teal-600" checked={form.acceptsEmail} onChange={(e) => set('acceptsEmail', e.target.checked)} />
            <span className="text-sm text-slate-700">Acepta documentos clínicos por email</span>
          </label>
        </div>

        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {(mutation.error as any)?.response?.data?.message ?? 'Error al guardar el paciente'}
          </div>
        )}

        <div className="flex justify-end gap-3 pb-6">
          <button type="button" className="btn-secondary" onClick={() => navigate('/patients')}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            <Save size={16} />
            {mutation.isPending ? 'Guardando…' : 'Guardar paciente'}
          </button>
        </div>
      </form>
    </div>
  );
}
