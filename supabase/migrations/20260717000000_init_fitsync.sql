-- ==========================================
-- FITSYNC: PRODUCTION SUPABASE SCHEMAS
-- DDL MIGRATION, INDEXES, & RLS POLICIES
-- ==========================================

-- 1. Custom Types & Enumerations
CREATE TYPE public.user_role AS ENUM ('coach', 'trainee');
CREATE TYPE public.experience_tier AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE public.relation_status AS ENUM ('ACTIVE', 'PAUSED', 'TERMINATED');
CREATE TYPE public.chat_sender AS ENUM ('USER', 'ASSISTANT');

-- 2. Core User Profiles (Linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role public.user_role NOT NULL DEFAULT 'trainee',
    coach_id UUID REFERENCES public.profiles(id) DEFAULT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dob DATE,
    experience_level public.experience_tier DEFAULT 'BEGINNER',
    primary_goal VARCHAR(150),
    injury_notes TEXT,
    wearable_sync_active BOOLEAN DEFAULT FALSE,
    premium_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Coach Specific Profile Extension Metrics
CREATE TABLE public.coach_extensions (
    coach_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name VARCHAR(150) NOT NULL,
    certifications TEXT[] NOT NULL DEFAULT '{}',
    biography TEXT,
    specialties VARCHAR(100)[] NOT NULL DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    slots_total INT DEFAULT 5 CHECK (slots_total >= 0),
    slots_occupied INT DEFAULT 0 CHECK (slots_occupied <= slots_total),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Global & Custom Exercise Repositories
CREATE TABLE public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    target_muscle_group VARCHAR(100) NOT NULL,
    equipment_type VARCHAR(100),
    is_custom BOOLEAN DEFAULT FALSE,
    created_by_coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reference_video_url VARCHAR(500)
);

-- 5. Program Templates & Blocks
CREATE TABLE public.workout_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    week_number INT DEFAULT 1,
    day_number INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Workout Session Logs
CREATE TABLE public.workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
    session_name VARCHAR(150) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_seconds INT NOT NULL CHECK (duration_seconds >= 0),
    rpe_average NUMERIC(3,1) CHECK (rpe_average BETWEEN 1.0 AND 10.0),
    compliance_score INT CHECK (compliance_score BETWEEN 0 AND 100),
    coach_feedback_notes TEXT
);

-- 7. Logged Sets Mechanics
CREATE TABLE public.set_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id),
    set_number INT NOT NULL CHECK (set_number > 0),
    weight_kg NUMERIC(6,2) NOT NULL CHECK (weight_kg >= 0),
    reps INT NOT NULL CHECK (reps >= 0),
    rpe INT CHECK (rpe BETWEEN 1 AND 10),
    estimated_1rm NUMERIC(6,2) GENERATED ALWAYS AS (weight_kg * (1.0 + reps::numeric / 30.0)) STORED,
    is_completed BOOLEAN DEFAULT FALSE,
    form_video_s3_key VARCHAR(500)
);

-- 8. Wearable Biometrics Timeseries Logs
CREATE TABLE public.wearable_biometrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recorded_date DATE NOT NULL,
    hrv_ms INT CHECK (hrv_ms >= 0),
    resting_heart_rate INT CHECK (resting_heart_rate >= 0),
    sleep_score INT CHECK (sleep_score BETWEEN 0 AND 100),
    active_calories_burned INT CHECK (active_calories_burned >= 0),
    readiness_score INT CHECK (readiness_score BETWEEN 0 AND 100),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, recorded_date)
);

-- 9. Serverless Static/Dynamic Landing Pages Configurations
CREATE TABLE public.landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    slug VARCHAR(100) UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
    layout_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. AI Knowledge Query Channels & Grounded Citations
CREATE TABLE public.ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
    sender public.chat_sender NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.ai_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.ai_messages(id) ON DELETE CASCADE,
    pubmed_id VARCHAR(50),
    doi VARCHAR(100),
    study_title TEXT NOT NULL,
    authors TEXT,
    excerpt TEXT NOT NULL
);

-- ==========================================
-- INDEXING & QUERY OPTIMIZATIONS
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_coach_id ON public.profiles(coach_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_completed ON public.workout_sessions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_set_logs_session_exercise ON public.set_logs(session_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_biometrics_user_date ON public.wearable_biometrics(user_id, recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON public.landing_pages(slug);

-- ==========================================
-- TRIGGER LOGIC: AUTOMATIC USER SYNCING
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role, coach_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', 'Trainee'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'User'),
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'trainee'::public.user_role),
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can always read and write their own data"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "Coaches can read connected clients profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS c
      WHERE c.id = auth.uid() AND c.role = 'coach'
    )
    AND coach_id = auth.uid()
  );

-- Workout Sessions Policies
CREATE POLICY "Users can view their own logged sessions"
  ON public.workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logged sessions"
  ON public.workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view connected clients sessions"
  ON public.workout_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS client_check
      WHERE client_check.id = workout_sessions.user_id 
        AND client_check.coach_id = auth.uid()
    )
  );

-- Landing Pages Policies (Public Read Access, Authenticated Write)
CREATE POLICY "Landing pages are publicly viewable"
  ON public.landing_pages FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY "Coaches can edit their own landing page"
  ON public.landing_pages FOR ALL
  USING (auth.uid() = coach_id);