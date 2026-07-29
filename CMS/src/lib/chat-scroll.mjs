const DEFAULT_TOP_INSET = 16;

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Scroll a chat container to its last available pixel.
 *
 * @param {{ scrollTop: number, scrollHeight: number }} container
 */
export function scrollToBottom(container) {
  container.scrollTop = Math.max(0, finiteNumber(container.scrollHeight));
}

/**
 * Position a message at the beginning of the chat viewport without installing
 * any ongoing scroll behavior.
 *
 * @param {{
 *   scrollTop: number,
 *   scrollHeight: number,
 *   clientHeight: number,
 *   getBoundingClientRect: () => { top: number }
 * }} container
 * @param {{ getBoundingClientRect: () => { top: number } }} message
 * @param {number} topInset
 */
export function scrollMessageToStart(
  container,
  message,
  topInset = DEFAULT_TOP_INSET
) {
  const currentTop = finiteNumber(container.scrollTop);
  const containerTop = finiteNumber(container.getBoundingClientRect().top);
  const messageTop = finiteNumber(
    message.getBoundingClientRect().top,
    containerTop
  );
  const inset = Math.max(0, finiteNumber(topInset, DEFAULT_TOP_INSET));
  const maxScrollTop = Math.max(
    0,
    finiteNumber(container.scrollHeight) - finiteNumber(container.clientHeight)
  );
  const target = currentTop + messageTop - containerTop - inset;

  container.scrollTop = Math.min(maxScrollTop, Math.max(0, target));
}

/**
 * Apply the one-time scroll policy for a newly appended chat message.
 *
 * @param {Parameters<typeof scrollMessageToStart>[0]} container
 * @param {Parameters<typeof scrollMessageToStart>[1]} message
 * @param {'user' | 'bot'} sender
 */
export function scrollAfterMessage(container, message, sender) {
  if (sender === 'bot') {
    scrollMessageToStart(container, message);
    return;
  }

  scrollToBottom(container);
}
