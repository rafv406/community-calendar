import { DateTime } from 'luxon';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  fundraiser: ['gala', 'auction', 'fundraiser', 'fundraising', 'charity', 'benefit'],
  meeting: ['meeting', 'board', 'agenda', 'minutes', 'committee'],
  workshop: ['workshop', 'class', 'training', 'seminar', 'learn', 'education', 'webinar'],
  family: ['family', 'kids', 'children', 'youth', 'all ages'],
  arts: ['concert', 'exhibit', 'gallery', 'theatre', 'museum', 'symphony', 'orchestra'],
  sports: ['tournament', 'race', 'game', 'match', 'sport', 'athletics', 'competition', 'marathon'],
  community: ['festival', 'fair', 'parade', 'celebration', 'community'],
  environment: ['garden', 'plant', 'nature', 'cleanup', 'environment', 'park'],
  professional: ['conference', 'networking', 'summit', 'convention', 'leadership', 'certification'],
  social: ['fun', 'social', 'networking', 'people']
};

export function extractHtmlImage(html: string | null): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

export function stripHtmlAndDecode(html: string | null): string {
  if (!html) return '';

  // 1. Replace block-level tags with newlines to preserve structure
  let text = html.replace(/<(p|div|br|h1|h2|h3|h4|h5|h6)[^>]*>/gi, '\n');

  // 2. Remove all other HTML tags
  text = text.replace(/<[^>]*>?/gm, ' ');

  // 3. Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"');

  // 4. Cleanup whitespace while preserving paragraph structure
  // Replace tabs and non-newline whitespace with a single space
  text = text.replace(/[^\S\r\n]+/g, ' ');
  // Normalize newline characters
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Collapse 3 or more consecutive newlines into exactly two (standard paragraph break)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Specifically cleans event descriptions by removing URLs (which are redundant
 * because the UI has a dedicated 'View Event' button) and common feed artifacts.
 */
export function cleanDescription(html: string | null): string {
  if (!html) return '';

  let text = stripHtmlAndDecode(html);

  // Remove "Latest event details:" block at the beginning
  text = text.replace(/^Latest event details:\s*/i, '');

  // 1. Remove all URLs (http, https, webcal)
  // We match standard URLs and also those wrapped in brackets/parentheses
  text = text.replace(/(https?|webcal):\/\/[^\s]+/gi, '');

  // Remove leading dividers or lines left after stripping the prefix/URL
  text = text.trim();
  if (text.startsWith('---')) {
    text = text.replace(/^---+\s*/, '');
  }

  // 2. Remove common trailing "call to action" phrases that points to the URL we just removed
  const redundantPhrases = [
    /View (event )?details/i,
    /Register (online )?at/i,
    /Click here (to register|for more info)/i,
    /Register here/i,
    /More info(rmation)?/i,
    /Source:?/i,
    /Link:?/i,
    /visit (our )?facebook/i,
    /see flyer (for details)?/i
  ];

  redundantPhrases.forEach(regex => {
    // Only remove these if they are at the very end of the text (after URL stripping)
    const endRegex = new RegExp(`${regex.source}\\s*[:\\-,.()\\s]*$`, 'i');
    text = text.replace(endRegex, '');
  });

  // 3. Clean up any orphaned brackets or punctuation left behind
  text = text.replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\{\s*\}/g, '')
    .replace(/\s+[:\-,.()]\s*$/g, ''); // Trailing punctuation

  return text.trim();
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
