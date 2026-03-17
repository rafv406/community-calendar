## 5. Frontend Calendar & SEO

Because a core goal is to make `rafv.realtor` a dominant local search hub, we cannot rely solely on a JavaScript-rendered app — Google struggles to index JS-only content for the Events Carousel. The solution is a hybrid: a fast JS calendar for the browsing experience, with server-side SEO injection for individual event URLs.

### 5.1 The "Event Hub" Routing Model

| URL | What Happens |
|---|---|
| `rafv.realtor/community-calendar` | Loads the FullCalendar.js grid — the main browsing view. |
| `rafv.realtor/community-calendar/event/{id}` | A Cloudflare Pages Function intercepts server-side, injects SEO tags, then delivers the same frontend JS. The URL is shareable and indexable by Google. |

**The key interaction:** Clicking an event on the calendar changes the browser URL to `/community-calendar/event/{id}`. A visual modal or panel can display the details, but the URL *must* update so the page is shareable and Google can crawl it.

### 5.2 SEO Tag Injection — Cloudflare Pages Functions

File: `frontend/functions/community-calendar/event/[id].ts`

When Google's crawler or a user requests `/community-calendar/event/{id}`, this function:

1. Extracts `{id}` from the URL.
2. Fetches the event record from Supabase server-side (service key is never exposed to the browser).
3. Uses `HTMLRewriter` to inject into the `<head>` of `index.html` before delivery:

```typescript
// frontend/functions/community-calendar/event/[id].ts
export async function onRequest(context) {
  const { params, env } = context
  const eventId = params.id

  // Fetch event from Supabase server-side
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/events?id=eq.${eventId}&select=*`,
    { headers: { apikey: env.SUPABASE_SERVICE_KEY } }
  )
  const [event] = await res.json()
  if (!event) return context.next() // fall through to 404

  const title = `${event.title} | RAFV Community Calendar`
  const description = event.description ?? 'A community event in the Fox Valley.'
  const image = event.image_url ?? 'https://rafv.realtor/default-og-image.jpg'
  const canonicalUrl = `https://rafv.realtor/community-calendar/event/${eventId}`

  return new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(title) } })
    .on('head', { element(el) {
      el.append(`
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${image}">
        <meta property="og:url" content="${canonicalUrl}">
        <link rel="canonical" href="${canonicalUrl}">
        <script type="application/ld+json">
        ${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Event",
          "name": event.title,
          "startDate": event.start_datetime,
          "endDate": event.end_datetime,
          "location": { "@type": "Place", "name": event.location ?? 'Fox Valley, IL' },
          "description": description,
          "image": image,
          "url": event.url ?? canonicalUrl,
          "organizer": { "@type": "Organization", "name": event.source_name }
        })}
        </script>
      `, { html: true })
    }})
    .transform(await context.next())
}
```

### 5.3 FullCalendar.js Configuration

| Feature | Implementation |
|---|---|
| Library | FullCalendar v6 vanilla JS bundle loaded from CDN (jsDelivr or cdnjs). No framework required. |
| Default view | `dayGridMonth` on desktop (≥ 768px). `listMonth` on mobile (< 768px). |
| Event source | JSON feed from Supabase REST API. Fetches events for the visible date range. |
| Color coding | Each organization uses the hex color stored in the `sources` table. |
| Event click | Updates browser URL to `/community-calendar/event/{id}`. Displays event details in a panel or modal. |
| Navigation | FullCalendar's built-in prev/next/today buttons. Triggers a new API fetch for the new date range. |
| Mobile | List view activates at < 768px. Works in 375px viewport. |

### 5.4 Supabase API Query Contract

```
GET {SUPABASE_URL}/rest/v1/events
  ?select=id,title,start_datetime,end_datetime,all_day,location,description,image_url,url,source_id,source_name,categories
  &expired=eq.false
  &start_datetime=gte.{ISO_DATE}
  &order=start_datetime.asc
  &limit=500

Headers:
  apikey: {SUPABASE_ANON_KEY}
  Authorization: Bearer {SUPABASE_ANON_KEY}
```

**FullCalendar event shape:**

```javascript
{
  id:              event.id,
  title:           event.title,
  start:           event.start_datetime,
  end:             event.end_datetime,
  allDay:          event.all_day,
  url:             `/community-calendar/event/${event.id}`,  // internal route
  backgroundColor: sourceColorMap[event.source_id],
  borderColor:     sourceColorMap[event.source_id],
  extendedProps: {
    location:     event.location,
    description:  event.description,
    image_url:    event.image_url,
    source_name:  event.source_name,
    categories:   event.categories,
    external_url: event.url,  // link back to the partner's original event page
  }
}
```

### 5.5 Filtering UI

- **Organization row:** One checkbox/button per partner with their color dot. All on by default.
- **Category row:** Pill buttons for `Community | Arts | Sports | Environment | Family | Fundraiser | Meeting`.
- **URL persistence:** Active filters written to `?orgs=id1,id2&cats=arts,sports`. Page load restores filter state.
- **Search box (Phase 4):** Client-side keyword filter on already-loaded events. No additional API call.
