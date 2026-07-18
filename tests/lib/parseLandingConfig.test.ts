import { describe, expect, it } from 'vitest';
import { parseLandingConfig } from '../../src/lib/pages/parseLandingConfig';

const valid = {
  theme: { primary: '#3B82F6', surface: '#0A0A0A', font: 'Inter' },
  hero: {
    headline: 'Coach Alpha',
    subheadline: 'Strength coaching for busy people.',
    avatar: 'https://example.com/avatar.jpg',
  },
  links: [
    { label: 'Book a call', url: 'https://example.com/book', highlight: true },
    { label: 'Programs', url: 'https://example.com/programs', highlight: false },
  ],
};

describe('parseLandingConfig', () => {
  it('accepts a schema-conformant document', () => {
    const config = parseLandingConfig(valid);
    expect(config).not.toBeNull();
    expect(config!.links).toHaveLength(2);
  });

  it('rejects non-objects and empty documents', () => {
    expect(parseLandingConfig(null)).toBeNull();
    expect(parseLandingConfig('x')).toBeNull();
    expect(parseLandingConfig({})).toBeNull();
  });

  it('rejects invalid hex colors and unknown fonts', () => {
    expect(
      parseLandingConfig({
        ...valid,
        theme: { ...valid.theme, primary: 'blue' },
      }),
    ).toBeNull();
    expect(
      parseLandingConfig({
        ...valid,
        theme: { ...valid.theme, font: 'Comic Sans' },
      }),
    ).toBeNull();
  });

  it('rejects headline over the 120-char schema cap', () => {
    expect(
      parseLandingConfig({
        ...valid,
        hero: { ...valid.hero, headline: 'x'.repeat(121) },
      }),
    ).toBeNull();
  });

  it('rejects non-http link URLs (javascript: injection)', () => {
    expect(
      parseLandingConfig({
        ...valid,
        links: [{ label: 'x', url: 'javascript:alert(1)', highlight: false }],
      }),
    ).toBeNull();
  });
});
