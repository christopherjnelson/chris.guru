import assert from 'node:assert/strict';
import test from 'node:test';

import { isWebhookOnline } from '../src/lib/webhook-health.mjs';

test('reports online for the expected successful health response', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ status: 'online' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const online = await isWebhookOnline(
    'https://example.com/health',
    fetchImpl
  );

  assert.equal(online, true);
  assert.equal(request.url, 'https://example.com/health');
  assert.equal(request.options.method, 'GET');
  assert.equal(request.options.body, undefined);
});

test('reports offline when the health webhook is not configured', async () => {
  let called = false;
  const fetchImpl = async () => {
    called = true;
    return new Response();
  };

  assert.equal(await isWebhookOnline(undefined, fetchImpl), false);
  assert.equal(called, false);
});

test('reports offline for a malformed health response', async () => {
  const fetchImpl = async () =>
    new Response('not-json', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });

  assert.equal(
    await isWebhookOnline('https://example.com/health', fetchImpl),
    false
  );
});

test('reports offline for an unsuccessful health response', async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ status: 'online' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });

  assert.equal(
    await isWebhookOnline('https://example.com/health', fetchImpl),
    false
  );
});

test('reports offline when the health request times out', async () => {
  const fetchImpl = async (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener(
        'abort',
        () => reject(new DOMException('Aborted', 'AbortError')),
        { once: true }
      );
    });

  assert.equal(
    await isWebhookOnline('https://example.com/health', fetchImpl, 10),
    false
  );
});
