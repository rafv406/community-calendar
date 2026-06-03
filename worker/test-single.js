const fetch = require('node-fetch');

async function testQuery(query) {
  try {
    const res = await fetch('http://localhost:8787/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: query }
        ]
      })
    });

    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error(`Fetch failed:`, err);
  }
}

testQuery("volunteer events");
