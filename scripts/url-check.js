const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data: sources } = await supabase.from('sources').select('*');
  if (sources) {
    sources.forEach(s => console.log(`Source: ${s.name}, URL: ${s.feed_url}`));
  }
}
check();
