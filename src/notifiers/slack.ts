/**
 * Post a Slack webhook payload. Silently no-ops if webhookUrl is empty.
 */
export async function postSlack(opts: {
  webhookUrl: string;
  payload: unknown;
}): Promise<void> {
  if (!opts.webhookUrl) return;

  const res = await fetch(opts.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts.payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '<unreadable>');
    // Non-fatal: log and continue
    console.error(`Slack webhook failed ${res.status}: ${text}`);
  }
}
