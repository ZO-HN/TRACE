-- New clients capture the intended local diary day. Do not guess/backfill old timezones.
ALTER TABLE public.nutrition_logs ADD COLUMN recorded_date date;
CREATE INDEX nutrition_logs_user_recorded_date ON public.nutrition_logs(user_id,recorded_date,logged_at DESC,id DESC) WHERE recorded_date IS NOT NULL;
