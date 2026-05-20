import { AggregateVerdict, ChunkResult } from './types';

export function buildMarkdownReport(verdict: AggregateVerdict): string {
  if (verdict.isCompliant) {
    return [
      '### ✅ Code Guardian — All checks passed',
      '',
      `Scanned **${verdict.totalChunks}** chunk(s). No security, repository, or best-practice violations detected.`,
    ].join('\n');
  }

  const lines: string[] = [
    '### ❌ Code Guardian — Violations detected',
    '',
    `Scanned **${verdict.totalChunks}** chunk(s). Found **${verdict.violations}** issue(s). The merge button is frozen until these are addressed.`,
    '',
  ];

  for (const r of verdict.results) {
    if (r.isCompliant) continue;
    lines.push(renderResult(r));
  }

  lines.push('');
  lines.push(
    '> Push a follow-up commit with the fixes; this check re-runs on `synchronize`.',
  );

  return lines.join('\n');
}

function renderResult(r: ChunkResult): string {
  const parts: string[] = [];
  parts.push(`---`);
  parts.push(`**📄 ${r.block.filePath}** _(bucket: \`${r.block.bucket}\`, line ${r.block.startLine})_`);
  parts.push('');

  if (!r.securityVerdict.isCompliant) {
    parts.push(`**🔒 Security:** ${r.securityVerdict.issue}`);
    parts.push('');
    parts.push('```');
    parts.push(r.securityVerdict.remediation);
    parts.push('```');
    parts.push('');
  }

  if (r.bucketVerdict && !r.bucketVerdict.isCompliant) {
    parts.push(`**🧱 ${r.block.bucket.toUpperCase()} rules:** ${r.bucketVerdict.issue}`);
    parts.push('');
    parts.push('```');
    parts.push(r.bucketVerdict.remediation);
    parts.push('```');
    parts.push('');
  }

  return parts.join('\n');
}

export function buildSlackPayload(
  verdict: AggregateVerdict,
  prUrl: string,
  prTitle: string,
): unknown {
  const status = verdict.isCompliant ? ':white_check_mark: PASS' : ':x: BLOCKED';
  const headerLines = [
    `*Code Guardian — ${status}*`,
    `<${prUrl}|${prTitle}>`,
    `Chunks scanned: ${verdict.totalChunks} · Violations: ${verdict.violations}`,
  ];

  const blocks: any[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: headerLines.join('\n') },
    },
  ];

  if (!verdict.isCompliant) {
    for (const r of verdict.results.filter((x) => !x.isCompliant).slice(0, 10)) {
      const issue =
        (r.securityVerdict.isCompliant ? '' : r.securityVerdict.issue) +
        (r.bucketVerdict && !r.bucketVerdict.isCompliant
          ? ` | ${r.bucketVerdict.issue}`
          : '');
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• \`${r.block.filePath}\` — ${issue.trim()}`,
        },
      });
    }
  }

  return { blocks };
}

export function buildEmailHtml(
  verdict: AggregateVerdict,
  prUrl: string,
  prTitle: string,
): string {
  const heading = verdict.isCompliant
    ? '✅ Code Guardian — PASS'
    : '❌ Code Guardian — BLOCKED';

  const rows = verdict.results
    .filter((r) => !r.isCompliant)
    .map(
      (r) => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><code>${escapeHtml(r.block.filePath)}</code></td>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(r.block.bucket)}</td>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(
            (r.securityVerdict.isCompliant ? '' : r.securityVerdict.issue) +
              (r.bucketVerdict && !r.bucketVerdict.isCompliant
                ? ` | ${r.bucketVerdict.issue}`
                : ''),
          )}</td>
        </tr>`,
    )
    .join('');

  return `
    <html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
      <h2>${heading}</h2>
      <p><a href="${escapeHtml(prUrl)}">${escapeHtml(prTitle)}</a></p>
      <p>Chunks scanned: <b>${verdict.totalChunks}</b> · Violations: <b>${verdict.violations}</b></p>
      ${
        verdict.isCompliant
          ? ''
          : `<table style="border-collapse:collapse;width:100%;">
              <thead>
                <tr style="background:#f3f3f3;">
                  <th style="padding:8px;border:1px solid #ddd;text-align:left;">File</th>
                  <th style="padding:8px;border:1px solid #ddd;text-align:left;">Bucket</th>
                  <th style="padding:8px;border:1px solid #ddd;text-align:left;">Issue</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>`
      }
    </body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
