import { DateTime } from 'luxon';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  fundraiser:  ['gala', 'auction', 'fundraiser', 'fundraising', 'charity', 'benefit'],
  meeting:     ['meeting', 'board', 'agenda', 'minutes', 'committee'],
  workshop:    ['workshop', 'class', 'training', 'seminar', 'learn'],
  family:      ['family', 'kids', 'children', 'youth', 'all ages'],
  arts:        ['concert', 'performance', 'exhibit', 'gallery', 'theatre', 'music'],
  sports:      ['tournament', 'race', 'game', 'match', 'sport', 'run', 'walk'],
  community:   ['festival', 'fair', 'parade', 'celebration', 'community'],
  environment: ['garden', 'plant', 'nature', 'cleanup', 'environment', 'park'],
};

export function extractHtmlImage(html: string | null): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

export function stripHtmlAndDecode(html: string | null): string {
  if (!html) return '';
  let text = html.replace(/<[^>]*>?/gm, ' ');
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'");
  return text.replace(/\s+/g, ' ').trim();
}

export function truncateDescription(desc: string, maxChars: number = 1000): string {
  if (desc.length <= maxChars) return desc;
  return desc.substring(0, maxChars - 3) + '...';
}

export function extractCategories(text: string): string[] {
  const lowerText = text.toLowerCase();
  const found = new Set<string>();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lowerText.includes(kw)) {
        found.add(category);
        break;
      }
    }
  }
  return Array.from(found);
}

export function normalizeDate(dateInput: string | Date | undefined | null, tzid?: string): string | null {
  if (!dateInput) return null;
  
  let dt: DateTime;
  if (dateInput instanceof Date) {
     dt = DateTime.fromJSDate(dateInput);
  } else {
     // Try JS Date first just to be sure it's valid
     const jsDate = new Date(dateInput);
     if (isNaN(jsDate.getTime())) return null;
     
     dt = DateTime.fromJSDate(jsDate, { zone: tzid || 'utc' });
  }
  
  if (dt && dt.isValid) {
    return dt.toUTC().toISO();
  }
  return null;
}
