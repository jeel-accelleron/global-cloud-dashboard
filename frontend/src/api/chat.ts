import { api, API_BASE } from './client';

export interface ChatJsonResponse {
  response: string;
  session_id: string;
  model?: string;
  timestamp?: string;
}

export async function sendChat(
  message: string,
  sessionId?: string
): Promise<ChatJsonResponse> {
  const { data } = await api.post<ChatJsonResponse>('/copilot/chat/', {
    message,
    session_id: sessionId,
  });
  return data;
}

export async function clearChat(sessionId: string) {
  return api.post('/copilot/chat/clear/', { session_id: sessionId });
}

/**
 * Stream a chat reply via SSE.
 * Calls onChunk for each token, returns the final session id (if provided in headers/body)
 * along with the accumulated response text.
 */
export async function streamChat(
  message: string,
  sessionId: string | undefined,
  onChunk: (delta: string, accumulated: string) => void,
  signal?: AbortSignal
): Promise<{ sessionId?: string; full: string }> {
  const res = await fetch(`${API_BASE}/copilot/chat/stream/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Stream failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let outSession: string | undefined = sessionId;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE messages separated by blank line
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const dataLines = part
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim());
      if (!dataLines.length) continue;
      const payload = dataLines.join('\n');
      if (!payload || payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload);
        if (typeof obj.content === 'string' && obj.content.length) {
          full += obj.content;
          onChunk(obj.content, full);
        }
        if (obj.session_id) outSession = obj.session_id;
        if (obj.error) throw new Error(obj.error);
      } catch (e) {
        // Tolerate non-JSON keep-alive lines
        if (payload.startsWith('{')) throw e;
      }
    }
  }

  return { sessionId: outSession, full };
}
