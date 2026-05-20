import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import { patientsApi, socialWorksApi } from '@/api';

interface Props {
  patient: any;
  onClose: () => void;
}

export function EditPatientModal({ patient, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...patient });

  useEffect(() => { setForm({ ...patient }); }, [patient]);

  const { data: socialWorks = [] } = useQuery({
    queryKey: ['social-works'],
    queryFn: () => socialWorksApi.list().then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => patientsApi.update(patient.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient', patient.id] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      onClose();
    },
  });

  const set = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const {
      id, createdAt, updatedAt,
      appointments, odontogramRecords,
      isActive, expectedDueDate, age, fullName,
      ...payload
    } = form as any;
    if (payload.bloodType === '') delete payload.bloodType;
    if (payload.email === '') delete payload.email;
    mutation.mutate(payload);
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-semibold text-slate-800 text-lg">Editar paciente</h2>
          <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" onClick={onClose}>
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Datos personales */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Datos personales</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nombre *</label>
                <input className="input" value={form.firstName ?? ''} onChange={(e) => set('firstName', e.target.value)} required />
              </div>
              <div>
                <label className="label">Apellido *</label>
                <input className="input" value={form.lastName ?? ''} onChange={(e) => set('lastName', e.target.value)} required />
              </div>
              <div>
                <label className="label">DNI</label>
                <input className="input font-mono" value={form.dni ?? ''} onChange={(e) => set('dni', e.target.value)} />
              </div>
              <div>
                <label className="label">Fecha de nacimiento</label>
                <input type="date" className="input" value={form.dateOfBirth ?? ''} onChange={(e) => set('dateOfBirth', e.target.value)} />
              </div>
              <div>
                <label className="label">Teléfono *</label>
                <input className="input" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Dirección</label>
                <input className="input" value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
              </div>
              <div>
                <label className="label">Ciudad</label>
                <input className="input" value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div>
                <label className="label">Ocupación</label>
                <input className="input" value={form.occupation ?? ''} onChange={(e) => set('occupation', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Cobertura */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Cobertura médica</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Obra social</label>
                <select className="input" value={form.socialWork ?? ''} onChange={(e) => set('socialWork', e.target.value)}>
                  <option value="">Particular (sin obra social)</option>
                  {(socialWorks as any[]).map((sw: any) => (
                    <option key={sw.id} value={sw.name}>{sw.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Nº afiliado</label>
                <input className="input font-mono" value={form.affiliateNumber ?? ''} onChange={(e) => set('affiliateNumber', e.target.value)} />
              </div>
              <div>
                <label className="label">Plan</label>
                <input className="input" value={form.plan ?? ''} onChange={(e) => set('plan', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Antecedentes */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Antecedentes médicos</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Grupo sanguíneo</label>
                <select className="input" value={form.bloodType ?? ''} onChange={(e) => set('bloodType', e.target.value)}>
                  <option value="">Desconocido</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col justify-end gap-2 pb-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input type="checkbox" className="accent-teal-600" checked={form.hasAllergies ?? false} onChange={(e) => set('hasAllergies', e.target.checked)} />
                  Tiene alergias
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                  <input type="checkbox" className="accent-teal-600" checked={form.isBruxist ?? false} onChange={(e) => set('isBruxist', e.target.checked)} />
                  Bruxismo
                </label>
              </div>
              {form.hasAllergies && (
                <div className="col-span-2">
                  <label className="label">Detalle de alergias</label>
                  <input className="input" value={form.allergiesDetail ?? ''} onChange={(e) => set('allergiesDetail', e.target.value)} />
                </div>
              )}
              <div className="col-span-2">
                <label className="label">Medicación actual</label>
                <input className="input" value={form.currentMedication ?? ''} onChange={(e) => set('currentMedication', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Enfermedades sistémicas</label>
                <input className="input" value={form.systemicDiseases ?? ''} onChange={(e) => set('systemicDiseases', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Notas médicas</label>
                <textarea className="input resize-none h-20" value={form.medicalNotes ?? ''} onChange={(e) => set('medicalNotes', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Notificaciones */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Notificaciones</h3>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input type="checkbox" className="accent-teal-600" checked={form.acceptsEmail ?? true} onChange={(e) => set('acceptsEmail', e.target.checked)} />
              Acepta recordatorios y documentos por email
            </label>
          </section>

          {mutation.isError && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {(mutation.error as any)?.response?.data?.message ?? 'Error al guardar'}
            </p>
          )}
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn-primary flex-1" onClick={handleSubmit as any} disabled={mutation.isPending}>
            <Save size={15} />
            {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
