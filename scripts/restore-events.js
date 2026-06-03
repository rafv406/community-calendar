const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ihkqdsbhltecucjlwgtj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imloa3Fkc2JobHRlY3Vjamx3Z3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMzOTMwNiwiZXhwIjoyMDg4OTE1MzA2fQ.U4FniIEXlcJ1eOeLtupwMCtQAMvIv_XKmeOa5HL9GYk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function restore() {
  console.log("Restoring future events...");
  
  // 1. Un-expire everything starting after May 1st 2026 (safe margin)
  const { data, error, count } = await supabase
    .from('events')
    .update({ expired: false })
    .gte('start_datetime', '2026-05-01T00:00:00Z');

  if (error) {
    console.error("Error restoring events:", error);
    return;
  }

  console.log(`Success! restored events.`);

  // 2. Double check active count
  const { count: activeCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('expired', false);

  console.log(`Current active event count: ${activeCount}`);
}

restore();
