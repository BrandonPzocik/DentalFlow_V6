/**
 * Modelos 3D educativos — University of Dundee, School of Dentistry (@DundeeDental)
 * Colección: https://sketchfab.com/DundeeDental/collections/dundee-tooth-morphology-574c456663334fe89c78503a975dc946
 * Licencia: CC Attribution (mostrar atribución en la UI)
 */

export const DUNDEE_COLLECTION_URL =
  'https://sketchfab.com/DundeeDental/collections/dundee-tooth-morphology-574c456663334fe89c78503a975dc946';

export const DUNDEE_COLLECTION_EMBED_SRC =
  'https://sketchfab.com/playlists/embed?collection=574c456663334fe89c78503a975dc946&autostart=0&ui_hint=2';

/** UID Sketchfab → diente FDI (arcada izquierda y simétricos donde no hay modelo derecho) */
const DUNDEE_MODEL_BY_FDI: Partial<Record<number, string>> = {
  11: 'c8a7c2d9280d4c92bc651cfa1459866a',
  21: 'c8a7c2d9280d4c92bc651cfa1459866a',
  31: '90dcbf474e5a4d97b8783b7eb2b9c4b7',
  41: '90dcbf474e5a4d97b8783b7eb2b9c4b7',
  32: '00fa4f74e10b4769830bf60469c65e27',
  42: '00fa4f74e10b4769830bf60469c65e27',
  16: '9117c7a9bf0848f29bc4e85931697e7b',
  26: '9117c7a9bf0848f29bc4e85931697e7b',
  36: '9117c7a9bf0848f29bc4e85931697e7b',
  46: '9117c7a9bf0848f29bc4e85931697e7b',
};

const DUNDEE_LABELS: Partial<Record<number, string>> = {
  11: 'Incisivo central superior (referencia)',
  21: 'Incisivo central superior izquierdo',
  31: 'Incisivo central inferior izquierdo',
  41: 'Incisivo central inferior (referencia)',
  32: 'Incisivo lateral inferior izquierdo',
  42: 'Incisivo lateral inferior (referencia)',
  16: 'Primer molar superior',
  26: 'Primer molar superior izquierdo',
  36: 'Primer molar inferior izquierdo',
  46: 'Primer molar inferior (referencia)',
};

export function getDundeeModelUid(fdi: number): string | undefined {
  return DUNDEE_MODEL_BY_FDI[fdi];
}

export function getDundeeToothLabel(fdi: number): string {
  return DUNDEE_LABELS[fdi] ?? `Diente ${fdi} — explorá la colección`;
}

export function getDundeeEmbedSrc(fdi?: number): string {
  const uid = fdi ? getDundeeModelUid(fdi) : undefined;
  if (uid) {
    return `https://sketchfab.com/models/${uid}/embed?autostart=0&ui_hint=2&ui_controls=1&ui_infos=0`;
  }
  return `${DUNDEE_COLLECTION_EMBED_SRC}&ui_controls=1`;
}

export function hasDundeeSingleModel(fdi: number): boolean {
  return !!getDundeeModelUid(fdi);
}
