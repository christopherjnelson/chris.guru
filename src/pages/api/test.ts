import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify({ status: 'Node SSR is active' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};