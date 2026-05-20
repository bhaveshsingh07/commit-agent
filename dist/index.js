#!/usr/bin/env node
"use strict";
/**
 * BMAD Code Guardian — CLI entrypoint
 *
 * Invoked by the GitHub Actions step on the self-hosted runner.
 * Reads a unified diff, evaluates each chunk via the Copilot API,
 * reports back to the PR + Slack + email, and exits non-zero on
 * any violation so the required status check turns red.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const diff_parser_1 = require("./diff-parser");
const orchestrator_1 = require("./orchestrator");
const copilot_client_1 = require("./copilot-client");
const reporter_1 = require("./reporter");
const github_1 = require("./notifiers/github");
const slack_1 = require("./notifiers/slack");
const email_1 = require("./notifiers/email");
function env(name, required = false) {
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
    const prUrl = env('PR_URL') ||
        `https://github.com/${repo}/pull/${prNumber}`;
    const githubToken = env('GITHUB_TOKEN', true);
    const copilotPat = env('COPILOT_PAT', true);
    const slackUrl = env('SLACK_WEBHOOK_URL');
    const smtpHost = env('EMAIL_SMTP_HOST');
    const smtpUser = env('EMAIL_SMTP_USER');
    const smtpPass = env('EMAIL_SMTP_PASS');
    const emailRecipients = env('EMAIL_RECIPIENTS');
    console.log(`[guardian] Repo:          ${repo}`);
    console.log(`[guardian] PR:            #${prNumber} by ${author} @ ${sha.slice(0, 8)}`);
    console.log(`[guardian] Diff path:     ${diffPath}`);
    const blocks = (0, diff_parser_1.parseDiff)(diffPath);
    console.log(`[guardian] Chunks parsed: ${blocks.length}`);
    if (blocks.length === 0) {
        console.log('[guardian] Empty diff — nothing to gate. Exiting 0.');
        return;
    }
    const client = new copilot_client_1.CopilotClient({ pat: copilotPat });
    const verdict = await (0, orchestrator_1.evaluateChunks)(blocks, client);
    console.log(`[guardian] Verdict: ${verdict.isCompliant ? 'PASS' : 'FAIL'} (${verdict.violations}/${verdict.totalChunks} violations)`);
    // --- Fan-out: PR comment
    const markdown = (0, reporter_1.buildMarkdownReport)(verdict);
    try {
        await (0, github_1.postGithubComment)({
            token: githubToken,
            repo,
            prNumber,
            body: markdown,
        });
    }
    catch (err) {
        console.error('[guardian] PR comment failed:', err);
    }
    // --- Fan-out: Slack (best-effort)
    if (slackUrl) {
        try {
            await (0, slack_1.postSlack)({
                webhookUrl: slackUrl,
                payload: (0, reporter_1.buildSlackPayload)(verdict, prUrl, prTitle),
            });
        }
        catch (err) {
            console.error('[guardian] Slack notification failed:', err);
        }
    }
    // --- Fan-out: Email (best-effort)
    if (smtpHost && smtpUser && smtpPass && emailRecipients) {
        try {
            await (0, email_1.sendEmail)({
                host: smtpHost,
                user: smtpUser,
                pass: smtpPass,
                recipients: emailRecipients,
                subject: `[Code Guardian] ${verdict.isCompliant ? 'PASS' : 'BLOCKED'} — ${prTitle}`,
                html: (0, reporter_1.buildEmailHtml)(verdict, prUrl, prTitle),
            });
        }
        catch (err) {
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
//# sourceMappingURL=index.js.map