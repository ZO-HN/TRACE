import { describe, expect, it } from 'vitest';
import { renderKindFromKey } from '../../src/lib/storage/mediaKind';

describe('renderKindFromKey', () => {
  it('maps form-video keys to video', () => {
    expect(renderKindFromKey('form-video/user-1/abc.mp4')).toBe('video');
  });

  it('maps photo/image keys to image', () => {
    expect(renderKindFromKey('meal-photo/user-1/abc.jpg')).toBe('image');
    expect(renderKindFromKey('coach-image/user-1/abc.png')).toBe('image');
  });

  it('falls back to other for unknown/file prefixes', () => {
    expect(renderKindFromKey('file/user-1/doc.pdf')).toBe('other');
    expect(renderKindFromKey('weird')).toBe('other');
  });
});
