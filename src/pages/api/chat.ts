import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { message } = await request.json();

    if (!message) {
      return new Response(
        JSON.stringify({ reply: 'No message provided.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = import.meta.env.N8N_CHAT_WEBHOOK;

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput: message }),
    });

    if (!res.ok) {
      throw new Error(`n8n responded with ${res.status}`);
    }

    const data = await res.json();

    // n8n may return the reply in various shapes — handle common ones
    const reply =
      data.reply ??
      data.output ??
      data.message ??
      (typeof data === 'string' ? data : "I'm not sure how to respond to that.");

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        reply: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};