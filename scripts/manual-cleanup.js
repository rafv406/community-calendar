const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ihkqdsbhltecucjlwgtj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imloa3Fkc2JobHRlY3Vjamx3Z3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMzOTMwNiwiZXhwIjoyMDg4OTE1MzA2fQ.U4FniIEXlcJ1eOeLtupwMCtQAMvIv_XKmeOa5HL9GYk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanup() {
  console.log("Expiring stale 'Jeffrey Marks' event (ID: b523e126)...");
  
  const { error } = await supabase
    .from('events')
    .update({ expired: true })
    .eq('id', 'b523e126-50f8-40ae-b37d-820a3360047d');

  if (error) {
    console.error("Error expiring event:", error);
  } else {
    console.log("Success! Event expired.");
  }
}

cleanup();
