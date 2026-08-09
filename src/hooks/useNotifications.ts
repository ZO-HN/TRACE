// Coach's notification bell — backed by public.notifications
// (see supabase/migrations/20260810000000_feedback_and_notifications.sql).
// Nothing writes to this table automatically yet (no triggers wired up);
// rows only appear once something inserts them, but the read/mark-read
// path here is real.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { debounce } from '../lib/debounce';

export interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

export interface UseNotifications {
  notifications: NotificationRow[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const REFRESH_DEBOUNCE_MS = 400;

export function useNotifications(coachId: string): UseNotifications {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchNotifications = async () => {
      const { data, error: queryError } = await supabase
        .from('notifications')
        .select('id, title, body, read, created_at')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
      } else {
        setError(null);
        setNotifications((data as NotificationRow[]) ?? []);
      }
      setIsLoading(false);
    };

    fetchNotifications();
    const refresh = debounce(fetchNotifications, REFRESH_DEBOUNCE_MS);

    const channel = supabase
      .channel(`coach-notifications-${coachId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => refresh.call())
      .subscribe();

    return () => {
      cancelled = true;
      refresh.cancel();
      supabase.removeChannel(channel);
    };
  }, [coachId]);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from('notifications').update({ read: true }).eq('coach_id', coachId).eq('read', false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, isLoading, error, markRead, markAllRead };
}
