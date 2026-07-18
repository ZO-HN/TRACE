// Validates a landing_pages.layout_config JSONB document against the
// LandingPageConfig schema (docs/trace_architecture.md §2.A). Returns a typed
// config or null — never render an unvalidated document.

export interface LandingTheme {
  primary: string;
  surface: string;
  font: 'Inter' | 'Montserrat' | 'Geist';
}

export interface LandingHero {
  headline: string;
  subheadline: string;
  avatar: string;
}

export interface LandingLink {
  label: string;
  url: string;
  highlight: boolean;
}

export interface LandingPageConfig {
  theme: LandingTheme;
  hero: LandingHero;
  links: LandingLink[];
}

const HEX = /^#[0-9A-Fa-f]{6}$/;
const FONTS = ['Inter', 'Montserrat', 'Geist'] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown, maxLength: number): string | null {
  return typeof v === 'string' && v.length > 0 && v.length <= maxLength ? v : null;
}

export function parseLandingConfig(raw: unknown): LandingPageConfig | null {
  if (!isRecord(raw)) return null;
  const { theme, hero, links } = raw;
  if (!isRecord(theme) || !isRecord(hero) || !Array.isArray(links)) return null;

  if (
    typeof theme.primary !== 'string' || !HEX.test(theme.primary) ||
    typeof theme.surface !== 'string' || !HEX.test(theme.surface) ||
    !FONTS.includes(theme.font as (typeof FONTS)[number])
  ) {
    return null;
  }

  const headline = str(hero.headline, 120);
  const subheadline = str(hero.subheadline, 300);
  const avatar = str(hero.avatar, 2048);
  if (!headline || !subheadline || !avatar) return null;

  const parsedLinks: LandingLink[] = [];
  for (const link of links) {
    if (!isRecord(link)) return null;
    const label = str(link.label, 50);
    const url = str(link.url, 2048);
    if (!label || !url || typeof link.highlight !== 'boolean') return null;
    if (!/^https?:\/\//.test(url)) return null; // block javascript: and friends
    parsedLinks.push({ label, url, highlight: link.highlight });
  }

  return {
    theme: {
      primary: theme.primary,
      surface: theme.surface,
      font: theme.font as LandingTheme['font'],
    },
    hero: { headline, subheadline, avatar },
    links: parsedLinks,
  };
}
