import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const webhookUrl = import.meta.env.N8N_CHAT_WEBHOOK;
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  if (!webhookUrl) {
    return new Response(
      JSON.stringify({ status: 'offline' }),
      { status: 200, headers }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heartbeat: true }),
      signal: controller.signal,
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.status === 'online') {
        return new Response(
          JSON.stringify({ status: 'online' }),
          { status: 200, headers }
        );
      }
    }

    return new Response(
      JSON.stringify({ status: 'offline' }),
      { status: 200, headers }
    );
  } catch {
    return new Response(
      JSON.stringify({ status: 'offline' }),
      { status: 200, headers }
    );
  } finally {
    clearTimeout(timeout);
  }
};
