// Upload policy: allowed content types and size caps per media kind.
// Enforced client-side for fast UX feedback AND server-side in the edge
// function (never trust the client). Keep both copies in sync.

import type { MediaKind } from './types';

const MB = 1024 * 1024;

interface KindPolicy {
  contentTypes: string[];
  maxBytes: number;
}

export const MEDIA_POLICY: Record<MediaKind, KindPolicy> = {
  'form-video': {
    contentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maxBytes: 50 * MB, // matches the 720p / <50MB spec target
  },
  'meal-photo': {
    contentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    maxBytes: 10 * MB,
  },
  'coach-image': {
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 10 * MB,
  },
  file: {
    contentTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 25 * MB,
  },
};

export interface UploadCandidate {
  kind: MediaKind;
  contentType: string;
  sizeBytes: number;
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export function validateUpload(candidate: UploadCandidate): ValidationResult {
  const policy = MEDIA_POLICY[candidate.kind];
  if (!policy) return { ok: false, reason: `Unknown media kind: ${candidate.kind}` };

  if (!policy.contentTypes.includes(candidate.contentType)) {
    return {
      ok: false,
      reason: `${candidate.contentType || 'unknown type'} is not allowed for ${candidate.kind}`,
    };
  }

  if (!Number.isFinite(candidate.sizeBytes) || candidate.sizeBytes <= 0) {
    return { ok: false, reason: 'File is empty' };
  }

  if (candidate.sizeBytes > policy.maxBytes) {
    const maxMb = Math.round(policy.maxBytes / MB);
    return { ok: false, reason: `File exceeds the ${maxMb}MB limit for ${candidate.kind}` };
  }

  return { ok: true };
}
