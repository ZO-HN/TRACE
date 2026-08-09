// Submits header "Feedback" entries to public.feedback (see
// supabase/migrations/20260810000000_feedback_and_notifications.sql).
// This persists the submission for you to review in the database — it does
// NOT email anyone yet. Actually emailing needs a Supabase Edge Function
// with an email-provider secret, which is a separate follow-up (no provider
// was picked yet).

import { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface UseFeedback {
  submit: (topic: string, message: string) => Promise<{ error: string | null }>;
  isSubmitting: boolean;
}

export function useFeedback(coachId: string): UseFeedback {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (topic: string, message: string) => {
    setIsSubmitting(true);
    const composed = topic.trim() ? `[${topic.trim()}] ${message.trim()}` : message.trim();
    const { error } = await supabase.from('feedback').insert({ coach_id: coachId, message: composed });
    setIsSubmitting(false);
    return { error: error?.message ?? null };
  };

  return { submit, isSubmitting };
}
