const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ihkqdsbhltecucjlwgtj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imloa3Fkc2JobHRlY3Vjamx3Z3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMzOTMwNiwiZXhwIjoyMDg4OTE1MzA2fQ.U4FniIEXlcJ1eOeLtupwMCtQAMvIv_XKmeOa5HL9GYk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, start_datetime, expired, updated_at')
    .ilike('title', '%Avoid the Traps%')
    .filter('start_datetime', 'eq', '2026-06-15T14:30:00+00:00');
  
  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("--- Avoid the Traps June 15 Detail ---");
  events.forEach(e => {
    console.log(`ID: ${e.id}`);
    console.log(`Title: ${e.title}`);
    console.log(`Expired: ${e.expired}`);
    console.log(`Updated At: ${e.updated_at}`);
    console.log('---');
  });
}

check();
