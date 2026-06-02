const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve('Inspiration Folder', '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .ilike('title', '%Multifamily%');

  if (error) {
    console.error('Error fetching event:', error);
    return;
  }

  console.log(`Found ${events.length} events:`);
  events.forEach(e => {
    console.log(`Title: ${e.title}`);
    console.log(`URL in DB: ${e.url}`);
    console.log(`Description in DB:\n${e.description}`);
    console.log(`Fingerprint: ${e.fingerprint}`);
    console.log('---');
  });
}

check();
