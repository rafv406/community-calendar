const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function inspect() {
  const { data: events } = await supabase.from('events').select('*');
  if (events) {
    events.forEach(e => {
        console.log(`Event: ${e.title}, Start: ${e.start_datetime}, Expired: ${e.expired}, SourceId: ${e.source_id}`);
    });
  }
}
inspect();
