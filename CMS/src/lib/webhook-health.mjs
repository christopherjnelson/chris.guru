/**
 * Check whether the dedicated chatbot health webhook reports online.
 *
 * @param {string | undefined} webhookUrl
 * @param {typeof fetch} fetchImpl
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
export async function isWebhookOnline(
  webhookUrl,
  fetchImpl = fetch,
  timeoutMs = 5000
) {
  if (!webhookUrl) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(webhookUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!res.ok) {
      return false;
    }

    const data = await res.json().catch(() => null);
    return data?.status === 'online';
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
