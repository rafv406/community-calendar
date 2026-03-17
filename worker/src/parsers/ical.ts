import * as ical from 'node-ical';
import { Source, NormalizedEvent } from '../types';
import { generateFingerprint } from '../dedupe';
import { extractHtmlImage, stripHtmlAndDecode, truncateDescription, extractCategories, normalizeDate } from '../normalize';

export async function parseICalFeed(source: Source): Promise<NormalizedEvent[]> {
  const events: NormalizedEvent[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(source.feed_url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rawData = await response.text();
    const data = ical.parseICS(rawData);

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const ev = data[key];
        const eventAny = ev as any;
        if (ev.type === 'VEVENT') {
          let title = ev.summary ? ev.summary.slice() : '';
          if (typeof title === 'object' && (title as any).val) title = (title as any).val;
          title = stripHtmlAndDecode(title);
          
          if (!title) continue;

          let description = ev.description ? ev.description.slice() : '';
          if (typeof description === 'object' && (description as any).val) description = (description as any).val;
          
          let imageUrl = null;
          if (eventAny.attach) {
             if (Array.isArray(eventAny.attach)) {
                const img = eventAny.attach.find((a: any) => a.params && a.params.FMTTYPE && a.params.FMTTYPE.startsWith('image/'));
                if (img) imageUrl = img.val;
             } else if (eventAny.attach.params && eventAny.attach.params.FMTTYPE && eventAny.attach.params.FMTTYPE.startsWith('image/')) {
                imageUrl = eventAny.attach.val;
             } else if (typeof eventAny.attach === 'string') {
                imageUrl = eventAny.attach;
             }
          }
          if (!imageUrl && description) {
             imageUrl = extractHtmlImage(description);
          }
          if (!imageUrl && source.logo_url) {
             imageUrl = source.logo_url;
          }

          const cleanDesc = truncateDescription(stripHtmlAndDecode(description));
          const categories = extractCategories(title + ' ' + cleanDesc);
          
          const rawStart = normalizeDate(ev.start);
          if (!rawStart) continue;
          const start = rawStart as string;
          
          let end = normalizeDate(ev.end);
          
          let allDay = false;
          if (ev.start && (ev.start as any).dateOnly) {
             allDay = true;
             end = null;
          } else if (!end) {
             const startDate = new Date(start);
             startDate.setHours(startDate.getHours() + 1);
             end = startDate.toISOString();
          }

          let location: string | null = ev.location ? ev.location.slice() : '';
          if (typeof location === 'object' && (location as any).val) location = (location as any).val;
          location = location ? (location as string).trim() || null : null;
          
          let url = ev.url ? ev.url.slice() : null;
          if (typeof url === 'object' && (url as any).val) url = (url as any).val;

          const fingerprint = await generateFingerprint(title, start, source.id);

          events.push({
            title,
            start_datetime: start,
            end_datetime: end,
            all_day: allDay,
            location,
            description: cleanDesc || null,
            image_url: imageUrl,
            url,
            source_id: source.id,
            source_name: source.name,
            categories,
            raw_uid: eventAny.uid || null,
            fingerprint
          });
        }
      }
    }
    return events;
  } catch (err) {
    console.error(`[SYNC ERROR] ${source.name}:`, err);
    return [];
  }
}
