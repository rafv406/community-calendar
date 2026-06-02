const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ihkqdsbhltecucjlwgtj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imloa3Fkc2JobHRlY3Vjamx3Z3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMzOTMwNiwiZXhwIjoyMDg4OTE1MzA2fQ.U4FniIEXlcJ1eOeLtupwMCtQAMvIv_XKmeOa5HL9GYk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanup() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  console.log(`Searching for events not updated since ${sevenDaysAgo.toISOString()}...`);
  
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, updated_at')
    .eq('expired', false)
    .lt('updated_at', sevenDaysAgo.toISOString());

  if (error) {
    console.error("Error fetching stale events:", error);
    return;
  }

  console.log(`Found ${events.length} stale events.`);
  
  if (events.length > 0) {
    const ids = events.map(e => e.id);
    const { error: updateError } = await supabase
      .from('events')
      .update({ expired: true })
      .in('id', ids);

    if (updateError) {
      console.error("Error expiring stale events:", updateError);
    } else {
      console.log(`Successfully expired ${events.length} stale events.`);
    }
  }
}

cleanup();
