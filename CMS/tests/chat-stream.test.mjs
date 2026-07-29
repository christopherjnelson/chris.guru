import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createNormalizedChatStream,
  JsonValueStreamParser,
} from '../src/lib/chat-stream.mjs';

const encoder = new TextEncoder();

function streamFromChunks(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(
          typeof chunk === 'string' ? encoder.encode(chunk) : chunk
        );
      }
      controller.close();
    },
  });
}

async function readEvents(stream) {
  const parser = new JsonValueStreamParser();
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  const events = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    events.push(...parser.push(decoder.decode(value, { stream: true })));
  }

  events.push(...parser.push(decoder.decode()));
  parser.finish();
  return events;
}

test('parses JSON values split and combined across arbitrary fragments', () => {
  const parser = new JsonValueStreamParser();

  assert.deepEqual(parser.push(' \n{"type":"it'), []);
  assert.deepEqual(
    parser.push('em","content":"braces: {[]}"}\n{"type":"end"}'),
    [
      { type: 'item', content: 'braces: {[]}' },
      { type: 'end' },
    ]
  );
  parser.finish();
});

test('normalizes incremental n8n chunks without buffering them together', async () => {
  const unicodeEvent = encoder.encode(
    '{"type":"item","content":" Ziggy 🚀"}\n'
  );
  const splitAt = unicodeEvent.length - 4;
  const upstream = streamFromChunks([
    '{"type":"begin"}\n{"type":"item","content":"**Hello**"}\n',
    unicodeEvent.slice(0, splitAt),
    unicodeEvent.slice(splitAt),
    '{"type":"end"}\n',
  ]);
  const normalized = createNormalizedChatStream(upstream);
  const reader = normalized.getReader();
  const decoder = new TextDecoder();
  const parser = new JsonValueStreamParser();

  const first = await reader.read();
  assert.equal(first.done, false);
  assert.deepEqual(
    parser.push(decoder.decode(first.value, { stream: true })),
    [{ type: 'delta', text: '**Hello**' }]
  );

  const remaining = [];
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    remaining.push(
      ...parser.push(decoder.decode(result.value, { stream: true }))
    );
  }
  remaining.push(...parser.push(decoder.decode()));
  parser.finish();

  assert.deepEqual(remaining, [
    { type: 'delta', text: ' Ziggy 🚀' },
    { type: 'done' },
  ]);
});

test('delivers the first event before a delayed upstream chunk arrives', async () => {
  let upstreamController;
  const upstream = new ReadableStream({
    start(controller) {
      upstreamController = controller;
      controller.enqueue(
        encoder.encode('{"type":"item","content":"First"}\n')
      );
    },
  });
  const normalized = createNormalizedChatStream(upstream);
  const reader = normalized.getReader();
  const parser = new JsonValueStreamParser();
  const decoder = new TextDecoder();

  const first = await reader.read();
  assert.deepEqual(
    parser.push(decoder.decode(first.value, { stream: true })),
    [{ type: 'delta', text: 'First' }]
  );

  upstreamController.enqueue(
    encoder.encode('{"type":"item","content":" second"}\n{"type":"end"}\n')
  );
  upstreamController.close();

  const second = await reader.read();
  assert.deepEqual(
    parser.push(decoder.decode(second.value, { stream: true })),
    [{ type: 'delta', text: ' second' }]
  );

  const completion = await reader.read();
  assert.deepEqual(
    parser.push(decoder.decode(completion.value, { stream: true })),
    [{ type: 'done' }]
  );
  assert.equal((await reader.read()).done, true);
  parser.finish();
});

test('emits an error event for malformed or incomplete upstream data', async () => {
  const malformed = createNormalizedChatStream(
    streamFromChunks(['{"type":"item","content":"unfinished"'])
  );

  assert.deepEqual(await readEvents(malformed), [
    {
      type: 'error',
      message: 'The response stream ended unexpectedly.',
    },
  ]);
});

test('adds completion for an upstream stream that closes without an end event', async () => {
  const normalized = createNormalizedChatStream(
    streamFromChunks(['{"type":"item","content":"Complete enough"}\n'])
  );

  assert.deepEqual(await readEvents(normalized), [
    { type: 'delta', text: 'Complete enough' },
    { type: 'done' },
  ]);
});

test('normalizes the previous buffered reply shape for rollout safety', async () => {
  const normalized = createNormalizedChatStream(
    streamFromChunks(['{"reply":"Legacy **Markdown**"}'])
  );

  assert.deepEqual(await readEvents(normalized), [
    { type: 'delta', text: 'Legacy **Markdown**' },
    { type: 'done' },
  ]);
});

test('handles an empty normal completion', async () => {
  const normalized = createNormalizedChatStream(
    streamFromChunks(['{"type":"begin"}\n{"type":"end"}\n'])
  );

  assert.deepEqual(await readEvents(normalized), [{ type: 'done' }]);
});
