import {
  createNormalizedChatStream,
  ndjsonErrorResponse,
} from './chat-stream.mjs';

export class ChatProxyError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'ChatProxyError';
    this.status = status;
  }
}

/**
 * Start and proxy a streaming n8n chat request.
 *
 * @param {{
 *   webhookUrl: string,
 *   message: string,
 *   sessionId?: string,
 *   fetchImpl?: typeof fetch,
 *   timeoutMs?: number,
 *   clientSignal?: AbortSignal
 * }} options
 */
export async function proxyChatStream({
  webhookUrl,
  message,
  sessionId,
  fetchImpl = fetch,
  timeoutMs = 30_000,
  clientSignal,
}) {
  const upstreamController = new AbortController();
  let cleanedUp = false;
  const timeout = setTimeout(
    () => upstreamController.abort(new DOMException('Timed out', 'AbortError')),
    timeoutMs
  );
  const abortForClient = () =>
    upstreamController.abort(
      clientSignal?.reason ?? new DOMException('Client disconnected', 'AbortError')
    );

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearTimeout(timeout);
    clientSignal?.removeEventListener('abort', abortForClient);
  };

  if (clientSignal?.aborted) {
    abortForClient();
  } else {
    clientSignal?.addEventListener('abort', abortForClient, { once: true });
  }

  try {
    const upstream = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput: message, sessionId }),
      signal: upstreamController.signal,
    });

    if (!upstream.ok) {
      throw new ChatProxyError(`n8n responded with ${upstream.status}`);
    }

    if (!upstream.body) {
      throw new ChatProxyError('n8n returned an empty response body');
    }

    const body = createNormalizedChatStream(upstream.body, {
      errorMessage: 'The response stream ended unexpectedly.',
      onCancel: () =>
        upstreamController.abort(
          new DOMException('Client disconnected', 'AbortError')
        ),
      onFinish: cleanup,
    });

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    cleanup();
    if (error instanceof ChatProxyError) throw error;
    throw new ChatProxyError('Unable to connect to n8n');
  }
}

export { ndjsonErrorResponse };
