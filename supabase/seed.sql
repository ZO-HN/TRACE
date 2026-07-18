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

-- 3. Public template with items (requires 20260719000001_template_items.sql)
--    Gives solo trainees real workout content instead of the mock fallback.
DO $$
DECLARE
    v_coach_id UUID := '00000000-0000-0000-0000-000000000001';
    v_template_id UUID;
    v_squat_id UUID;
    v_rdl_id UUID;
BEGIN
    SELECT id INTO v_squat_id FROM public.exercises WHERE name = 'Barbell Back Squat' LIMIT 1;
    SELECT id INTO v_rdl_id FROM public.exercises WHERE name = 'Romanian Deadlift' LIMIT 1;
    IF v_squat_id IS NULL OR v_rdl_id IS NULL THEN
        RAISE NOTICE 'Seed exercises missing; skipping template seed';
        RETURN;
    END IF;

    SELECT id INTO v_template_id FROM public.workout_templates
    WHERE creator_id = v_coach_id AND name = 'Foundation Lower Body' LIMIT 1;

    IF v_template_id IS NULL THEN
        INSERT INTO public.workout_templates (creator_id, name, description, week_number, day_number, is_active, scope)
        VALUES (v_coach_id, 'Foundation Lower Body', 'Baseline lower-body strength day.', 1, 1, TRUE, 'PUBLIC')
        RETURNING id INTO v_template_id;
    END IF;

    INSERT INTO public.template_items (template_id, exercise_id, position, target_sets, target_reps, target_rpe, rest_seconds)
    VALUES
        (v_template_id, v_squat_id, 1, 3, 8, 7, 120),
        (v_template_id, v_rdl_id,   2, 3, 10, 7, 90)
    ON CONFLICT (template_id, position) DO NOTHING;
END $$;
