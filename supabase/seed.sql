-- ==========================================
-- TRACE: SEED DATA FOR END-TO-END EXERCISE
-- ==========================================

-- 1. Insert Global Exercises
INSERT INTO public.exercises (id, name, target_muscle_group, equipment_type, is_custom)
VALUES 
    (gen_random_uuid(), 'Barbell Back Squat', 'Quads', 'Barbell', FALSE),
    (gen_random_uuid(), 'Romanian Deadlift', 'Hamstrings', 'Barbell', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Coach Profile & Published Landing Page
DO $$
DECLARE
    coach_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Ensure seed coach user exists in auth.users
    INSERT INTO auth.users (id, email, raw_user_meta_data, role, aud, email_confirmed_at)
    VALUES (
        coach_id,
        'coach.john@example.com',
        '{"first_name": "John", "last_name": "Doe", "role": "coach"}'::jsonb,
        'authenticated',
        'authenticated',
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Ensure profile is marked as coach (in case it already existed but got synced differently)
    UPDATE public.profiles 
    SET role = 'coach'::public.user_role 
    WHERE id = coach_id;

    -- Ensure coach extensions entry exists
    INSERT INTO public.coach_extensions (coach_id, business_name, certifications, biography, specialties, is_public)
    VALUES (
        coach_id,
        'Doe Athletics',
        ARRAY['NASM-PES', 'CSCS'],
        'Over a decade of coaching elite athletes and weekend warriors.',
        ARRAY['Hypertrophy', 'Strength & Conditioning'],
        TRUE
    )
    ON CONFLICT (coach_id) DO NOTHING;

    -- Insert Published Landing Page for "/john"
    INSERT INTO public.landing_pages (coach_id, slug, layout_config, is_published)
    VALUES (
        coach_id,
        'john',
        '{
            "theme": {
                "primary": "#b4c5ff",
                "surface": "#131313",
                "font": "Inter"
            },
            "hero": {
                "headline": "John Doe Fitness",
                "subheadline": "Unlock your peak physical potential with custom elite level programming.",
                "avatar": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=200&h=200"
            },
            "links": [
                {
                    "label": "Book a Consultation",
                    "url": "https://calendly.com",
                    "highlight": true
                },
                {
                    "label": "Follow on Instagram",
                    "url": "https://instagram.com",
                    "highlight": false
                }
            ]
        }'::jsonb,
        TRUE
    )
    ON CONFLICT (coach_id) DO UPDATE 
    SET slug = EXCLUDED.slug,
        layout_config = EXCLUDED.layout_config,
        is_published = EXCLUDED.is_published;
END $$;
