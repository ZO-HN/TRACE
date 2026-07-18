// Public coach landing page at /:slug — rendered client-side from the
// landing_pages.layout_config JSONB (audit rec 4.1: Vite + client render,
// not Next.js). RLS exposes only rows with is_published = TRUE.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { supabase } from '../../lib/supabase';
import {
  parseLandingConfig,
  type LandingPageConfig,
} from '../../lib/pages/parseLandingConfig';

type PageState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'ready'; config: LandingPageConfig };

export default function CoachPage() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('layout_config')
        .eq('slug', slug ?? '')
        .eq('is_published', true)
        .maybeSingle();

      if (cancelled) return;
      const config = data && !error ? parseLandingConfig(data.layout_config) : null;
      setState(config ? { status: 'ready', config } : { status: 'not-found' });
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (state.status === 'not-found') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
          <p className="text-sm text-gray-400">
            This coach page does not exist or is not published.
          </p>
        </div>
      </div>
    );
  }

  const { theme, hero, links } = state.config;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ backgroundColor: theme.surface, fontFamily: theme.font }}
    >
      <div className="w-full max-w-md text-center">
        <img
          src={hero.avatar}
          alt={hero.headline}
          className="w-24 h-24 rounded-full mx-auto mb-6 object-cover border-2"
          style={{ borderColor: theme.primary }}
        />
        <h1 className="text-3xl font-bold text-white mb-3">{hero.headline}</h1>
        <p className="text-sm text-gray-300 mb-8">{hero.subheadline}</p>

        <div className="space-y-3">
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3.5 px-4 rounded-xl font-medium text-sm transition-opacity hover:opacity-85"
              style={
                link.highlight
                  ? { backgroundColor: theme.primary, color: '#ffffff' }
                  : {
                      backgroundColor: 'transparent',
                      border: `1px solid ${theme.primary}`,
                      color: theme.primary,
                    }
              }
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
