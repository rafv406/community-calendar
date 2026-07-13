const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

export async function getOpenAiEmbedding(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(`${NVIDIA_BASE}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'nvidia/llama-nemotron-embed-1b-v2',
      input: text,
      input_type: 'query'
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NVIDIA Embedding failed: ${errText}`);
  }

  const payload = (await res.json()) as any;
  const embedding = payload.data[0].embedding;
  return embedding.slice(0, 384);
}

export async function getOpenAiEmbeddingBatch(texts: string[], apiKey: string): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await fetch(`${NVIDIA_BASE}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'nvidia/llama-nemotron-embed-1b-v2',
      input: texts,
      input_type: 'passage'
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NVIDIA Batch Embedding failed: ${errText}`);
  }

  const payload = (await res.json()) as any;
  return payload.data.map((item: any) => item.embedding.slice(0, 384));
}

export async function callOpenAiChat(
  messages: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<string> {
  // Convert system messages to user messages for NVIDIA models
  const converted = messages.map((m, i) => ({
    role: i === 0 && m.role === 'system' ? 'user' : m.role,
    content: m.content
  }));

  const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta/llama-3.1-8b-instruct',
      messages: converted,
      temperature: 0.1,
      max_tokens: 1024
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NVIDIA Chat failed: ${errText}`);
  }

  const payload = (await res.json()) as any;
  return payload.choices[0].message.content || '';
}

export async function streamOpenAiChat(
  messages: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<ReadableStream> {
  // Convert system messages to user messages for NVIDIA models
  const converted = messages.map((m, i) => ({
    role: i === 0 && m.role === 'system' ? 'user' : m.role,
    content: m.content
  }));

  const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta/llama-3.1-8b-instruct',
      messages: converted,
      temperature: 0.2,
      max_tokens: 1024,
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
