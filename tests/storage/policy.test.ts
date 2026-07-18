import { describe, expect, it } from 'vitest';
import { validateUpload } from '../../src/lib/storage/policy';

describe('validateUpload', () => {
  it('accepts an in-policy form video', () => {
    expect(
      validateUpload({ kind: 'form-video', contentType: 'video/mp4', sizeBytes: 20 * 1024 * 1024 }),
    ).toEqual({ ok: true });
  });

  it('rejects a video over the 50MB cap', () => {
    const result = validateUpload({
      kind: 'form-video',
      contentType: 'video/mp4',
      sizeBytes: 60 * 1024 * 1024,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/50MB/);
  });

  it('rejects a disallowed content type for the kind', () => {
    const result = validateUpload({
      kind: 'meal-photo',
      contentType: 'video/mp4',
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an empty file', () => {
    const result = validateUpload({
      kind: 'coach-image',
      contentType: 'image/png',
      sizeBytes: 0,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an unknown media kind', () => {
    const result = validateUpload({
      // @ts-expect-error — exercising the runtime guard
      kind: 'hologram',
      contentType: 'image/png',
      sizeBytes: 1024,
    });
    expect(result.ok).toBe(false);
  });
});
