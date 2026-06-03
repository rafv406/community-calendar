const fetch = require('node-fetch');

async function analyzeFeed() {
  const url = 'https://community-calendar.rafv.realtor/feed.ics?v=' + Date.now();
  console.log(`Fetching feed from ${url}...`);
  
  try {
    const res = await fetch(url);
    const text = await res.text();
    
    const events = text.split('BEGIN:VEVENT').slice(1);
    console.log(`Total events in feed: ${events.length}`);
    
    const uids = new Set();
    const titles = new Set();
    const duplicateUids = [];
    const duplicateEvents = [];

    events.forEach(ev => {
      const uidMatch = ev.match(/UID:(.+)/);
      const summaryMatch = ev.match(/SUMMARY:(.+)/);
      const startMatch = ev.match(/DTSTART[:;](.+)/);
      
      const uid = uidMatch ? uidMatch[1].trim() : 'NO-UID';
      const title = summaryMatch ? summaryMatch[1].trim() : 'NO-TITLE';
      const start = startMatch ? startMatch[1].trim() : 'NO-START';
      
      const eventKey = `${title}|${start}`;

      if (uids.has(uid)) {
        duplicateUids.push(uid);
      }
      uids.add(uid);

      if (titles.has(eventKey)) {
        duplicateEvents.push(eventKey);
      }
      titles.add(eventKey);
    });

    console.log(`Internal duplicate UIDs: ${duplicateUids.length}`);
    console.log(`Internal duplicate Title/Dates: ${duplicateEvents.length}`);
    
    if (duplicateEvents.length > 0) {
      console.log('First 5 duplicates:');
      duplicateEvents.slice(0, 5).forEach(d => console.log(` - ${d}`));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

analyzeFeed();
