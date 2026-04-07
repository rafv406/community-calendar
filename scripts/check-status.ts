import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load from .env.local in Inspiration Folder
dotenv.config({ path: path.resolve('Inspiration Folder', '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function check() {
  console.log('Checking sources from database...');
  const { data: sources, error: sError } = await supabase
    .from('sources')
    .select('*')
    .order('name');

  if (sError) {
    console.error('Error fetching sources:', sError);
    return;
  }

  console.log('--- SOURCES ---');
  sources.forEach(s => {
    console.log(`[${s.id}] ${s.name} - Status: ${s.active ? 'ACTIVE' : 'INACTIVE'} - Failures: ${s.consecutive_failures} - Last Synced: ${s.last_synced_at}`);
  });

  console.log('\nChecking events count per source...');
  for (const s of sources) {
    const { count, error: eError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('source_id', s.id);
    
    if (eError) {
      console.error(`Error fetching events for ${s.name}:`, eError);
    } else {
      console.log(`[${s.id}] ${s.name}: ${count} events stored.`);
      if (count && count > 0) {
        const { data: latest } = await supabase.from('events').select('title, start_datetime').eq('source_id', s.id).limit(1);
        console.log(`   Example: ${latest![0].title} on ${latest![0].start_datetime}`);
      }
    }
  }
}

check();
