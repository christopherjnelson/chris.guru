import type { APIRoute } from 'astro';
import { isWebhookOnline } from '../../lib/webhook-health.mjs';

export const GET: APIRoute = async () => {
  const webhookUrl = import.meta.env.N8N_HEALTH_WEBHOOK;
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };
  const online = await isWebhookOnline(webhookUrl);

  return new Response(
    JSON.stringify({ status: online ? 'online' : 'offline' }),
    { status: 200, headers }
  );
};
