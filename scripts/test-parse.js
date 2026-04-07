const ical = require('node-ical');
const fs = require('fs');

async function testParse() {
  const url = 'https://api.eventcalendarapp.com/widget-subscription/14831/17c9336c-46b6-4138-885d-b92cd0abcab9';
  console.log(`Fetching ${url}...`);
  const res = await fetch(url);
  const rawData = await res.text();
  
  console.log('Parsing with node-ical...');
  const data = ical.parseICS(rawData);
  
  let count = 0;
  for (const key in data) {
    const ev = data[key];
    if (ev.type === 'VEVENT') {
      count++;
      if (count < 3) {
        console.log(`Event ${count}: ${ev.summary}`);
        console.log(`  Start: ${ev.start} (Type: ${typeof ev.start})`);
        console.log(`  End: ${ev.end}`);
      }
    }
  }
  console.log(`Total VEVENTs found: ${count}`);
}

testParse();
