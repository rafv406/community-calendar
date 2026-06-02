export async function onRequest(context: any) {
  const { request } = context;
  const url = new URL(request.url);
  const workerUrl = new URL('https://community-calendar-worker.rafvvids.workers.dev/feed.ics');
  
  // Forward all search parameters to the worker
  url.searchParams.forEach((value, key) => {
    workerUrl.searchParams.set(key, value);
  });
  
  try {
    const response = await fetch(workerUrl.toString());
    if (!response.ok) {
      return new Response(`Error fetching calendar feed: ${response.statusText}`, { status: response.status });
    }
    
    const data = await response.text();
    
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="community-calendar.ics"',
        'Cache-Control': 'public, max-age=1800',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}
