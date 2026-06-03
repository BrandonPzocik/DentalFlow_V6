import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, Trash2, ZoomIn, ZoomOut, RotateCw,
  Maximize2, X, FileImage, Sun, Contrast,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { studiesApi } from '@/api';
import { cn } from '@/lib/utils';

const STUDY_TYPES = [
  { value: 'periapical',       label: 'Rx periapical' },
  { value: 'panoramic',        label: 'Panorámica' },
  { value: 'bitewing',         label: 'Rx aleta mordida' },
  { value: 'cbct',             label: 'CBCT / Tomografía' },
  { value: 'photo_intraoral',  label: 'Foto intraoral' },
  { value: 'photo_extraoral',  label: 'Foto extraoral' },
  { value: 'other',            label: 'Otro estudio' },
];

// ── Image Viewer with radiograph tools ───────────────────────────────────────
function ImageViewer({
  src,
  originalName,
  onClose,
}: {
  src: string;
  originalName: string;
  onClose: () => void;
}) {
  const [zoom, setZoom]         = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast]     = useState(100);
  const [invert, setInvert]         = useState(false);
  const [pan, setPan]               = useState({ x: 0, y: 0 });
  const [dragging, setDragging]     = useState(false);
  const dragStart                   = useRef({ x: 0, y: 0, px: 0, py: 0 });

  function handleMouseDown(e: React.MouseEvent) {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    setPan({
      x: dragStart.current.px + e.clientX - dragStart.current.x,
      y: dragStart.current.py + e.clientY - dragStart.current.y,
    });
  }
  function handleMouseUp() { setDragging(false); }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(5, z - e.deltaY * 0.001)));
  }

  function reset() {
    setZoom(1); setRotation(0); setBrightness(100);
    setContrast(100); setInvert(false); setPan({ x: 0, y: 0 });
  }

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const imgStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
    filter: `brightness(${brightness}%) contrast(${contrast}%)${invert ? ' invert(1)' : ''}`,
    cursor: dragging ? 'grabbing' : 'grab',
    userSelect: 'none' as const,
    transition: dragging ? 'none' : 'transform 0.1s',
  };

  return createPortal(
    <div className="fixed inset-0 bg-black z-[200] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-700 flex-shrink-0">
        <span className="text-white text-sm font-medium truncate flex-1">{originalName}</span>

        <div className="flex items-center gap-1 bg-slate-800 p-1">
          <ToolBtn icon={ZoomOut}  title="Alejar"   onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} />
          <span className="text-xs text-slate-300 px-1 font-mono w-10 text-center">{Math.round(zoom*100)}%</span>
          <ToolBtn icon={ZoomIn}   title="Acercar"  onClick={() => setZoom(z => Math.min(5, z + 0.2))} />
        </div>

        <div className="flex items-center gap-1 bg-slate-800 p-1">
          <ToolBtn icon={RotateCw} title="Rotar 90°" onClick={() => setRotation(r => r + 90)} />
        </div>

        {/* Brightness */}
        <div className="flex items-center gap-2 bg-slate-800 px-2 py-1">
          <Sun size={13} className="text-yellow-400 flex-shrink-0" />
          <input type="range" min={20} max={300} value={brightness}
            onChange={e => setBrightness(+e.target.value)}
            className="w-20 h-1 accent-yellow-400" title="Brillo" />
        </div>

        {/* Contrast */}
        <div className="flex items-center gap-2 bg-slate-800 px-2 py-1">
          <Contrast size={13} className="text-blue-400 flex-shrink-0" />
          <input type="range" min={20} max={400} value={contrast}
            onChange={e => setContrast(+e.target.value)}
            className="w-20 h-1 accent-blue-400" title="Contraste" />
        </div>

        {/* Invert (clave para radiografías) */}
        <button
          title="Invertir colores (negativo)"
          onClick={() => setInvert(v => !v)}
          className={cn(
            'px-2 py-1 text-xs font-medium transition-colors',
            invert
              ? 'bg-teal-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
          )}
        >
          NEG
        </button>

        <button
          title="Restablecer"
          onClick={reset}
          className="px-2 py-1 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs transition-colors"
        >
          Reset
        </button>

        <button onClick={onClose} className="ml-2 p-1.5 hover:bg-slate-700 transition-colors">
          <X size={18} className="text-slate-300" />
        </button>
      </div>

      {/* Image canvas */}
      <div
        className="flex-1 overflow-hidden flex items-center justify-center select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <img
          src={src}
          alt={originalName}
          style={imgStyle}
          draggable={false}
          className="max-w-none"
        />
      </div>

      <div className="px-4 py-2 bg-slate-900 text-center">
        <span className="text-xs text-slate-500">Scroll para hacer zoom · Arrastrar para mover · NEG invierte colores para Rx</span>
      </div>
    </div>,
    document.body,
  );
}

function ToolBtn({ icon: Icon, title, onClick }: { icon: any; title: string; onClick: () => void }) {
  return (
    <button title={title} onClick={onClick}
      className="p-1.5 text-slate-300 hover:bg-slate-700 transition-colors">
      <Icon size={14} />
    </button>
  );
}

// ── Study thumbnail card ──────────────────────────────────────────────────────
function StudyCard({
  study,
  onOpen,
  onDelete,
}: {
  study: any;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const typeLabel = STUDY_TYPES.find(t => t.value === study.type)?.label ?? study.type;
  const date = new Date(study.createdAt).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <div className="group relative panel overflow-hidden hover:border-teal-300 transition-all">
      {/* Thumbnail */}
      <div
        className="h-32 bg-slate-900 flex items-center justify-center cursor-pointer overflow-hidden"
        onClick={onOpen}
      >
        {study.mimeType?.startsWith('image/') || study.mimeType === 'image/jpeg' ? (
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
              <FileImage size={32} className="text-slate-600" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
              Clic para ver
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <FileImage size={28} />
            <span className="text-xs">Ver estudio</span>
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-teal-900/0 group-hover:bg-teal-900/20 transition-all flex items-center justify-center">
          <Maximize2 size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Meta */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-teal-700 mb-0.5">{typeLabel}</p>
            <p className="text-xs text-slate-600 truncate" title={study.originalName}>
              {study.originalName}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{date}</p>
            {study.toothNumber && (
              <p className="text-xs text-slate-400">Diente {study.toothNumber}</p>
            )}
          </div>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-50 transition-all flex-shrink-0"
          >
            <Trash2 size={13} />
          </button>
        </div>
        {study.notes && (
          <p className="text-xs text-slate-400 italic mt-1 truncate">{study.notes}</p>
        )}
      </div>
    </div>
  );
}

// ── Main StudiesPanel ─────────────────────────────────────────────────────────
export function StudiesPanel({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading]       = useState(false);
  const [uploadForm, setUploadForm]     = useState({ type: 'periapical', toothNumber: '', notes: '' });
  const [showUpload, setShowUpload]     = useState(false);
  const [viewerStudyId, setViewerStudyId] = useState<string | null>(null);
  const [viewerData, setViewerData]     = useState<{ src: string; name: string } | null>(null);

  const { data: studies = [], isLoading } = useQuery({
    queryKey: ['studies', patientId],
    queryFn: () => studiesApi.list(patientId).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studiesApi.remove(patientId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studies', patientId] }),
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileData = await fileToBase64(file);
      await studiesApi.upload(patientId, {
        type: uploadForm.type,
        originalName: file.name,
        mimeType: file.type || 'image/jpeg',
        fileSize: file.size,
        fileData,
        toothNumber: uploadForm.toothNumber ? Number(uploadForm.toothNumber) : undefined,
        notes: uploadForm.notes || undefined,
      });
      qc.invalidateQueries({ queryKey: ['studies', patientId] });
      setShowUpload(false);
      setUploadForm({ type: 'periapical', toothNumber: '', notes: '' });
    } catch (err) {
      console.error('Error subiendo estudio:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleOpen(studyId: string) {
    try {
      const res = await studiesApi.get(patientId, studyId);
      const study = res.data;
      const src = study.fileData.startsWith('data:')
        ? study.fileData
        : `data:${study.mimeType};base64,${study.fileData}`;
      setViewerData({ src, name: study.originalName });
      setViewerStudyId(studyId);
    } catch (err) {
      console.error('Error abriendo estudio:', err);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="section-heading">Estudios e imágenes</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Radiografías, panorámicas y fotos del paciente
          </p>
        </div>
        <button
          className="btn-primary btn-sm"
          onClick={() => setShowUpload(v => !v)}
        >
          <Upload size={14} />
          Subir estudio
        </button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="panel p-4 border-teal-200 bg-teal-50/40 space-y-3 animate-slide-up">
          <p className="text-sm font-medium text-teal-800">Nuevo estudio</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo de estudio</label>
              <select
                className="input"
                value={uploadForm.type}
                onChange={e => setUploadForm(f => ({ ...f, type: e.target.value }))}
              >
                {STUDY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Diente (opcional)</label>
              <input
                className="input font-mono"
                placeholder="Ej: 16"
                value={uploadForm.toothNumber}
                onChange={e => setUploadForm(f => ({ ...f, toothNumber: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label className="label">Notas</label>
              <input
                className="input"
                placeholder="Descripción del estudio…"
                value={uploadForm.notes}
                onChange={e => setUploadForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm flex-1" onClick={() => setShowUpload(false)}>
              Cancelar
            </button>
            <button
              className="btn-primary btn-sm flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload size={13} />
              {uploading ? 'Subiendo…' : 'Seleccionar archivo'}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.dcm,application/dicom"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Studies grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel overflow-hidden">
              <div className="h-32 bg-slate-100 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-slate-100 rounded animate-pulse w-2/3" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (studies as any[]).length === 0 ? (
        <div className="panel p-10 text-center">
          <FileImage className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500 mb-1">Sin estudios cargados</p>
          <p className="text-xs text-slate-400">
            Subí radiografías periapicales, panorámicas o fotos del paciente
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(studies as any[]).map((study: any) => (
            <StudyCard
              key={study.id}
              study={study}
              onOpen={() => handleOpen(study.id)}
              onDelete={() => {
                if (confirm('¿Eliminar este estudio?')) {
                  deleteMutation.mutate(study.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Image viewer modal */}
      {viewerData && (
        <ImageViewer
          src={viewerData.src}
          originalName={viewerData.name}
          onClose={() => { setViewerData(null); setViewerStudyId(null); }}
        />
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
