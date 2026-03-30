const ical = require('node-ical');
const fetch = require('node-fetch'); // May need to use the global fetch in modern node

const url = 'https://www.lazarushouse.net/?plugin=all-in-one-event-calendar&controller=ai1ec_exporter_controller&action=export_events&no_html=true';

async function test() {
  console.log('Fetching Lazarus House feed...');
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log('Raw text length:', text.length);
    console.log('Preview:', text.substring(0, 200));
    const data = ical.parseICS(text);
    let count = 0;
    for (let k in data) {
       if (data[k].type === 'VEVENT') {
          count++;
          if (count < 5) {
             console.log(`Event ${count}: ${data[k].summary}, Start: ${data[k].start}`);
          }
       }
    }
    console.log('Found events:', count);
  } catch (err) {
    console.error('Test error:', err);
  }
}

test();
