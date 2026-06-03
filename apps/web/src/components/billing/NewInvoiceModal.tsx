import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Plus, Trash2, Save, Search } from 'lucide-react';
import { billingApi, patientsApi, socialWorksApi } from '@/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

interface Props { onClose: () => void; onSuccess: () => void; }

interface Item {
  description: string; nomenclatorCode: string;
  toothNumber: string; quantity: number; unitPrice: number;
}

export function NewInvoiceModal({ onClose, onSuccess }: Props) {
  const user = useAuthStore((s) => s.user);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [selectedSW, setSelectedSW] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([
    { description: '', nomenclatorCode: '', toothNumber: '', quantity: 1, unitPrice: 0 },
  ]);

  const { data: searchResults } = useQuery({
    queryKey: ['patient-search', patientSearch],
    queryFn: () => patientsApi.search(patientSearch).then((r) => r.data),
    enabled: patientSearch.length >= 2,
  });
  const { data: socialWorks = [] } = useQuery({
    queryKey: ['social-works'],
    queryFn: () => socialWorksApi.list().then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => billingApi.create(data),
    onSuccess,
  });

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discountAmt = subtotal * (discountPercent / 100);
  const total = subtotal - discountAmt;

  function setItem(i: number, field: keyof Item, value: any) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: '', nomenclatorCode: '', toothNumber: '', quantity: 1, unitPrice: 0 }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function fillFromNomenclator(itemIdx: number, nom: any) {
    setItem(itemIdx, 'description', nom.description);
    setItem(itemIdx, 'nomenclatorCode', nom.code);
    setItem(itemIdx, 'unitPrice', Number(nom.unitValue));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) return;
    mutation.mutate({
      patientId: selectedPatient.id,
      socialWorkId: selectedSW?.id,
      socialWorkName: selectedSW?.name,
      affiliateNumber: selectedPatient.affiliateNumber,
      plan: selectedPatient.plan,
      paymentMethod,
      discountPercent,
      notes,
      items: items.filter((i) => i.description).map((i) => ({
        ...i,
        toothNumber: i.toothNumber ? Number(i.toothNumber) : undefined,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
      })),
    });
  }

  const nomItems = selectedSW?.nomenclator?.filter((n: any) => n.isActive) ?? [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="modal-shell w-full max-w-3xl my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="section-heading">Nueva factura</h2>
          <button className="p-1.5 hover:bg-slate-100 border border-transparent" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Patient */}
          <div>
            <label className="label">Paciente *</label>
            {selectedPatient ? (
              <div className="flex items-center justify-between bg-teal-50 border border-teal-200 px-4 py-3">
                <div>
                  <p className="font-medium text-teal-800">{selectedPatient.lastName}, {selectedPatient.firstName}</p>
                  <p className="text-xs text-teal-600">DNI {selectedPatient.dni} · {selectedPatient.socialWork ?? 'Particular'}</p>
                </div>
                <button type="button" className="text-teal-400 hover:text-teal-600" onClick={() => setSelectedPatient(null)}><X size={16} /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input className="input pl-8" placeholder="Buscar por nombre o DNI…"
                  value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
                {searchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 z-10 max-h-44 overflow-y-auto">
                    {searchResults.map((p: any) => (
                      <button key={p.id} type="button" className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientSearch('');
                          // Auto-assign obra social from patient record
                          if (p.socialWork) {
                            const sw = (socialWorks as any[]).find(
                              (s: any) => s.name.toLowerCase() === p.socialWork.toLowerCase()
                            );
                            if (sw) {
                              setSelectedSW(sw);
                              setPaymentMethod('social_work');
                            } else {
                              // OS exists on patient but not in system catalog — still switch method
                              setPaymentMethod('social_work');
                            }
                          }
                        }}>
                        <p className="text-sm font-medium">{p.lastName}, {p.firstName}</p>
                        <p className="text-xs text-slate-500">DNI {p.dni} · {p.socialWork ?? 'Particular'}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment & OS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Método de pago</label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Efectivo</option>
                <option value="card_debit">Débito</option>
                <option value="card_credit">Crédito</option>
                <option value="transfer">Transferencia</option>
                <option value="mercado_pago">Mercado Pago</option>
                <option value="social_work">Obra Social</option>
              </select>
            </div>
            {(paymentMethod === 'social_work' || selectedPatient?.socialWork) && (
              <div>
                <label className="label">Obra Social</label>
                <select className="input" value={selectedSW?.id ?? ''} onChange={(e) => {
                  const sw = (socialWorks as any[]).find((s: any) => s.id === e.target.value);
                  setSelectedSW(sw ?? null);
                }}>
                  <option value="">Seleccionar obra social…</option>
                  {(socialWorks as any[]).map((sw: any) => (
                    <option key={sw.id} value={sw.id}>{sw.name}</option>
                  ))}
                </select>
                {selectedPatient?.socialWork && !selectedSW && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠ El paciente tiene "{selectedPatient.socialWork}" — seleccionala del listado para cargar el nomenclador
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Prestaciones</label>
              <button type="button" className="btn-ghost btn-sm text-teal-600" onClick={addItem}>
                <Plus size={14} /> Agregar
              </button>
            </div>

            {/* Quick fill from nomenclator */}
            {nomItems.length > 0 && (
              <div className="mb-3 p-3 bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500 font-medium mb-2">Carga rápida desde nomenclador {selectedSW?.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {nomItems.slice(0, 8).map((nom: any) => (
                    <button key={nom.id} type="button"
                      className="text-xs px-2.5 py-1 bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50 transition-colors"
                      onClick={() => fillFromNomenclator(items.length - 1, nom)}>
                      {nom.code} — {nom.description}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 bg-slate-50 border border-slate-200">
                  <div className="col-span-5">
                    <label className="label">Descripción</label>
                    <input className="input bg-white" value={item.description}
                      onChange={(e) => setItem(i, 'description', e.target.value)} placeholder="Obturación resina…" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Diente</label>
                    <input className="input bg-white font-mono" value={item.toothNumber}
                      onChange={(e) => setItem(i, 'toothNumber', e.target.value)} placeholder="16" />
                  </div>
                  <div className="col-span-1">
                    <label className="label">Cant.</label>
                    <input type="number" className="input bg-white" min={1} value={item.quantity}
                      onChange={(e) => setItem(i, 'quantity', Number(e.target.value))} />
                  </div>
                  <div className="col-span-3">
                    <label className="label">Precio unit.</label>
                    <input type="number" className="input bg-white" min={0} value={item.unitPrice}
                      onChange={(e) => setItem(i, 'unitPrice', Number(e.target.value))} />
                  </div>
                  <div className="col-span-1 pt-5">
                    <button type="button" className="btn-ghost btn-sm text-red-400 hover:bg-red-50 p-1.5"
                      onClick={() => removeItem(i)} disabled={items.length === 1}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-slate-50 border border-slate-200 p-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>${subtotal.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span>Descuento</span>
                <input type="number" className="input w-16 py-0.5 text-center" min={0} max={100}
                  value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} />
                <span>%</span>
              </div>
              <span className="text-red-500">- ${discountAmt.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between font-medium text-slate-800 text-base pt-2 border-t border-slate-200">
              <span>Total</span>
              <span className="text-teal-700">${total.toLocaleString('es-AR')}</span>
            </div>
          </div>

          <div>
            <label className="label">Notas (opcional)</label>
            <textarea className="input resize-none h-16" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 px-4 py-3">
              {(mutation.error as any)?.response?.data?.message ?? 'Error al crear la factura'}
            </p>
          )}
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn-primary flex-1" onClick={handleSubmit as any}
            disabled={mutation.isPending || !selectedPatient || items.every((i) => !i.description)}>
            <Save size={15} />
            {mutation.isPending ? 'Guardando…' : 'Emitir factura'}
          </button>
        </div>
      </div>
    </div>
  );
}
