import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, ChevronDown, ChevronUp, Edit2, Trash2, Save, X, Zap } from 'lucide-react';
import { socialWorksApi } from '@/api';
import { cn } from '@/lib/utils';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n ?? 0);
}

export function SocialWorksPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', shortName: '', contactEmail: '', contactPhone: '' });
  const [newItemForm, setNewItemForm] = useState<Record<string, any>>({});
  const [editItem, setEditItem] = useState<any>(null);

  const { data: socialWorks = [], isLoading } = useQuery({
    queryKey: ['social-works'],
    queryFn: () => socialWorksApi.list().then((r) => r.data),
  });

  const createSW = useMutation({
    mutationFn: (data: any) => socialWorksApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-works'] }); setShowNew(false); setNewForm({ name: '', shortName: '', contactEmail: '', contactPhone: '' }); },
  });

  const removeSW = useMutation({
    mutationFn: (id: string) => socialWorksApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-works'] }),
  });

  const addItem = useMutation({
    mutationFn: ({ swId, data }: { swId: string; data: any }) => socialWorksApi.addNomenclatorItem(swId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-works'] }); setNewItemForm({}); },
  });

  const updateItem = useMutation({
    mutationFn: ({ swId, itemId, data }: any) => socialWorksApi.updateNomenclatorItem(swId, itemId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-works'] }); setEditItem(null); },
  });

  const removeItem = useMutation({
    mutationFn: ({ swId, itemId }: any) => socialWorksApi.removeNomenclatorItem(swId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-works'] }),
  });

  const seedNomenclator = useMutation({
    mutationFn: (swId: string) => socialWorksApi.seedNomenclator(swId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-works'] }),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Obras Sociales</h1>
          <p className="text-slate-500 text-sm mt-0.5">Nomencladores y aranceles por cobertura</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <Plus size={16} /> Nueva obra social
        </button>
      </div>

      {/* New SW form */}
      {showNew && (
        <div className="card p-5 border-teal-200 bg-teal-50/30 animate-slide-up">
          <h3 className="section-title mb-4">Nueva obra social</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><label className="label">Nombre *</label>
              <input className="input" value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))} placeholder="OSDE" /></div>
            <div><label className="label">Nombre corto</label>
              <input className="input" value={newForm.shortName} onChange={(e) => setNewForm((f) => ({ ...f, shortName: e.target.value }))} /></div>
            <div><label className="label">Email de contacto</label>
              <input type="email" className="input" value={newForm.contactEmail} onChange={(e) => setNewForm((f) => ({ ...f, contactEmail: e.target.value }))} /></div>
            <div><label className="label">Teléfono</label>
              <input className="input" value={newForm.contactPhone} onChange={(e) => setNewForm((f) => ({ ...f, contactPhone: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm" onClick={() => setShowNew(false)}>Cancelar</button>
            <button className="btn-primary btn-sm" disabled={!newForm.name || createSW.isPending}
              onClick={() => createSW.mutate(newForm)}>
              <Save size={14} /> Guardar
            </button>
          </div>
        </div>
      )}

      {/* Social works list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="card p-5 h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : (socialWorks as any[]).length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p>No hay obras sociales registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(socialWorks as any[]).map((sw: any) => {
            const isOpen = expanded === sw.id;
            const activeItems = sw.nomenclator?.filter((n: any) => n.isActive) ?? [];
            return (
              <div key={sw.id} className="card overflow-hidden">
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : sw.id)}
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-teal-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{sw.name}</p>
                    <p className="text-xs text-slate-500">
                      {activeItems.length} prestaciones en nomenclador
                      {sw.contactEmail && ` · ${sw.contactEmail}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-ghost btn-sm text-indigo-600 hover:bg-indigo-50"
                      title="Cargar nomenclador base"
                      onClick={() => seedNomenclator.mutate(sw.id)}
                    >
                      <Zap size={14} /> Nomenclador base
                    </button>
                    <button className="btn-ghost btn-sm text-red-400 hover:bg-red-50"
                      onClick={() => removeSW.mutate(sw.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                    {/* Add item */}
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-sm font-semibold text-slate-700 mb-3">Agregar prestación</p>
                      <div className="grid grid-cols-4 gap-2">
                        <div><label className="label">Código</label>
                          <input className="input font-mono" value={newItemForm[sw.id]?.code ?? ''}
                            onChange={(e) => setNewItemForm((f) => ({ ...f, [sw.id]: { ...f[sw.id], code: e.target.value } }))} placeholder="0401" /></div>
                        <div className="col-span-2"><label className="label">Descripción</label>
                          <input className="input" value={newItemForm[sw.id]?.description ?? ''}
                            onChange={(e) => setNewItemForm((f) => ({ ...f, [sw.id]: { ...f[sw.id], description: e.target.value } }))} /></div>
                        <div><label className="label">Valor ($)</label>
                          <input type="number" className="input" value={newItemForm[sw.id]?.unitValue ?? ''}
                            onChange={(e) => setNewItemForm((f) => ({ ...f, [sw.id]: { ...f[sw.id], unitValue: e.target.value } }))} /></div>
                      </div>
                      <button className="btn-primary btn-sm mt-3"
                        disabled={!newItemForm[sw.id]?.description || addItem.isPending}
                        onClick={() => addItem.mutate({ swId: sw.id, data: { ...newItemForm[sw.id], unitValue: Number(newItemForm[sw.id]?.unitValue ?? 0) } })}>
                        <Plus size={13} /> Agregar
                      </button>
                    </div>

                    {/* Items table */}
                    <div className="overflow-hidden border border-slate-200 rounded-xl">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            {['Código', 'Descripción', 'Valor', ''].map((h) => (
                              <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeItems.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-4 text-slate-400 text-xs">Sin prestaciones — usá "Nomenclador base" para cargar las predefinidas</td></tr>
                          ) : activeItems.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono text-xs text-slate-500">{item.code}</td>
                              <td className="px-3 py-2 text-slate-700">
                                {editItem?.id === item.id ? (
                                  <input className="input py-1 text-xs" value={editItem.description}
                                    onChange={(e) => setEditItem((ei: any) => ({ ...ei, description: e.target.value }))} />
                                ) : item.description}
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                {editItem?.id === item.id ? (
                                  <input type="number" className="input py-1 text-xs w-28" value={editItem.unitValue}
                                    onChange={(e) => setEditItem((ei: any) => ({ ...ei, unitValue: e.target.value }))} />
                                ) : formatCurrency(item.unitValue)}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex gap-1 justify-end">
                                  {editItem?.id === item.id ? (
                                    <>
                                      <button className="btn-ghost btn-sm text-teal-600 p-1"
                                        onClick={() => updateItem.mutate({ swId: sw.id, itemId: item.id, data: { description: editItem.description, unitValue: Number(editItem.unitValue) } })}>
                                        <Save size={13} />
                                      </button>
                                      <button className="btn-ghost btn-sm p-1" onClick={() => setEditItem(null)}><X size={13} /></button>
                                    </>
                                  ) : (
                                    <>
                                      <button className="btn-ghost btn-sm p-1 text-slate-400 hover:text-slate-700"
                                        onClick={() => setEditItem({ ...item })}>
                                        <Edit2 size={13} />
                                      </button>
                                      <button className="btn-ghost btn-sm p-1 text-red-400 hover:bg-red-50"
                                        onClick={() => removeItem.mutate({ swId: sw.id, itemId: item.id })}>
                                        <Trash2 size={13} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
