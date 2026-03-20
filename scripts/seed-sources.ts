import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const sources = [
  {
    name: 'RAFV Events',
    feed_url: 'https://realtorassociationofthefoxvalleyrafv.growthzoneapp.com/ap/CalendarFeed/1309',
    source_type: 'ical',
    color: '#003399',
    active: true,
  }
];

async function seed() {
  console.log('Seeding initial sources...');
  const { data, error } = await supabase
    .from('sources')
    .upsert(sources, { onConflict: 'feed_url' })
    .select();

  if (error) {
    console.error('Error seeding sources:', error);
  } else {
    console.log('Successfully seeded sources:', data);
  }
}

seed();
