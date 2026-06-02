const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve('Inspiration Folder', '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  console.log('Querying all events...');
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('expired', false);

  if (error) {
    console.error('Error fetching events:', error);
    return;
  }

  console.log(`Total events fetched: ${events.length}`);
  
  // Find duplicates by title alone
  const map = new Map();
  for (const e of events) {
    const key = e.title.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(e);
  }

  let duplicateCount = 0;
  for (const [key, list] of map.entries()) {
    if (list.length > 1) {
      duplicateCount++;
      console.log(`\nDuplicate Title Group ${duplicateCount}: "${list[0].title}"`);
      list.forEach((e, idx) => {
        console.log(`  [${idx + 1}] Source: ${e.source_name} (ID: ${e.source_id})`);
        console.log(`      Date: ${e.start_datetime}`);
        console.log(`      Fingerprint: ${e.fingerprint}`);
        console.log(`      URL: ${e.url}`);
      });
    }
  }

  if (duplicateCount === 0) {
    console.log('No duplicates found.');
  }
}

check();
