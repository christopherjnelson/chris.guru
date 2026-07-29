import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ChatProxyError,
  proxyChatStream,
} from '../src/lib/chat-proxy.mjs';
import { JsonValueStreamParser } from '../src/lib/chat-stream.mjs';

const encoder = new TextEncoder();

async function responseEvents(response) {
  const parser = new JsonValueStreamParser();
  const events = parser.push(await response.text());
  parser.finish();
  return events;
}

test('proxies the expected request and returns normalized NDJSON', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('{"type":"item","content":"Hello"}\n')
          );
          controller.enqueue(encoder.encode('{"type":"end"}\n'));
          controller.close();
        },
      }),
      { status: 200 }
    );
  };

  const response = await proxyChatStream({
    webhookUrl: 'https://example.com/chat',
    message: 'Hi',
    sessionId: 'session-1',
    fetchImpl,
  });

  assert.equal(request.url, 'https://example.com/chat');
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), {
    chatInput: 'Hi',
    sessionId: 'session-1',
  });
  assert.equal(
    response.headers.get('content-type'),
    'application/x-ndjson; charset=utf-8'
  );
  assert.equal(response.headers.get('x-accel-buffering'), 'no');
  assert.deepEqual(await responseEvents(response), [
    { type: 'delta', text: 'Hello' },
    { type: 'done' },
  ]);
});

test('keeps the timeout active until the response stream completes', async () => {
  let upstreamSignal;
  const fetchImpl = async (_url, options) => {
    upstreamSignal = options.signal;
    return new Response(
      new ReadableStream({
        start(controller) {
          options.signal.addEventListener(
            'abort',
            () => controller.error(options.signal.reason),
            { once: true }
          );
        },
      })
    );
  };

  const response = await proxyChatStream({
    webhookUrl: 'https://example.com/chat',
    message: 'Wait',
    fetchImpl,
    timeoutMs: 10,
  });

  assert.deepEqual(await responseEvents(response), [
    {
      type: 'error',
      message: 'The response stream ended unexpectedly.',
    },
  ]);
  assert.equal(upstreamSignal.aborted, true);
});

test('clears the timeout after normal stream completion', async () => {
  let upstreamSignal;
  const fetchImpl = async (_url, options) => {
    upstreamSignal = options.signal;
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('{"type":"end"}'));
          controller.close();
        },
      })
    );
  };

  const response = await proxyChatStream({
    webhookUrl: 'https://example.com/chat',
    message: 'Done',
    fetchImpl,
    timeoutMs: 10,
  });
  await response.text();
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(upstreamSignal.aborted, false);
});

test('cancels the upstream request when the response consumer disconnects', async () => {
  let upstreamSignal;
  let upstreamCancelled = false;
  const fetchImpl = async (_url, options) => {
    upstreamSignal = options.signal;
    return new Response(
      new ReadableStream({
        cancel() {
          upstreamCancelled = true;
        },
      })
    );
  };

  const response = await proxyChatStream({
    webhookUrl: 'https://example.com/chat',
    message: 'Cancel',
    fetchImpl,
  });
  await response.body.cancel('browser disconnected');

  assert.equal(upstreamSignal.aborted, true);
  assert.equal(upstreamCancelled, true);
});

test('rejects unsuccessful upstream responses', async () => {
  await assert.rejects(
    proxyChatStream({
      webhookUrl: 'https://example.com/chat',
      message: 'Fail',
      fetchImpl: async () => new Response('unavailable', { status: 503 }),
    }),
    (error) =>
      error instanceof ChatProxyError &&
      error.status === 502 &&
      error.message === 'n8n responded with 503'
  );
});
