async function testFetch() {
  const url = 'https://api.eventcalendarapp.com/widget-subscription/14831/17c9336c-46b6-4138-885d-b92cd0abcab9';
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Content length: ${text.length}`);
    console.log(`First 500 chars:\n${text.substring(0, 500)}`);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}
testFetch();
