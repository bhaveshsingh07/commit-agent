#!/usr/bin/env node
/**
 * BMAD Code Guardian — CLI entrypoint
 *
 * Invoked by the GitHub Actions step on the runner.
 * Reads a unified diff, evaluates each chunk via AI (Copilot/Claude/OpenAI),
 * reports back to the PR + Slack + email, and exits non-zero on
 * any violation so the required status check turns red.
 */

import { parseDiff } from './diff-parser';
import { evaluateChunks } from './orchestrator';
import { AIClient } from './ai-client';
import { CopilotClient } from './copilot-client';
import {
  buildEmailHtml,
  buildMarkdownReport,
  buildSlackPayload,
} from './reporter';
import { postGithubComment } from './notifiers/github';
import { postSlack } from './notifiers/slack';
import { sendEmail } from './notifiers/email';
import type { AIProvider } from './types';

function env(name: string, required = false): string {
  const v = process.env[name] ?? '';
  if (required && !v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(2);
  }
  return v;
}

async function main() {
  const diffPath = env('DIFF_PATH', true);
  const repo = env('GITHUB_REPOSITORY', true); // owner/name
  const prNumber = parseInt(env('PR_NUMBER', true), 10);
  const sha = env('PR_HEAD_SHA');
  const author = env('PR_AUTHOR');
  const prTitle = env('PR_TITLE') || `PR #${prNumber}`;
  const prUrl =
    env('PR_URL') ||
    `https://github.com/${repo}/pull/${prNumber}`;

  const githubToken = env('GITHUB_TOKEN', true);

  // Multi-provider AI support
  const aiProvider = (env('AI_PROVIDER') || 'copilot') as AIProvider;
  const aiModel = env('AI_MODEL');
  const aiApiKey = env('AI_API_KEY') || env('COPILOT_PAT') || env('ANTHROPIC_API_KEY') || env('OPENAI_API_KEY');
  const aiBaseUrl = env('AI_BASE_URL');

  const slackUrl = env('SLACK_WEBHOOK_URL');
  const smtpHost = env('EMAIL_SMTP_HOST');
  const smtpUser = env('EMAIL_SMTP_USER');
  const smtpPass = env('EMAIL_SMTP_PASS');
  const emailRecipients = env('EMAIL_RECIPIENTS');

  console.log(`[guardian] Repo:          ${repo}`);
  console.log(`[guardian] PR:            #${prNumber} by ${author} @ ${sha.slice(0, 8)}`);
  console.log(`[guardian] AI Provider:   ${aiProvider}${aiModel ? ` (${aiModel})` : ''}`);
  console.log(`[guardian] Diff path:     ${diffPath}`);

  const blocks = parseDiff(diffPath);
  console.log(`[guardian] Chunks parsed: ${blocks.length}`);

  if (blocks.length === 0) {
    console.log('[guardian] Empty diff — nothing to gate. Exiting 0.');
    return;
  }

  // Initialize AI client based on provider
  const client = aiProvider === 'copilot' && !aiModel
    ? new CopilotClient({ pat: aiApiKey })
    : new AIClient({
        provider: aiProvider,
        model: aiModel,
        apiKey: aiApiKey,
        baseUrl: aiBaseUrl,
      });

  const verdict = await evaluateChunks(blocks, client);

  console.log(
    `[guardian] Verdict: ${
      verdict.isCompliant ? 'PASS' : 'FAIL'
    } (${verdict.violations}/${verdict.totalChunks} violations)`,
  );

  // --- Fan-out: PR comment
  const markdown = buildMarkdownReport(verdict);
  try {
    await postGithubComment({
      token: githubToken,
      repo,
      prNumber,
      body: markdown,
    });
  } catch (err) {
    console.error('[guardian] PR comment failed:', err);
  }

  // --- Fan-out: Slack (best-effort)
  if (slackUrl) {
    try {
      await postSlack({
        webhookUrl: slackUrl,
        payload: buildSlackPayload(verdict, prUrl, prTitle),
      });
    } catch (err) {
      console.error('[guardian] Slack notification failed:', err);
    }
  }

  // --- Fan-out: Email (best-effort)
  if (smtpHost && smtpUser && smtpPass && emailRecipients) {
    try {
      await sendEmail({
        host: smtpHost,
        user: smtpUser,
        pass: smtpPass,
        recipients: emailRecipients,
        subject: `[Code Guardian] ${
          verdict.isCompliant ? 'PASS' : 'BLOCKED'
        } — ${prTitle}`,
        html: buildEmailHtml(verdict, prUrl, prTitle),
      });
    } catch (err) {
      console.error('[guardian] Email send failed:', err);
    }
  }

  // --- The gating decision
  if (!verdict.isCompliant) {
    console.error('[guardian] Violations detected — exiting 1 to fail the workflow.');
    process.exit(1);
  }
  console.log('[guardian] All clear — exiting 0.');
}

main().catch((err) => {
  console.error('[guardian] Fatal:', err);
  // Fail-closed: any uncaught error blocks the merge
  process.exit(1);
});
