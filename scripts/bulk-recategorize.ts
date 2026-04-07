import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ihkqdsbhltecucjlwgtj.supabase.co";
// This is the service role key from the user's .env.local (used as anon key there)
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imloa3Fkc2JobHRlY3Vjamx3Z3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMzOTMwNiwiZXhwIjoyMDg4OTE1MzA2fQ.U4FniIEXlcJ1eOeLtupwMCtQAMvIv_XKmeOa5HL9GYk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  fundraiser:  ['gala', 'auction', 'fundraiser', 'fundraising', 'charity', 'benefit'],
  meeting:     ['meeting', 'board', 'agenda', 'minutes', 'committee'],
  workshop:    ['workshop', 'class', 'training', 'seminar', 'learn', 'education', 'webinar'],
  family:      ['family', 'kids', 'children', 'youth', 'all ages'],
  arts:        ['concert', 'exhibit', 'gallery', 'theatre', 'museum', 'symphony', 'orchestra'],
  sports:      ['tournament', 'race', 'game', 'match', 'sport', 'athletics', 'competition', 'marathon'],
  community:   ['festival', 'fair', 'parade', 'celebration', 'community'],
  environment: ['environment', 'park', 'nature', 'garden', 'plant', 'cleanup'],
  professional:['conference', 'networking', 'summit', 'convention', 'leadership', 'certification'],
};

function extractCategories(text: string): string[] {
  const lowerText = text.toLowerCase();
  const found = new Set<string>();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      // Use regex with word boundaries to ensure we match whole words only.
      // This prevents "run" from matching "running" or "run-through" incorrectly.
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(lowerText)) {
        found.add(category);
        break;
      }
    }
  }
  return Array.from(found);
}

async function bulkRecategorize() {
  console.log("Fetching all upcoming events...");
  
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, description')
    .eq('expired', false);

  if (error) {
    console.error("Error fetching events:", error);
    return;
  }

  console.log(`Processing ${events.length} events...`);

  let updatedCount = 0;
  for (const event of events) {
    const combinedText = `${event.title} ${event.description || ''}`;
    const newCategories = extractCategories(combinedText);
    
    const { error: updateError } = await supabase
      .from('events')
      .update({ categories: newCategories })
      .eq('id', event.id);

    if (updateError) {
      console.error(`Error updating event ${event.id}:`, updateError);
    } else {
      updatedCount++;
    }
  }

  console.log(`Success! Updated ${updatedCount} events.`);
}

bulkRecategorize();
