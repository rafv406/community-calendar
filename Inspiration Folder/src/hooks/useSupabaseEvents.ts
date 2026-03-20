import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface EventRecord {
  id: string;
  title: string;
  start_datetime: string;
  end_datetime: string | null;
  all_day: boolean;
  location: string | null;
  description: string | null;
  image_url: string | null;
  url: string | null;
  source_id: string;
  source_name: string;
  categories: string[];
  raw_uid: string | null;
  fingerprint: string;
  expired: boolean;
  created_at: string;
  updated_at: string;
}

export interface SourceRecord {
  id: string;
  name: string;
  feed_url: string;
  source_type: 'ical' | 'rss';
  color: string;
  logo_url: string | null;
  poll_interval: number;
  active: boolean;
  last_synced_at: string | null;
  consecutive_failures: number;
}

export function useSupabaseEvents() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Start from beginning of today to catch all-day events
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [eventsRes, sourcesRes] = await Promise.all([
          supabase
            .from('events')
            .select('*')
            .eq('expired', false)
            .gte('start_datetime', today.toISOString())
            .order('start_datetime', { ascending: true })
            .limit(500),
          supabase.from('sources').select('*').eq('active', true),
        ]);

        if (eventsRes.error) throw eventsRes.error;
        if (sourcesRes.error) throw sourcesRes.error;

        setEvents(eventsRes.data as EventRecord[]);
        setSources(sourcesRes.data as SourceRecord[]);
      } catch (err: any) {
        console.error('Error fetching Supabase data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { events, sources, loading, error };
}
