import { useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Phone, Mail, Building2, AlertTriangle,
  Calendar, Edit, Droplets, Trash2,
} from 'lucide-react';
import { patientsApi, odontogramApi, appointmentsApi, settingsApi } from '@/api';
import { OdontogramView, type ToothSelection } from '@/components/odontogram/OdontogramView';
import { ToothTreatmentPanel } from '@/components/odontogram/ToothTreatmentPanel';

const Tooth3DPanel = lazy(() =>
  import('@/components/odontogram/Tooth3DPanel').then((m) => ({ default: m.Tooth3DPanel })),
);
import { EditPatientModal } from '@/components/patients/EditPatientModal';
import { StudiesPanel } from '@/components/studies/StudiesPanel';
import { PrescriptionsPanel } from '@/components/prescriptions/PrescriptionsPanel';
import { generateOdontogramPdf } from '@/lib/odontogramPdf';
import { calcAge } from '@/lib/utils';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS, AppointmentStatus } from '@dentaflow/shared';
import { cn } from '@/lib/utils';

const TABS = ['Odontograma', 'Estudios', 'Recetario', 'Turnos', 'Historia clínica'] as const;
type Tab = typeof TABS[number];

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>('Odontograma');
  const [toothSelection, setToothSelection] = useState<ToothSelection | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: odontogram, isLoading: loadingOdonto } = useQuery({
    queryKey: ['odontogram', id],
    queryFn: () => odontogramApi.get(id!).then((r) => r.data),
    enabled: !!id && tab === 'Odontograma',
  });

  const { data: clinicSettings = {} } = useQuery({
    queryKey: ['settings-flat'],
    queryFn: () => settingsApi.getAll().then((r) => r.data),
  });

  const { data: appointments } = useQuery({
    queryKey: ['patient-appointments', id],
    queryFn: () => appointmentsApi.byPatient(id!).then((r) => r.data),
    enabled: !!id && tab === 'Turnos',
  });

  const deleteMutation = useMutation({
    mutationFn: () => patientsApi.remove(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['patients-count'] });
      navigate('/patients');
    },
  });

  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) return <p className="text-slate-500">Paciente no encontrado.</p>;

  return (
    <div className="space-y-5 animate-fade-in">
      <button className="btn-ghost btn-sm" onClick={() => navigate('/patients')}>
        <ArrowLeft size={16} /> Volver a pacientes
      </button>

      {/* Patient header card */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 text-xl font-bold shrink-0">
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  {patient.lastName}, {patient.firstName}
                </h1>
                <p className="text-slate-500 text-sm mt-0.5 font-mono">
                  DNI {patient.dni} · {calcAge(patient.dateOfBirth)} años
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="btn-secondary btn-sm" onClick={() => setShowEdit(true)}>
                  <Edit size={14} /> Editar
                </button>
                <button
                  className="btn-sm flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-red-500 border border-red-200 hover:bg-red-50 transition-colors text-xs font-medium"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
              {patient.phone && (
                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Phone size={13} className="text-slate-400" />{patient.phone}
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Mail size={13} className="text-slate-400" />{patient.email}
                </div>
              )}
              {patient.socialWork ? (
                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Building2 size={13} className="text-slate-400" />
                  {patient.socialWork}
                  {patient.affiliateNumber && (
                    <span className="font-mono text-slate-400">#{patient.affiliateNumber}</span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-slate-400">Particular</span>
              )}
              {patient.bloodType && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Droplets size={13} className="text-red-400" />
                  <span className="font-mono font-bold text-red-600">{patient.bloodType}</span>
                </div>
              )}
            </div>

            {(patient.hasAllergies || patient.systemicDiseases || patient.isPregnant || patient.isBruxist) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {patient.hasAllergies && (
                  <span className="badge bg-red-100 text-red-700 flex items-center gap-1">
                    <AlertTriangle size={11} /> Alergias: {patient.allergiesDetail ?? 'ver ficha'}
                  </span>
                )}
                {patient.systemicDiseases && (
                  <span className="badge bg-amber-100 text-amber-700">{patient.systemicDiseases}</span>
                )}
                {patient.isPregnant && (
                  <span className="badge bg-pink-100 text-pink-700">Embarazada</span>
                )}
                {patient.isBruxist && (
                  <span className="badge bg-indigo-100 text-indigo-700">Bruxismo</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── ODONTOGRAM TAB ── */}
      {tab === 'Odontograma' && (
        <div className="space-y-3">
          {/* PDF button */}
          <div className="flex justify-end">
            <button
              className="btn-secondary btn-sm"
              onClick={() =>
                odontogram &&
                generateOdontogramPdf(
                  patient,
                  odontogram,
                  (clinicSettings as any)['clinic_name'] ?? 'DentaFlow',
                )
              }
              disabled={!odontogram}
            >
              📄 Descargar PDF
            </button>
          </div>

          {/* Odontogram + vista 3D e intervenciones */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 space-y-4">
              {loadingOdonto ? (
                <div className="card p-8 flex justify-center">
                  <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : odontogram ? (
                <>
                  <OdontogramView
                    odontogram={odontogram}
                    selection={toothSelection}
                    onSelect={setToothSelection}
                  />
                  {toothSelection && (
                    <ToothTreatmentPanel
                      patientId={id!}
                      odontogram={odontogram}
                      selection={toothSelection}
                      onSurfaceChange={(surface) =>
                        setToothSelection({ ...toothSelection, surface })
                      }
                      onClose={() => setToothSelection(null)}
                    />
                  )}
                </>
              ) : null}
            </div>

            <div className="lg:col-span-5">
              {toothSelection && odontogram ? (
                <div className="card p-4 lg:sticky lg:top-4">
                  <Suspense
                    fallback={
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-400">Cargando visor 3D…</p>
                      </div>
                    }
                  >
                    <Tooth3DPanel
                      toothNumber={toothSelection.toothNumber}
                      patientId={id!}
                      odontogram={odontogram}
                      selectedSurface={toothSelection.surface}
                      onSurfaceChange={(surface) =>
                        setToothSelection({
                          toothNumber: toothSelection.toothNumber,
                          surface,
                        })
                      }
                      onClose={() => setToothSelection(null)}
                    />
                  </Suspense>
                </div>
              ) : (
                <div className="card p-6 text-center h-full min-h-[16rem] flex flex-col items-center justify-center">
                  <div className="text-4xl mb-2">🦷</div>
                  <p className="text-sm text-slate-600 font-medium">Panel de prestaciones</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Seleccioná un diente para ver el modelo 3D y el historial. El formulario de prestación aparece debajo del odontograma.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STUDIES TAB ── */}
      {tab === 'Estudios' && (
        <StudiesPanel patientId={id!} />
      )}

      {/* ── PRESCRIPTIONS / BUDGET TAB ── */}
      {tab === 'Recetario' && (
        <PrescriptionsPanel patientId={id!} patient={patient} />
      )}

      {/* ── APPOINTMENTS TAB ── */}
      {tab === 'Turnos' && (
        <div className="card divide-y divide-slate-100">
          {!appointments || appointments.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              No hay turnos registrados
            </div>
          ) : (
            appointments.map((apt: any) => {
              const color = APPOINTMENT_STATUS_COLORS[apt.status as AppointmentStatus];
              return (
                <div key={apt.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="text-center w-20 shrink-0">
                    <p className="text-sm font-semibold text-slate-700">
                      {new Date(apt.scheduledAt).toLocaleDateString('es-AR')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(apt.scheduledAt).toLocaleTimeString('es-AR', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {apt.treatmentType ?? 'Consulta general'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Dr. {apt.dentist?.lastName} · {apt.durationMinutes} min
                    </p>
                  </div>
                  <span
                    className="badge shrink-0 text-xs"
                    style={{ backgroundColor: color + '22', color }}
                  >
                    {APPOINTMENT_STATUS_LABELS[apt.status as AppointmentStatus]}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── CLINICAL HISTORY TAB ── */}
      {tab === 'Historia clínica' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5 space-y-3">
            <h3 className="section-title">Datos médicos</h3>
            <Row label="Grupo sanguíneo" value={patient.bloodType ?? '—'} />
            <Row label="Alergias" value={patient.hasAllergies ? (patient.allergiesDetail ?? 'Sí') : 'No'} alert={patient.hasAllergies} />
            <Row label="Medicación actual" value={patient.currentMedication ?? '—'} />
            <Row label="Enfermedades sistémicas" value={patient.systemicDiseases ?? '—'} />
            <Row label="Embarazada" value={patient.isPregnant ? 'Sí' : 'No'} />
            <Row label="Bruxismo" value={patient.isBruxist ? 'Sí' : 'No'} />
          </div>
          <div className="card p-5 space-y-3">
            <h3 className="section-title">Cobertura y contacto</h3>
            <Row label="Obra social" value={patient.socialWork ?? 'Particular'} />
            <Row label="Nº afiliado" value={patient.affiliateNumber ?? '—'} mono />
            <Row label="Plan" value={patient.plan ?? '—'} />
            <Row label="WhatsApp" value={patient.acceptsWhatsapp ? 'Sí' : 'No'} />
            <Row label="Email (documentos)" value={patient.acceptsEmail ? 'Sí' : 'No'} />
          </div>
          {patient.medicalNotes && (
            <div className="card p-5 md:col-span-2">
              <h3 className="section-title mb-2">Notas médicas</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{patient.medicalNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <EditPatientModal patient={patient} onClose={() => setShowEdit(false)} />
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 text-center mb-2">¿Eliminar paciente?</h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              Vas a desactivar la ficha de <strong>{patient.firstName} {patient.lastName}</strong>.
              El historial clínico se conserva por razones legales.
            </p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </button>
              <button
                className="flex-1 btn bg-red-500 text-white hover:bg-red-600 focus:ring-red-400"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label, value, alert, mono,
}: {
  label: string; value: string; alert?: boolean; mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={cn('text-right', alert ? 'text-red-600 font-medium' : 'text-slate-800', mono && 'font-mono')}>
        {value}
      </span>
    </div>
  );
}
