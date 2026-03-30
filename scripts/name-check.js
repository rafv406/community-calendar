const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data: events } = await supabase.from('events').select('source_name').limit(10);
  if (events) {
    events.forEach(e => console.log(`'${e.source_name}'`));
  }
}
check();
