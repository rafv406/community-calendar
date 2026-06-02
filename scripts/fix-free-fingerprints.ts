import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = "https://ihkqdsbhltecucjlwgtj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imloa3Fkc2JobHRlY3Vjamx3Z3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMzOTMwNiwiZXhwIjoyMDg4OTE1MzA2fQ.U4FniIEXlcJ1eOeLtupwMCtQAMvIv_XKmeOa5HL9GYk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function generateFingerprint(title: string, start_datetime: string, source_id: string): string {
  const dateOnly = start_datetime.slice(0, 10); // 'YYYY-MM-DD'
  const raw = `${title.toLowerCase().trim()}|${dateOnly}|${source_id}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function fixFingerprints() {
  console.log("Fetching all upcoming [FREE] events...");
  
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .ilike('title', '[FREE] %')
    .eq('expired', false);

  if (error) {
    console.error("Error fetching events:", error);
    return;
  }

  console.log(`Processing ${events.length} events...`);

  let updatedCount = 0;
  let collisionCount = 0;
  let errorCount = 0;

  for (const event of events) {
    const originalTitle = event.title.replace(/^\[FREE\]\s+/i, '');
    const newFingerprint = generateFingerprint(originalTitle, event.start_datetime, event.source_id);

    if (newFingerprint === event.fingerprint) {
      console.log(`- Skipping ${event.id}: Fingerprint already correct.`);
      continue;
    }

    // Check for collisions (if a row with the correct fingerprint already exists)
    const { data: existing, error: fetchError } = await supabase
      .from('events')
      .select('id')
      .eq('fingerprint', newFingerprint)
      .maybeSingle();

    if (fetchError) {
      console.error(`  Error checking collision for ${event.id}:`, fetchError);
      errorCount++;
      continue;
    }

    if (existing) {
      console.log(`  Collision detected for ${event.id}: fingerprint ${newFingerprint} already exists at ${existing.id}. Deleting redundant [FREE] row...`);
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (deleteError) {
        console.error(`  Error deleting redundant row ${event.id}:`, deleteError);
        errorCount++;
      } else {
        collisionCount++;
      }
    } else {
      console.log(`  Updating ${event.id}: ${event.fingerprint} -> ${newFingerprint}`);
      const { error: updateError } = await supabase
        .from('events')
        .update({ fingerprint: newFingerprint })
        .eq('id', event.id);

      if (updateError) {
        console.error(`  Error updating event ${event.id}:`, updateError);
        errorCount++;
      } else {
        updatedCount++;
      }
    }
  }

  console.log("\nMigration Complete:");
  console.log(`- Updated: ${updatedCount}`);
  console.log(`- Collisions merged (deleted): ${collisionCount}`);
  console.log(`- Errors: ${errorCount}`);
}

fixFingerprints();
