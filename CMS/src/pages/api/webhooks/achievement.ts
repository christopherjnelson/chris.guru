import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  // Verify authorization header
  const authHeader = request.headers.get('Authorization');
  const expectedSecret = import.meta.env.WEBHOOK_SECRET;

  if (!authHeader || authHeader !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse the incoming JSON body
  let body: { title?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { title, content } = body;

  // Validate required fields
  if (!title || !content) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: title and content' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Insert the new achievement into the posts table
  const { error } = await supabase
    .from('posts')
    .insert({ title, content, type: 'achievement' });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to insert achievement', details: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};