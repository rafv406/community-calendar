export async function getOpenAiEmbedding(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 384
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI Embedding failed: ${errText}`);
  }

  const payload = (await res.json()) as any;
  return payload.data[0].embedding;
}

export async function getOpenAiEmbeddingBatch(texts: string[], apiKey: string): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 384
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI Batch Embedding failed: ${errText}`);
  }

  const payload = (await res.json()) as any;
  return payload.data.map((item: any) => item.embedding);
}

export async function callOpenAiChat(
  messages: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.1
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI Chat failed: ${errText}`);
  }

  const payload = (await res.json()) as any;
  return payload.choices[0].message.content || '';
}

export async function streamOpenAiChat(
  messages: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<ReadableStream> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.2,
      stream: true
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI Chat stream request failed: ${errText}`);
  }

  if (!res.body) {
    throw new Error('OpenAI response has no body');
  }

  // Parse SSE format and stream only raw text content chunks
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const cleaned = line.trim();
            if (!cleaned) continue;
            if (cleaned.startsWith('data:')) {
              const dataStr = cleaned.slice(5).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch (e) {
                // Ignore line parse errors (e.g. partial lines)
              }
            }
          }
        }

        // Process anything remaining in the buffer
        const remaining = buffer.trim();
        if (remaining && remaining.startsWith('data:')) {
          const dataStr = remaining.slice(5).trim();
          if (dataStr !== '[DONE]') {
            try {
              const parsed = JSON.parse(dataStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    }
  });
}
