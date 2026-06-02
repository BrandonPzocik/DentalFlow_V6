import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { whatsappApi } from '@/api';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  QUEUED: 'En cola',
  SENT: 'Enviado',
  DELIVERED: 'Entregado',
  FAILED: 'Fallido',
  RECEIVED: 'Recibido',
};

type FilterDir = '' | 'OUTBOUND' | 'INBOUND';
type FilterStatus = '' | 'FAILED' | 'SENT' | 'RECEIVED';

export function WhatsappMessagesPage() {
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState<FilterDir>('');
  const [status, setStatus] = useState<FilterStatus>('');

  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp-messages', page, direction, status],
    queryFn: () =>
      whatsappApi
        .messages({
          page,
          limit: 25,
          direction: direction || undefined,
          status: status || undefined,
        })
        .then((r) => r.data),
    refetchInterval: 15000,
  });

  const items = data?.items ?? [];
  const pages = data?.pages ?? 1;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/notifications" className="btn-ghost btn-sm">
          <ArrowLeft size={16} /> Volver
        </Link>
        <div>
          <h1 className="page-title">Historial WhatsApp</h1>
          <p className="text-slate-500 text-sm">Mensajes enviados y recibidos vía Twilio</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { v: '' as FilterDir, l: 'Todos' },
          { v: 'OUTBOUND' as FilterDir, l: 'Enviados' },
          { v: 'INBOUND' as FilterDir, l: 'Recibidos' },
        ].map((f) => (
          <button
            key={f.v}
            type="button"
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium border',
              direction === f.v
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200',
            )}
            onClick={() => { setDirection(f.v); setPage(1); }}
          >
            {f.l}
          </button>
        ))}
        <span className="w-px h-6 bg-slate-200 self-center mx-1" />
        {[
          { v: '' as FilterStatus, l: 'Cualquier estado' },
          { v: 'FAILED' as FilterStatus, l: 'Fallidos' },
        ].map((f) => (
          <button
            key={f.v}
            type="button"
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium border',
              status === f.v
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-slate-600 border-slate-200',
            )}
            onClick={() => { setStatus(f.v); setPage(1); }}
          >
            {f.l}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <MessageCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Sin mensajes registrados</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((m: any) => (
              <div key={m.id} className="px-5 py-4 flex gap-4 hover:bg-slate-50">
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    m.direction === 'INBOUND' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {m.direction === 'INBOUND' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">
                      {m.patient?.lastName}, {m.patient?.firstName}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                      {STATUS_LABELS[m.status] ?? m.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{m.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(m.createdAt).toLocaleString('es-AR')}
                    {m.twilioSid && ` · ${m.twilioSid.slice(0, 12)}…`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span className="text-sm text-slate-500 self-center">Página {page} de {pages}</span>
          <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
