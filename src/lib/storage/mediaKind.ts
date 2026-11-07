// Infer how to render an R2 object from its key prefix (<kind>/<user>/<uuid>).
// Keys are minted by the r2-presign function using the MediaKind values.

export type RenderKind = 'video' | 'image' | 'other';

export function renderKindFromKey(key: string): RenderKind {
  const prefix = key.split('/')[0];
  if (prefix === 'form-video') return 'video';
  if (prefix === 'meal-photo' || prefix === 'coach-image' || prefix === 'progress-photo') return 'image';
  return 'other';
}
