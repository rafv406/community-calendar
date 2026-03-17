import Parser from 'rss-parser';
import { Source, NormalizedEvent } from '../types';
import { generateFingerprint } from '../dedupe';
import { extractHtmlImage, stripHtmlAndDecode, truncateDescription, extractCategories, normalizeDate } from '../normalize';

const parser = new Parser({
  customFields: {
    item: ['enclosure']
  }
});

export async function parseRssFeed(source: Source): Promise<NormalizedEvent[]> {
  const events: NormalizedEvent[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(source.feed_url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    const feed = await parser.parseString(xml);

    for (const item of feed.items) {
      if (!item.title) continue;
      
      const title = stripHtmlAndDecode(item.title);
      if (!title) continue;

      const descriptionRaw = item.content || item.contentSnippet || (item as any).description || '';
      
      let imageUrl = null;
      if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
        imageUrl = item.enclosure.url;
      }
      if (!imageUrl) imageUrl = extractHtmlImage(descriptionRaw);
      if (!imageUrl && source.logo_url) imageUrl = source.logo_url;

      const cleanDesc = truncateDescription(stripHtmlAndDecode(descriptionRaw));
      const categories = extractCategories(title + ' ' + cleanDesc);
      
      const start = normalizeDate(item.pubDate || item.isoDate);
      if (!start) continue;

      const startDate = new Date(start);
      startDate.setHours(startDate.getHours() + 1);
      const end = startDate.toISOString();
      
      const url = item.link || null;
      const fingerprint = await generateFingerprint(title, start, source.id);

      events.push({
        title,
        start_datetime: start,
        end_datetime: end,
        all_day: false,
        location: null,
        description: cleanDesc || null,
        image_url: imageUrl,
        url,
        source_id: source.id,
        source_name: source.name,
        categories,
        raw_uid: item.guid || (item as any).id || null,
        fingerprint
      });
    }
    return events;
  } catch (err) {
    console.error(`[SYNC ERROR] ${source.name}:`, err);
    return [];
  }
}
