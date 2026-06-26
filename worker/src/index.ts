import { Source, NormalizedEvent, SyncResult } from './types';
import { parseICalFeed } from './parsers/ical';
import { parseRssFeed } from './parsers/rss';
import { upsertEvents, updateSourceStatus, expireStaleEvents, Env } from './db';
import { generateIcalFeed } from './ical-generator';
import { aiCategorizeAndEmbed, aiEnrichEventsBatch } from './normalize';
import { getOpenAiEmbedding, callOpenAiChat, streamOpenAiChat } from './openai';

async function fetchSources(env: Env): Promise<Source[]> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/sources?active=eq.true`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
    }
  });
  if (!res.ok) throw new Error('Failed to fetch sources');
  return res.json();
}

async function syncSource(source: Source, env: Env): Promise<SyncResult> {
  let events: NormalizedEvent[] = [];
  let error: string | null = null;
  const syncStartTime = new Date().toISOString();

  try {
    if (source.source_type === 'ical') {
      events = await parseICalFeed(source);
    } else if (source.source_type === 'rss') {
      events = await parseRssFeed(source);
    }

    if (events.length > 0) {
      // Deduplicate within the same batch by fingerprint
      const uniqueEvents = Array.from(
        new Map(events.map(ev => [ev.fingerprint, ev])).values()
      );
      
      // Process events through AI categorization and embeddings using batching
      let aiEvents: NormalizedEvent[] = uniqueEvents;
      try {
        aiEvents = await aiEnrichEventsBatch(uniqueEvents, env.OPENAI_API_KEY);
      } catch (aiErr) {
        console.error('AI Batched Enrichment failed, using raw events:', aiErr);
      }
      await upsertEvents(aiEvents, env);
      
      // Expire events that were NOT in this sync (using updated_at < syncStartTime)
      // We only do this if we actually found events in the feed to avoid 
      // accidentally wiping a source if the feed is temporarily empty.
      await expireStaleEvents(source.id, syncStartTime, env);
      
      events = aiEvents;
    }

    // Success: report success to source record
    await updateSourceStatus(source.id, {
      last_synced_at: new Date().toISOString(),
      consecutive_failures: 0,
      last_error: null
    }, env);
  } catch (err: any) {
    error = err.message || 'Unknown error during sync';

    // Failure: bump consecutive_failures and log error
    await updateSourceStatus(source.id, {
      consecutive_failures: (source.consecutive_failures || 0) + 1,
      last_error: error
    }, env);
  }

  return {
    source_id: source.id,
    source_name: source.name,
    events_found: events.length,
    events_upserted: events.length, // assuming all succeeded if no error in upsertEvents
    error
  };
}

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
];

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || 
                    origin.endsWith('.rafv.org') || 
                    origin.endsWith('.rafv.realtor') || 
                    origin.startsWith('http://localhost:') || 
                    origin.startsWith('http://127.0.0.1:') ||
                    origin.endsWith('.workers.dev') ||
                    origin.endsWith('.pages.dev');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

async function verifyTurnstile(token: string, secretKey: string, ip?: string): Promise<boolean> {
  if (!token) {
    console.error('Turnstile verification failed: Token is empty or missing.');
    return false;
  }
  
  const formData = new FormData();
  formData.append('secret', secretKey);
  formData.append('response', token);
  if (ip) {
    formData.append('remoteip', ip);
  }

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) return false;
    const outcome = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    if (!outcome.success) {
      console.error('Turnstile verification failed. Error codes:', outcome['error-codes']);
    }
    return outcome.success;
  } catch (err) {
    console.error('Turnstile verification request failed:', err);
    return false;
  }
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil((async () => {
      console.log('Starting scheduled cron run...');
      try {
        const sources = await fetchSources(env);
        const promises = sources.map(source => syncSource(source, env));
        const results = await Promise.allSettled(promises);

        results.forEach(res => {
          if (res.status === 'fulfilled') {
            console.log(`Synced ${res.value.source_name}: ${res.value.events_upserted} events`);
            if (res.value.error) {
              console.error(`Error syncing ${res.value.source_name}: ${res.value.error}`);
            }
          } else {
            console.error('Promise rejected during sync', res.reason);
          }
        });
      } catch (err) {
        console.error('Core sync failure', err);
      }
    })());
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const corsHeaders = getCorsHeaders(request);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const sourceId = url.searchParams.get('source_id');

    ctx.waitUntil((async () => {
      // Just keep the background processing logic here for standard triggers
    })());

    try {
      if (url.pathname === '/feed.ics') {
        const cache = caches.default;
        const cacheKey = new Request(request.url, {
          method: 'GET',
          headers: {
            'Origin': request.headers.get('Origin') || '*'
          }
        });

        let response = await cache.match(cacheKey);
        if (response) {
          const newHeaders = new Headers(response.headers);
          Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
          return new Response(response.body, {
            status: 200,
            headers: newHeaders
          });
        }

        console.log('Cache miss: Fetching events for iCal feed from Supabase...');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);

        const eventsRes = await fetch(`${env.SUPABASE_URL}/rest/v1/events?expired=eq.false&start_datetime=gte.${startDate.toISOString()}&order=start_datetime.asc&limit=500`, {
          headers: {
            'apikey': env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
          }
        });

        if (!eventsRes.ok) throw new Error(`Events fetch failed for iCal: ${eventsRes.status}`);

        const events = (await eventsRes.json()) as any;
        console.log(`Generating iCal feed with ${events.length} events.`);
        const icalContent = generateIcalFeed(events);

        response = new Response(icalContent, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'inline; filename="community-calendar.ics"',
            'Cache-Control': 'public, max-age=1800'
          }
        });

        // Only cache if we actually have events, to avoid caching a broken/empty state
        if (events.length > 0) {
          ctx.waitUntil(cache.put(cacheKey, response.clone()));
        }
        return response;
      }

      if (url.pathname === '/chat' && request.method === 'POST') {
        try {
          // Rate Limiting using Cloudflare KV (if configured)
          if (env.RATE_LIMIT_KV) {
            const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
            const kvKey = `rate-limit:${clientIp}`;
            const currentCountStr = await env.RATE_LIMIT_KV.get(kvKey);
            const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

            const LIMIT = 10; // 10 requests per minute
            if (currentCount >= LIMIT) {
              return new Response(JSON.stringify({ error: 'Too many requests. Please try again in a minute.' }), {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            // Increment count and set TTL to 60 seconds
            await env.RATE_LIMIT_KV.put(kvKey, (currentCount + 1).toString(), { expirationTtl: 60 });
          }

          const { messages, turnstileToken } = (await request.json()) as { messages: any[]; turnstileToken?: string };
          if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: 'Missing or empty messages array' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Turnstile Validation (skip if TURNSTILE_SECRET_KEY is not configured)
          if (env.TURNSTILE_SECRET_KEY) {
            const clientIp = request.headers.get('CF-Connecting-IP') || undefined;
            const isValid = await verifyTurnstile(turnstileToken || '', env.TURNSTILE_SECRET_KEY, clientIp);
            if (!isValid) {
              return new Response(JSON.stringify({ error: 'Failed bot validation (Turnstile)' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          }

          if (!env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured on the server.');
          }

          const lastMessage = messages[messages.length - 1];
          const userQuery = lastMessage.content;

          // 1. Structured intent analysis using OpenAI LLM
          interface SearchPlan {
            query_type: 'structured' | 'semantic' | 'hybrid';
            time_filter: {
              type: 'relative' | 'absolute' | 'none';
              start: string | null;
              end: string | null;
            };
            constraints: {
              category: string | null;
              after_time: string | null;
            };
            semantic_query: string | null;
          }

          let plan: SearchPlan = {
            query_type: 'semantic',
            time_filter: { type: 'none', start: null, end: null },
            constraints: { category: null, after_time: null },
            semantic_query: userQuery
          };

          try {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: 'America/Chicago',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            const localDateStr = formatter.format(now);

            const plannerPrompt = `Analyze the conversation history and the latest user message. Create a structured search query plan to find calendar events.
Today's local date/time is: ${localDateStr} (timezone: America/Chicago).

Output a JSON object matching this schema:
{
  "query_type": "structured" | "semantic" | "hybrid",
  "time_filter": {
    "type": "relative" | "absolute" | "none",
    "start": "YYYY-MM-DDT00:00:00.000Z" or null,
    "end": "YYYY-MM-DDT23:59:59.999Z" or null
  },
  "constraints": {
    "category": "fundraiser" | "meeting" | "workshop" | "family" | "arts" | "sports" | "community" | "environment" | "professional" | "social" | null,
    "after_time": "HH:MM" or null
  },
  "semantic_query": string or null
}

Rules:
- The category parameter must strictly be null OR exactly one of the allowed categories listed in the schema. Do NOT classify general topics like "ai", "marketing", "contracts", or "volunteer" as the category. Place those terms in "semantic_query" instead.

Latest User Message: ${userQuery}

JSON Query Plan:`;

            const rawText = await callOpenAiChat([
              { role: 'system', content: 'You are a precise search planner that outputs only raw JSON strings.' },
              { role: 'user', content: plannerPrompt }
            ], env.OPENAI_API_KEY);

            if (rawText) {
              let cleanedText = rawText.trim();
              if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```(json)?\s*/i, '').replace(/\s*```$/, '');
              }
              try {
                const parsed = JSON.parse(cleanedText);
                plan = { ...plan, ...parsed };
              } catch (e) {
                console.error('Failed to parse OpenAI search plan:', cleanedText, e);
              }
            }
          } catch (plannerErr) {
            console.error('Failed to run OpenAI query planner:', plannerErr);
          }

          console.log(`QUERY PLAN: ${JSON.stringify(plan)}`);

          // 2. Fetch matching events using the search plan filters and RPC
          let contextText = 'No upcoming matching events found.';
          try {
            let queryEmbedding: number[] | null = null;
            if (plan.query_type !== 'structured' && plan.semantic_query) {
              try {
                queryEmbedding = await getOpenAiEmbedding(plan.semantic_query, env.OPENAI_API_KEY);
              } catch (embedErr) {
                console.error('Failed to generate OpenAI search query embedding:', embedErr);
              }
            }

            const rpcUrl = `${env.SUPABASE_URL}/rest/v1/rpc/search_calendar_events`;
            const rpcParams = {
              query_embedding: queryEmbedding,
              match_threshold: 0.5,
              match_count: 10,
              filter_start: plan.time_filter?.start || null,
              filter_end: plan.time_filter?.end || null,
              filter_category: plan.constraints?.category || null,
              filter_after_time: plan.constraints?.after_time ? `${plan.constraints.after_time}:00` : null
            };

            const supabaseRes = await fetch(rpcUrl, {
              method: 'POST',
              headers: {
                'apikey': env.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(rpcParams)
            });

            if (supabaseRes && supabaseRes.ok) {
              const matchedEvents = (await supabaseRes.json()) as any[];
              if (matchedEvents.length > 0) {
                contextText = matchedEvents.map((ev, idx) => {
                  const dateStr = new Date(ev.start_datetime).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Chicago'
                  });
                  return `Event #${idx + 1}:
Title: ${ev.title}
Organization: ${ev.source_name}
Date/Time: ${dateStr} ${ev.all_day ? '(All Day)' : ''}
Location: ${ev.location || 'Not Specified'}
Description: ${ev.description || 'No description provided.'}
Url: ${ev.url || 'Not available'}
---`;
                }).join('\n\n');
              }
            }
          } catch (dbErr) {
            console.error('Failed to fetch event context for chatbot:', dbErr);
          }

          // 4. Construct System Prompt & Call streaming OpenAI LLM
          const systemPrompt = `You are the RAFV Calendar Assistant. Use the following retrieved events context to answer the user's question. If the events context is empty, state that you couldn't find matching events.
Format your answer clearly, using bullet points for multiple events. Always include dates, times, host organizations, and URLs (if available) for the events. Make sure URLs are output as clickable Markdown links, e.g. [Event Details](url).

Context (Retrieved Events):
${contextText}`;

          const llmMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content
            }))
          ];

          const chatStream = await streamOpenAiChat(llmMessages, env.OPENAI_API_KEY);

          return new Response(chatStream, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          });
        } catch (err: any) {
          console.error('Chat endpoint failed:', err);
          return new Response(JSON.stringify({ error: err.message || 'Chat error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      if (url.pathname === '/search') {
        const query = url.searchParams.get('q');
        if (!query) {
          return new Response(JSON.stringify({ error: 'Missing query parameter q' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log(`Semantic Search Query: ${query}`);
        let embedding: number[] | null = null;
        if (env.OPENAI_API_KEY) {
          try {
            embedding = await getOpenAiEmbedding(query, env.OPENAI_API_KEY);
          } catch (err) {
            console.error('Failed to generate search query embedding via OpenAI:', err);
          }
        }

        if (!embedding) {
          return new Response(JSON.stringify({ error: 'Failed to generate embedding for query' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const supabaseRes = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/search_calendar_events`, {
          method: 'POST',
          headers: {
            'apikey': env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query_embedding: embedding,
            match_threshold: 0.5,
            match_count: 50
          })
        });

        if (!supabaseRes.ok) {
          const errMsg = await supabaseRes.text();
          throw new Error(`Supabase search RPC failed: ${errMsg}`);
        }

        const matchingEvents = await supabaseRes.json();
        return new Response(JSON.stringify(matchingEvents), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60'
          }
        });
      }

      if (url.pathname === '/events') {
        const cache = caches.default;
        const cacheKey = new Request(request.url, {
          method: 'GET',
          headers: {
            'Origin': request.headers.get('Origin') || '*'
          }
        });
        
        let response = await cache.match(cacheKey);
        if (response) {
          const newHeaders = new Headers(response.headers);
          Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
          return new Response(response.body, {
            status: 200,
            headers: newHeaders
          });
        }

        console.log('Cache miss: Fetching events and sources from Supabase...');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [eventsRes, sourcesRes] = await Promise.all([
          fetch(`${env.SUPABASE_URL}/rest/v1/events?expired=eq.false&start_datetime=gte.${today.toISOString()}&order=start_datetime.asc&limit=500`, {
            headers: {
              'apikey': env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
            }
          }),
          fetch(`${env.SUPABASE_URL}/rest/v1/sources?active=eq.true`, {
            headers: {
              'apikey': env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
            }
          })
        ]);

        if (!eventsRes.ok) throw new Error(`Events fetch failed: ${eventsRes.status}`);
        if (!sourcesRes.ok) throw new Error(`Sources fetch failed: ${sourcesRes.status}`);

        const [events, sources] = await Promise.all([eventsRes.json(), sourcesRes.json()]);
        
        const payload = JSON.stringify({ events, sources });
        response = new Response(payload, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=600'
          }
        });

        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      }

      if (sourceId) {
        console.log(`Starting targeted sync for source ${sourceId}...`);

        let debugLogs: string[] = [];
        const originalLog = console.log;
        const originalError = console.error;
        console.log = (...args) => { debugLogs.push(args.join(' ')); originalLog(...args); };
        console.error = (...args) => { debugLogs.push(`ERROR: ${args.join(' ')}`); originalError(...args); };

        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/sources?id=eq.${sourceId}`, {
          headers: {
            'apikey': env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`
          }
        });
        if (!res.ok) throw new Error(`Supabase source fetch failed: ${res.status}`);
        const sources: any[] = await res.json();

        if (sources && sources.length > 0) {
          const result = await syncSource(sources[0] as Source, env);
          // Restore console
          console.log = originalLog;
          console.error = originalError;

          return new Response(JSON.stringify({ ...result, debug: debugLogs }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return new Response('Source not found', { status: 404, headers: corsHeaders });
      } else {
        // Trigger global sync
        const sources = await fetchSources(env);
        const results = await Promise.all(sources.map(source => syncSource(source, env)));
        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (err: any) {
      console.error('Manual fetch sync failed:', err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
