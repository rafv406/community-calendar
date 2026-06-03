const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ihkqdsbhltecucjlwgtj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imloa3Fkc2JobHRlY3Vjamx3Z3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMzOTMwNiwiZXhwIjoyMDg4OTE1MzA2fQ.U4FniIEXlcJ1eOeLtupwMCtQAMvIv_XKmeOa5HL9GYk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findDuplicates() {
  console.log("Searching for duplicate active events...");
  
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, start_datetime, source_name, fingerprint, raw_uid')
    .eq('expired', false);

  if (error) {
    console.error("Error:", error);
    return;
  }

  const seen = new Map();
  const duplicates = [];

  events.forEach(e => {
    const key = `${e.title.toLowerCase().trim()}|${e.start_datetime}`;
    if (seen.has(key)) {
      duplicates.push({ original: seen.get(key), duplicate: e });
    } else {
      seen.set(key, e);
    }
  });

  console.log(`Found ${duplicates.length} duplicate pairs.`);
  duplicates.slice(0, 10).forEach(d => {
    console.log(`Duplicate found: "${d.original.title}" at ${d.original.start_datetime}`);
    console.log(`  - Original: ID ${d.original.id}, Source: ${d.original.source_name}, FP: ${d.original.fingerprint}, UID: ${d.original.raw_uid}`);
    console.log(`  - Duplicate: ID ${d.duplicate.id}, Source: ${d.duplicate.source_name}, FP: ${d.duplicate.fingerprint}, UID: ${d.duplicate.raw_uid}`);
    console.log('---');
  });
}

findDuplicates();
