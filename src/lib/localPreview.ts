import type { TraceProfile } from '../hooks/useTraceUser';

export const localPreview = import.meta.env.DEV && import.meta.env.MODE === 'demo';

export const previewProfile: TraceProfile = {
  id: '00000000-0000-4000-8000-000000000001', email: 'preview@example.invalid',
  role: 'coach', is_platform_admin: false, coach_id: null, coach_code: null,
  first_name: 'Preview', last_name: 'Coach', dob: null, bio: null,
  height_cm: null, biological_sex: null, phone: null, username: null, avatar_key: null,
  experience_level: 'BEGINNER', primary_goal: null, injury_notes: null,
  wearable_sync_active: false, premium_status: false,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};
