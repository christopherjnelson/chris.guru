const encoder = new TextEncoder();

export class JsonValueStreamParser {
  constructor() {
    this.buffer = '';
    this.index = 0;
    this.start = -1;
    this.depth = 0;
    this.inString = false;
    this.escaped = false;
  }

  /**
   * Parse complete JSON objects or arrays from a text fragment.
   *
   * @param {string} fragment
   * @returns {unknown[]}
   */
  push(fragment) {
    this.buffer += fragment;
    const values = [];

    while (this.index < this.buffer.length) {
      const character = this.buffer[this.index];

      if (this.start === -1) {
        if (/\s/.test(character)) {
          this.index += 1;
          continue;
        }

        if (character !== '{' && character !== '[') {
          throw new SyntaxError('Expected a JSON object or array');
        }

        this.start = this.index;
        this.depth = 1;
        this.index += 1;
        continue;
      }

      if (this.inString) {
        if (this.escaped) {
          this.escaped = false;
        } else if (character === '\\') {
          this.escaped = true;
        } else if (character === '"') {
          this.inString = false;
        }
      } else if (character === '"') {
        this.inString = true;
      } else if (character === '{' || character === '[') {
        this.depth += 1;
      } else if (character === '}' || character === ']') {
        this.depth -= 1;
      }

      this.index += 1;

      if (this.depth === 0) {
        const rawValue = this.buffer.slice(this.start, this.index);
        values.push(JSON.parse(rawValue));
        this.buffer = this.buffer.slice(this.index);
        this.index = 0;
        this.start = -1;
        this.inString = false;
        this.escaped = false;
      }
    }

    return values;
  }

  finish() {
    if (this.start !== -1 || this.buffer.trim()) {
      throw new SyntaxError('Incomplete JSON value in chat stream');
    }
  }
}

/**
 * Convert n8n streaming events and the previous buffered response into the
 * stable event format exposed by /api/chat.
 *
 * @param {unknown} value
 * @returns {Array<
 *   { type: 'delta', text: string } |
 *   { type: 'done' } |
 *   { type: 'error', message: string }
 * >}
 */
export function normalizeN8nValue(value) {
  if (Array.isArray(value)) {
    return value.flatMap(normalizeN8nValue);
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  if (value.type === 'begin') {
    return [];
  }

  if (value.type === 'item' && typeof value.content === 'string') {
    return [{ type: 'delta', text: value.content }];
  }

  if (value.type === 'end') {
    // n8n emits an end event for each internal agent phase, including tool
    // calls. The upstream HTTP body closing is the public completion signal.
    return [];
  }

  if (value.type === 'error') {
    const message =
      typeof value.message === 'string'
        ? value.message
        : 'The response stream ended unexpectedly.';
    return [{ type: 'error', message }];
  }

  const legacyReply =
    typeof value.reply === 'string'
      ? value.reply
      : typeof value.output === 'string'
        ? value.output
        : typeof value.message === 'string'
          ? value.message
          : null;

  if (legacyReply !== null) {
    return [
      { type: 'delta', text: legacyReply },
      { type: 'done' },
    ];
  }

  return [];
}

export function encodeChatEvent(event) {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

/**
 * Normalize an n8n response body while preserving incremental delivery.
 *
 * @param {ReadableStream<Uint8Array>} upstreamBody
 * @param {{
 *   onCancel?: (reason?: unknown) => void,
 *   onFinish?: (reason: 'complete' | 'error' | 'cancel') => void,
 *   errorMessage?: string
 * }} options
 */
export function createNormalizedChatStream(upstreamBody, options = {}) {
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  const parser = new JsonValueStreamParser();
  let terminalEventSent = false;
  let finished = false;

  const finish = (reason) => {
    if (finished) return;
    finished = true;
    options.onFinish?.(reason);
  };

  const emitValues = (values, controller) => {
    let emitted = 0;

    for (const value of values) {
      for (const event of normalizeN8nValue(value)) {
        if (terminalEventSent) return emitted;
        controller.enqueue(encodeChatEvent(event));
        emitted += 1;
        if (event.type === 'done' || event.type === 'error') {
          terminalEventSent = true;
        }
      }
    }

    return emitted;
  };

  return new ReadableStream({
    async pull(controller) {
      try {
        while (!terminalEventSent) {
          const { done, value } = await reader.read();

          if (done) {
            emitValues(parser.push(decoder.decode()), controller);
            parser.finish();
            if (!terminalEventSent) {
              controller.enqueue(encodeChatEvent({ type: 'done' }));
            }
            controller.close();
            finish('complete');
            return;
          }

          const emitted = emitValues(
            parser.push(decoder.decode(value, { stream: true })),
            controller
          );

          if (terminalEventSent) {
            await reader.cancel('Terminal chat event received');
            controller.close();
            finish('complete');
            return;
          }

          if (emitted > 0) return;
        }
      } catch {
        if (!terminalEventSent) {
          controller.enqueue(
            encodeChatEvent({
              type: 'error',
              message:
                options.errorMessage ??
                'The response stream ended unexpectedly.',
            })
          );
        }
        controller.close();
        finish('error');
      }
    },
    async cancel(reason) {
      options.onCancel?.(reason);
      try {
        await reader.cancel(reason);
      } finally {
        finish('cancel');
      }
    },
  });
}

export function ndjsonErrorResponse(message, status = 500) {
  return new Response(encodeChatEvent({ type: 'error', message }), {
    status,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
