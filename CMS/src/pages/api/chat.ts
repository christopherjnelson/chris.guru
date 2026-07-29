import type { APIRoute } from 'astro';
import {
  ChatProxyError,
  ndjsonErrorResponse,
  proxyChatStream,
} from '../../lib/chat-proxy.mjs';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { message, sessionId } = await request.json();

    if (typeof message !== 'string' || !message.trim()) {
      return ndjsonErrorResponse('No message provided.', 400);
    }

    const webhookUrl = import.meta.env.N8N_CHAT_WEBHOOK;

    if (!webhookUrl) {
      return ndjsonErrorResponse('Chat is not configured.', 503);
    }

    return await proxyChatStream({
      webhookUrl,
      message: message.trim(),
      sessionId,
      clientSignal: request.signal,
    });
  } catch (error) {
    const status = error instanceof ChatProxyError ? error.status : 500;
    return ndjsonErrorResponse(
      "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
      status
    );
  }
};
