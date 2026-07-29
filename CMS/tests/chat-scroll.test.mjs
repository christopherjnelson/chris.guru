import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMessageStartAnchor,
  scrollAfterMessage,
  scrollMessageToStart,
  scrollToBottom,
} from '../src/lib/chat-scroll.mjs';

function createContainer(overrides = {}) {
  return {
    scrollTop: 0,
    scrollHeight: 900,
    clientHeight: 320,
    getBoundingClientRect: () => ({ top: 100 }),
    ...overrides,
  };
}

test('scrolls user messages and typing state to the bottom', () => {
  const userContainer = createContainer();
  scrollAfterMessage(
    userContainer,
    { getBoundingClientRect: () => ({ top: 500 }) },
    'user'
  );
  assert.equal(userContainer.scrollTop, 900);

  const typingContainer = createContainer({ scrollHeight: 640 });
  scrollToBottom(typingContainer);
  assert.equal(typingContainer.scrollTop, 640);
});

test('anchors a bot response at the start of the viewport', () => {
  const container = createContainer({ scrollTop: 140 });
  const message = { getBoundingClientRect: () => ({ top: 420 }) };

  scrollAfterMessage(container, message, 'bot');

  assert.equal(container.scrollTop, 444);
});

test('clamps invalid and negative scroll targets', () => {
  const negativeContainer = createContainer({ scrollTop: 5 });
  scrollMessageToStart(
    negativeContainer,
    { getBoundingClientRect: () => ({ top: 40 }) }
  );
  assert.equal(negativeContainer.scrollTop, 0);

  const invalidContainer = createContainer({
    scrollTop: Number.NaN,
    scrollHeight: Number.NaN,
    clientHeight: Number.NaN,
    getBoundingClientRect: () => ({ top: Number.NaN }),
  });
  scrollMessageToStart(
    invalidContainer,
    { getBoundingClientRect: () => ({ top: Number.NaN }) }
  );
  assert.equal(invalidContainer.scrollTop, 0);
});

test('does not install ongoing forced scrolling after positioning a bot reply', () => {
  const container = createContainer({ scrollTop: 50 });
  const message = { getBoundingClientRect: () => ({ top: 300 }) };

  scrollAfterMessage(container, message, 'bot');
  assert.equal(container.scrollTop, 234);

  container.scrollTop = 175;
  container.scrollHeight = 1_200;

  assert.equal(container.scrollTop, 175);
});

test('anchors a growing streamed reply only once', () => {
  const container = createContainer({ scrollTop: 80 });
  const message = { getBoundingClientRect: () => ({ top: 340 }) };
  const anchor = createMessageStartAnchor(container, message);

  assert.equal(anchor(), true);
  assert.equal(container.scrollTop, 304);

  container.scrollTop = 190;
  container.scrollHeight = 1_400;

  assert.equal(anchor(), false);
  assert.equal(container.scrollTop, 190);
});
