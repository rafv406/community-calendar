import { NormalizedEvent } from './types';

// Extend NormalizedEvent to include database timestamp fields
export interface DbEventRecord extends NormalizedEvent {
  created_at?: string;
  updated_at?: string;
}

export function generateIcalFeed(events: DbEventRecord[]): string {
  const formatIcalDate = (dStr: string) => {
    const date = new Date(dStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return date.getUTCFullYear() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) +
      'T' +
      pad(date.getUTCHours()) +
      pad(date.getUTCMinutes()) +
      pad(date.getUTCSeconds()) +
      'Z';
  };

  const formatIcalDateOnly = (dStr: string) => {
    const date = new Date(dStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return date.getUTCFullYear() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate());
  };

  // Helper to escape values for iCal per RFC 5545
  const escapeText = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  };

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RAFV//Community Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:RAFV Community Calendar',
    'X-WR-TIMEZONE:UTC',
  ];

  for (const ev of events) {
    const created = formatIcalDate(ev.created_at || new Date().toISOString());
    const lastModified = formatIcalDate(ev.updated_at || ev.created_at || new Date().toISOString());
    
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.fingerprint}@community-calendar.rafv.realtor`);
    lines.push(`DTSTAMP:${created}`);
    lines.push(`LAST-MODIFIED:${lastModified}`);
    
    if (ev.all_day) {
      const startDay = formatIcalDateOnly(ev.start_datetime);
      lines.push(`DTSTART;VALUE=DATE:${startDay}`);
      
      // iCal DTEND for all-day events is exclusive, so we add 1 day
      const startDate = new Date(ev.start_datetime);
      startDate.setUTCDate(startDate.getUTCDate() + 1);
      const endDay = formatIcalDateOnly(startDate.toISOString());
      lines.push(`DTEND;VALUE=DATE:${endDay}`);
    } else {
      lines.push(`DTSTART:${formatIcalDate(ev.start_datetime)}`);
      
      let endStr = ev.end_datetime;
      if (!endStr) {
        // Fallback end time to start + 1 hour if not specified
        const startDate = new Date(ev.start_datetime);
        startDate.setUTCHours(startDate.getUTCHours() + 1);
        endStr = startDate.toISOString();
      }
      lines.push(`DTEND:${formatIcalDate(endStr)}`);
    }

    lines.push(`SUMMARY:${escapeText(ev.title)}`);

    // Prepare Description
    let descriptionText = ev.description || '';
    if (ev.url) {
      if (descriptionText) descriptionText += '\n\n';
      descriptionText += `View Full Event: ${ev.url}`;
    }
    lines.push(`DESCRIPTION:${escapeText(descriptionText)}`);

    if (ev.location) {
      lines.push(`LOCATION:${escapeText(ev.location)}`);
    }

    if (ev.url) {
      lines.push(`URL:${ev.url}`);
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}
