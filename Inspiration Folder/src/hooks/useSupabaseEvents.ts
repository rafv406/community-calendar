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
  last_error: string | null;
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
        
        // 1. Check SessionStorage Cache (10 minutes TTL)
        const cacheKey = 'calendar_events_cache';
        const cacheExpiryKey = 'calendar_events_cache_expiry';
        const cachedData = sessionStorage.getItem(cacheKey);
        const cachedExpiry = sessionStorage.getItem(cacheExpiryKey);
        
        if (cachedData && cachedExpiry && Date.now() < Number(cachedExpiry)) {
          const parsed = JSON.parse(cachedData);
          setEvents(parsed.events);
          setSources(parsed.sources);
          setLoading(false);
          return;
        }

        // 2. Fetch Data (either from Worker proxy or direct from Supabase client)
        const workerApiUrl = import.meta.env.VITE_WORKER_API_URL;
        let eventsData: EventRecord[] = [];
        let sourcesData: SourceRecord[] = [];

        if (workerApiUrl) {
          console.log('Fetching events and sources from Cloudflare Edge Worker cache proxy...');
          const res = await fetch(`${workerApiUrl}/events`);
          if (!res.ok) throw new Error(`Worker API request failed: ${res.status}`);
          const parsed = await res.json();
          eventsData = parsed.events;
          sourcesData = parsed.sources;
        } else {
          console.log('VITE_WORKER_API_URL not configured. Querying Supabase directly...');
          // Direct Supabase Fallback
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
          
          eventsData = eventsRes.data as EventRecord[];
          sourcesData = sourcesRes.data as SourceRecord[];
        }

        // 3. Update states and store to SessionStorage (10 minutes expiration)
        setEvents(eventsData);
        setSources(sourcesData);
        
        sessionStorage.setItem(cacheKey, JSON.stringify({ events: eventsData, sources: sourcesData }));
        sessionStorage.setItem(cacheExpiryKey, String(Date.now() + 10 * 60 * 1000));
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { events, sources, loading, error };
}
