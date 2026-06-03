import { Source, NormalizedEvent, SyncResult } from './types';
import { parseICalFeed } from './parsers/ical';
import { parseRssFeed } from './parsers/rss';
import { upsertEvents, updateSourceStatus, expireStaleEvents, Env } from './db';
import { generateIcalFeed } from './ical-generator';
import { aiCategorizeAndEmbed, aiEnrichEventsBatch } from './normalize';

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
        aiEvents = await aiEnrichEventsBatch(uniqueEvents, env.AI);
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
          const { messages } = (await request.json()) as { messages: any[] };
          if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: 'Missing or empty messages array' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const lastMessage = messages[messages.length - 1];
          const userQuery = lastMessage.content;

          // 1. Structured intent analysis using LLM
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

          if (env.AI) {
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
    "start": "YYYY-MM-DDT00:00:00.000Z" or null, // Resolve relative times like "tomorrow" or "this weekend" relative to today. For generic "upcoming" queries (without a specific timeframe), set start to today's date at 00:00:00.000Z.
    "end": "YYYY-MM-DDT23:59:59.999Z" or null // Only set if a specific end timeframe is requested (like "this weekend" or "this month"). For generic "upcoming" queries, set to null.
  },
  "constraints": {
    "category": "fundraiser" | "meeting" | "workshop" | "family" | "arts" | "community" | "professional" | "social" | "technology" | "ai" | null, // The category must strictly be null OR exactly one of these allowed values. If the user asks about any category or topic that is not in this list (such as "volunteer", "contracts", "ethics"), set category to null and place the term in "semantic_query" instead.
    "after_time": "HH:MM" or null // E.g. "17:00" if they ask for events after 5pm, otherwise null
  },
  "semantic_query": string or null // The topic/keywords to search for (e.g. "ethics", "contracts", "volunteer"). Exclude date and time constraint phrases. Set to null for pure structured queries.
}

Rules:
- For generic queries like "what events are coming up?" or "what's happening?", set query_type to "structured", time_filter to {"type": "none", "start": "today's timestamp at 00:00:00.000Z", "end": null}. Do NOT guess or set an end date unless explicitly restricted (e.g., "this week").
- The "category" field MUST ONLY contain one of the exact allowed values: fundraiser, meeting, workshop, family, arts, community, professional, social, technology, ai. Do not set "category" to custom words like "volunteer". Instead, put "volunteer" in "semantic_query" and classify query_type as "semantic" or "hybrid".

Examples:
- "What events are coming up?" -> {"query_type": "structured", "time_filter": {"type": "none", "start": "today's date at 00:00:00.000Z", "end": null}, "constraints": {"category": null, "after_time": null}, "semantic_query": null}
- "What's happening this weekend?" -> {"query_type": "structured", "time_filter": {"type": "relative", "start": "upcoming Saturday timestamp", "end": "upcoming Sunday timestamp"}, "constraints": {"category": null, "after_time": null}, "semantic_query": null}
- "ethics and contract rules" -> {"query_type": "semantic", "time_filter": {"type": "none", "start": null, "end": null}, "constraints": {"category": null, "after_time": null}, "semantic_query": "ethics contracts"}
- "Show networking events this month" -> {"query_type": "hybrid", "time_filter": {"type": "relative", "start": "start of month", "end": "end of month"}, "constraints": {"category": "professional", "after_time": null}, "semantic_query": "networking"}

Do not write explanations, markdown syntax, or formatting—output ONLY the raw JSON string.

Conversation History:
${messages.slice(0, -1).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}

Latest User Message: ${userQuery}

JSON Query Plan:`;

              const plannerRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
                prompt: plannerPrompt
              });

              if (plannerRes && plannerRes.response) {
                let rawText = plannerRes.response.trim();
                if (rawText.startsWith('```')) {
                  rawText = rawText.replace(/^```(json)?\s*/i, '').replace(/\s*```$/, '');
                }
                try {
                  const parsed = JSON.parse(rawText);
                  plan = { ...plan, ...parsed };
                } catch (e) {
                  console.error('Failed to parse LLM search plan:', rawText, e);
                }
              }
            } catch (plannerErr) {
              console.error('Failed to run query planner:', plannerErr);
            }
          }

          console.log(`QUERY PLAN: ${JSON.stringify(plan)}`);

          // 2. Fetch matching events using the search plan filters and RPC
          let contextText = 'No upcoming matching events found.';
          try {
            let queryEmbedding: number[] | null = null;
            if (env.AI && plan.query_type !== 'structured' && plan.semantic_query) {
              try {
                const embedRes = await env.AI.run('@cf/baai/bge-small-en-v1.5', {
                  text: [plan.semantic_query]
                });
                if (embedRes && embedRes.data && embedRes.data[0]) {
                  queryEmbedding = embedRes.data[0];
                }
              } catch (embedErr) {
                console.error('Failed to generate search query embedding:', embedErr);
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

            console.log(`Chatbot: Executing search RPC: ${JSON.stringify(rpcParams)}`);
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

          // 4. Construct System Prompt & Call streaming LLM
          const systemPrompt = `You are the RAFV Calendar Assistant, a helpful AI chatbot for the Realtors Association of the Fox Valley Community Calendar.
Your primary role is to answer questions about events, classes, meetings, and activities in the Fox Valley area.

Use the following retrieved events context to answer the user's question. If the events context is empty, state that you couldn't find matching events.
Format your answer clearly, using bullet points for multiple events. Always include dates, times, host organizations, and URLs (if available) for the events. Make sure URLs are output as clickable Markdown links, e.g. [Event Details](url).

Context (Retrieved Events):
${contextText}

Instructions:
- Be polite, professional, and concise.
- Base your answers ONLY on the retrieved events. Do not invent details.
- If the user asks about an event not in the context, politely state you don't have information about it.
- Keep answers formatted in clean markdown.`;

          const llmMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content
            }))
          ];

          const chatStream = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
            messages: llmMessages,
            stream: true
          });

          // Translate Cloudflare's data: {"response": "..."} format to raw text stream
          const { readable, writable } = new TransformStream();
          const writer = writable.getWriter();
          const reader = chatStream.getReader();
          const encoder = new TextEncoder();
          const decoder = new TextDecoder();
          let buffer = '';

          ctx.waitUntil((async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const cleaned = line.trim();
                  if (cleaned.startsWith('data:')) {
                    const dataStr = cleaned.slice(5).trim();
                    if (dataStr === '[DONE]') continue;
                    try {
                      const parsed = JSON.parse(dataStr);
                      if (parsed.response) {
                        await writer.write(encoder.encode(parsed.response));
                      }
                    } catch (e) {}
                  }
                }
              }
              if (buffer.trim().startsWith('data:')) {
                const dataStr = buffer.trim().slice(5).trim();
                if (dataStr !== '[DONE]') {
                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.response) {
                      await writer.write(encoder.encode(parsed.response));
                    }
                  } catch (e) {}
                }
              }
            } catch (e) {
              console.error('Error while processing chat stream:', e);
            } finally {
              await writer.close();
            }
          })());

          return new Response(readable, {
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
        if (env.AI) {
          try {
            const embedRes = await env.AI.run('@cf/baai/bge-small-en-v1.5', {
              text: [query]
            });
            if (embedRes && embedRes.data && embedRes.data[0]) {
              embedding = embedRes.data[0];
            }
          } catch (err) {
            console.error('Failed to generate search query embedding:', err);
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
