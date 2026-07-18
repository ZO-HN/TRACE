import { describe, expect, it, vi } from 'vitest';
import { uploadMedia, type UploadDeps } from '../../src/lib/storage/uploadMedia';
import type { MediaKind } from '../../src/lib/storage/types';

// Lightweight File stand-in — uploadMedia only reads name/type/size, and the
// injected `put` is mocked, so no real Blob bytes are needed.
const mkFile = (over: Partial<{ name: string; type: string; size: number }> = {}) =>
  ({
    name: 'clip.mp4',
    type: 'video/mp4',
    size: 20 * 1024 * 1024,
    ...over,
  }) as unknown as File;

function makeDeps(
  presignImpl: ReturnType<typeof vi.fn>,
  putImpl: ReturnType<typeof vi.fn>,
): UploadDeps {
  return { presign: presignImpl, put: putImpl };
}

describe('uploadMedia', () => {
  it('validates, presigns, PUTs, and returns the object key', async () => {
    const presign = vi.fn().mockResolvedValue({
      uploadUrl: 'https://r2.example/put?sig=abc',
      key: 'form-video/user-1/uuid.mp4',
      expiresIn: 600,
    });
    const put = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await uploadMedia(mkFile(), 'form-video', makeDeps(presign, put));

    expect(result.key).toBe('form-video/user-1/uuid.mp4');
    expect(presign).toHaveBeenCalledWith({
      kind: 'form-video',
      filename: 'clip.mp4',
      contentType: 'video/mp4',
      sizeBytes: 20 * 1024 * 1024,
    });
    expect(put).toHaveBeenCalledWith(
      'https://r2.example/put?sig=abc',
      expect.anything(),
      'video/mp4',
    );
  });

  it('throws and never presigns when validation fails', async () => {
    const presign = vi.fn();
    const put = vi.fn();

    await expect(
      uploadMedia(mkFile({ size: 60 * 1024 * 1024 }), 'form-video', makeDeps(presign, put)),
    ).rejects.toThrow(/50MB/);
    expect(presign).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it('throws when the R2 PUT fails', async () => {
    const presign = vi.fn().mockResolvedValue({
      uploadUrl: 'https://r2.example/put',
      key: 'k',
      expiresIn: 600,
    });
    const put = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(
      uploadMedia(mkFile(), 'form-video' as MediaKind, makeDeps(presign, put)),
    ).rejects.toThrow(/HTTP 500/);
  });
});
