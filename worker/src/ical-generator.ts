import { NormalizedEvent } from './types';

// Extend NormalizedEvent to include database timestamp fields
export interface DbEventRecord extends NormalizedEvent {
  created_at?: string;
  updated_at?: string;
}

// RFC 5545 Section 3.1: fold lines longer than 75 octets
function foldLine(line: string): string {
  const limit = 75;
  if (line.length <= limit) return line;

  let result = '';
  result += line.substring(0, limit);
  let remaining = line.substring(limit);

  while (remaining.length > 0) {
    result += '\r\n ' + remaining.substring(0, limit - 1);
    remaining = remaining.substring(limit - 1);
  }

  return result;
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

  // Helper to escape values for iCal TEXT properties per RFC 5545
  const escapeText = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  };

  // Helper to escape values for iCal but LESS aggressive with commas for URLs
  const escapeDescription = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      // We don't escape commas in description because it often breaks URLs 
      // for "dumb" parsers like Google Calendar's link detector
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
    'NAME:RAFV Community Calendar',
    'X-WR-CALDESC:Local real estate events, volunteer opportunities, and community happenings.',
    'X-WR-TIMEZONE:UTC',
  ];

  for (const ev of events) {
    const created = formatIcalDate(ev.created_at || new Date().toISOString());
    const lastModified = formatIcalDate(ev.updated_at || ev.created_at || new Date().toISOString());
    
    lines.push('BEGIN:VEVENT');
    // Don't fold UID as it can break some parsers
    lines.push(`UID:${ev.raw_uid || ev.fingerprint}@community-calendar.rafv.realtor`);
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

    const displayTitle = ev.source_name ? `[${ev.source_name}] ${ev.title}` : ev.title;
    lines.push(foldLine(`SUMMARY:${escapeText(displayTitle)}`));

    // Prepare Description
    let descriptionText = ev.description || '';
    if (ev.url) {
      if (descriptionText) descriptionText += '\n\n';
      descriptionText += `View Full Event: ${ev.url}`;
    }
    
    // Plain text description
    lines.push(foldLine(`DESCRIPTION:${escapeDescription(descriptionText)}`));

    // HTML description (Google Calendar favors this)
    let htmlDescription = (ev.description || '').replace(/\n/g, '<br>');
    if (ev.url) {
      if (htmlDescription) htmlDescription += '<br><br>';
      htmlDescription += `<a href="${ev.url}">View Full Event Details</a>`;
    }
    lines.push(foldLine(`X-ALT-DESC;FMTTYPE=text/html:${escapeDescription(htmlDescription)}`));

    if (ev.location) {
      lines.push(foldLine(`LOCATION:${escapeText(ev.location)}`));
    }

    if (ev.url) {
      // Don't fold URL
      lines.push(`URL:${ev.url}`);
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}
