const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data: sources, error: sErr } = await supabase.from('sources').select('*');
  const { data: events, error: eErr } = await supabase.from('events').select('*');
  
  console.log('--- DB Check ---');
  if (sErr) console.error('Sources error:', sErr);
  else console.log('Sources count:', sources.length);
  
  if (eErr) console.error('Events error:', eErr);
  else console.log('Events count:', events.length);
  
  if (events && events.length > 0) {
    console.log('LATEST EVENT TITLE:', events[0].title);
  }
  
  if (sources) {
    sources.forEach(s => {
      const perSourceCount = events.filter(e => e.source_id === s.id).length;
      console.log(`Source: ${s.name} (${s.id}), Events: ${perSourceCount}, Last Synced: ${s.last_synced_at}, Failures: ${s.consecutive_failures}`);
    });
  }
}

check();
