# Step 3: Add Secrets

Configure API keys and notification credentials that the workflow will use.

## Required Secret: AI Provider Token

### Option A: GitHub Copilot (if you chose Copilot in Step 1)

**Current limitation:** GitHub Copilot API rejects Personal Access Tokens. 
You must create a GitHub App.

See `docs/COPILOT_GITHUB_APP_SETUP.md` for detailed instructions, or:

**Quick path:** Switch to Claude API (see Option B below) — simpler auth.

### Option B: Anthropic Claude (recommended)

1. Go to https://console.anthropic.com/
2. Sign up / log in
3. **Settings → Billing** → Add credits (minimum $5)
4. **Settings → API Keys** → Create key
5. Copy the key (starts with `sk-ant-api03-...`)

**Add to GitHub:**

For organization:
```bash
# Via CLI
gh secret set ANTHROPIC_API_KEY --org YOUR_ORG --body "sk-ant-api03-..."

# Or via UI: github.com/organizations/YOUR_ORG/settings/secrets/actions
```

For personal repos:
```bash
# Via CLI (per repo)
gh secret set ANTHROPIC_API_KEY --repo YOUR_ORG/REPO_NAME --body "sk-ant-api03-..."

# Or via UI: github.com/YOUR_USER/REPO_NAME/settings/secrets/actions
```

## Optional Secrets: Notifications

### Slack Webhook (if you checked Slack in Step 1)

1. Go to https://api.slack.com/messaging/webhooks
2. Create an incoming webhook for your workspace
3. Copy the webhook URL

```bash
gh secret set SLACK_WEBHOOK_URL --org YOUR_ORG --body "https://hooks.slack.com/services/..."
```

### Email SMTP (if you checked Email in Step 1)

```bash
gh secret set EMAIL_SMTP_HOST --org YOUR_ORG --body "smtp.your-org.com"
gh secret set EMAIL_SMTP_USER --org YOUR_ORG --body "guardian-bot@your-org.com"
gh secret set EMAIL_SMTP_PASS --org YOUR_ORG --body "your_password"
gh secret set EMAIL_RECIPIENTS --org YOUR_ORG --body "dev-team@your-org.com,security@your-org.com"
```

## Verify Secrets Are Set

```bash
# List org secrets
gh secret list --org YOUR_ORG

# List repo secrets
gh secret list --repo YOUR_ORG/REPO_NAME
```

Expected output should include:
- `ANTHROPIC_API_KEY` (or `COPILOT_PAT` if using Copilot)
- Optional: `SLACK_WEBHOOK_URL`, `EMAIL_SMTP_*`

## Update Workflow for Claude API

If you chose Claude API, update `.github/workflows/code-guardian.yml`:

**Change the env block in the "Run Code Guardian" step:**
```yaml
env:
  AI_PROVIDER: claude
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  # ... other env vars
```

And update `src/index.ts` to read `AI_PROVIDER` and route to the appropriate client.

(A pre-configured Claude integration is included in this module at `src/ai-client.ts`)

## Next Step

**Step 4:** Choose Runner Type (`step-04-choose-runner.md`)
