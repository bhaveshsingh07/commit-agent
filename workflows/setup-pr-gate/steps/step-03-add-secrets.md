# Step 3: Add Secrets

Configure API keys and notification credentials that the workflow will use.

## Choose Your AI Provider

The system supports multiple AI providers. Pick one based on your organization's needs:

| Provider | Best For | Setup Complexity |
| --- | --- | --- |
| **Anthropic Claude** | Best code review quality, simple auth | ⭐ Easy (API key) |
| **OpenAI ChatGPT** | Widely adopted, good performance | ⭐ Easy (API key) |
| **GitHub Copilot** | If already using Copilot Enterprise | ⭐⭐⭐ Complex (GitHub App) |
| **Azure OpenAI** | Enterprise deployments with Azure | ⭐⭐ Medium (API key + endpoint) |
| **Custom** | Self-hosted or alternative providers | ⭐⭐ Medium (API key + endpoint) |

---

## Option A: Anthropic Claude (Recommended)

**Why:** Best at code review, simplest setup, transparent pricing.

### 1. Get API Key
1. Go to https://console.anthropic.com/
2. Sign up / log in
3. **Settings → Billing** → Add credits (minimum $5)
4. **Settings → API Keys** → Create key
5. Copy the key (starts with `sk-ant-api03-...`)

### 2. Add to GitHub

**For organization:**
```bash
gh secret set AI_PROVIDER --org YOUR_ORG --body "claude"
gh secret set AI_MODEL --org YOUR_ORG --body "claude-sonnet-4-20250514"
gh secret set ANTHROPIC_API_KEY --org YOUR_ORG --body "sk-ant-api03-..."
```

**For personal repos:**
```bash
gh secret set AI_PROVIDER --repo YOUR_USER/REPO --body "claude"
gh secret set AI_MODEL --repo YOUR_USER/REPO --body "claude-sonnet-4-20250514"
gh secret set ANTHROPIC_API_KEY --repo YOUR_USER/REPO --body "sk-ant-..."
```

**Available Claude models:**
- `claude-sonnet-4-20250514` (recommended) — Best balance
- `claude-opus-4-20250514` — Highest quality, slower, more expensive
- `claude-haiku-4-20241022` — Fastest, cheapest, good enough for simple rules

---

## Option B: OpenAI ChatGPT

### 1. Get API Key
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy the key (starts with `sk-...`)

### 2. Add to GitHub

```bash
gh secret set AI_PROVIDER --org YOUR_ORG --body "openai"
gh secret set AI_MODEL --org YOUR_ORG --body "gpt-4o"
gh secret set OPENAI_API_KEY --org YOUR_ORG --body "sk-..."
```

**Available OpenAI models:**
- `gpt-4o` (recommended)
- `gpt-4-turbo`
- `gpt-3.5-turbo` (faster, cheaper, lower quality)

---

## Option C: GitHub Copilot

**Note:** Requires GitHub Copilot Enterprise org seat + GitHub App setup.

Due to authentication complexity, Copilot now requires a GitHub App. See `docs/COPILOT_GITHUB_APP_SETUP.md` for detailed instructions.

**Quick path if you have Copilot Enterprise:**
1. Create GitHub App in org settings
2. Grant `Copilot` read permission
3. Install app on repos
4. Add `APP_ID` and `APP_PRIVATE_KEY` secrets

**Simpler alternative:** Use Claude or OpenAI instead (better auth, same quality).

---

## Option D: Azure OpenAI

For enterprise Azure deployments:

```bash
gh secret set AI_PROVIDER --org YOUR_ORG --body "azure"
gh secret set AI_MODEL --org YOUR_ORG --body "YOUR_DEPLOYMENT_NAME"
gh secret set AI_API_KEY --org YOUR_ORG --body "your_azure_key"
gh secret set AI_BASE_URL --org YOUR_ORG --body "https://YOUR_RESOURCE.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT"
```

---

## Option E: Custom OpenAI-Compatible API

For Groq, Together.ai, or self-hosted models:

```bash
gh secret set AI_PROVIDER --org YOUR_ORG --body "custom"
gh secret set AI_MODEL --org YOUR_ORG --body "mixtral-8x7b"  # example
gh secret set AI_API_KEY --org YOUR_ORG --body "your_api_key"
gh secret set AI_BASE_URL --org YOUR_ORG --body "https://api.groq.com/openai/v1/chat/completions"
```

---

## Optional Secrets: Notifications

### Slack Webhook (if you want Slack notifications)

1. Go to https://api.slack.com/messaging/webhooks
2. Create an incoming webhook for your workspace
3. Copy the webhook URL

```bash
gh secret set SLACK_WEBHOOK_URL --org YOUR_ORG --body "https://hooks.slack.com/services/..."
```

### Email SMTP (if you want email notifications)

```bash
gh secret set EMAIL_SMTP_HOST --org YOUR_ORG --body "smtp.your-org.com"
gh secret set EMAIL_SMTP_USER --org YOUR_ORG --body "guardian-bot@your-org.com"
gh secret set EMAIL_SMTP_PASS --org YOUR_ORG --body "your_password"
gh secret set EMAIL_RECIPIENTS --org YOUR_ORG --body "dev-team@your-org.com,security@your-org.com"
```

---

## Verify Secrets Are Set

```bash
# List org secrets
gh secret list --org YOUR_ORG

# List repo secrets
gh secret list --repo YOUR_ORG/REPO_NAME
```

**Expected output should include:**
- `AI_PROVIDER` (or defaults to `copilot`)
- `AI_MODEL` (optional, provider-specific default used if not set)
- Provider-specific key: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `COPILOT_PAT`
- Optional: `SLACK_WEBHOOK_URL`, `EMAIL_SMTP_*`

---

## Next Step

**Step 4:** Choose Runner Type (`step-04-choose-runner.md`)
