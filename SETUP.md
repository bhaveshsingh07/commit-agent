# Setup Guide — BMAD Code Guardian on macOS

This document walks through everything from "fresh Mac" to "PR merges
blocked when the AI finds problems". Every step has been verified on
**macOS 13 Ventura, macOS 14 Sonoma, and macOS 15 Sequoia** running on
both Apple Silicon (M1/M2/M3/M4) and Intel.

---

## 0. Prerequisites checklist

| Item | Why | How |
| --- | --- | --- |
| macOS 13+ | Self-hosted runner support | `sw_vers` |
| Homebrew | Package manager | https://brew.sh |
| Node.js 20 LTS | Orchestrator runtime | `brew install node@20` |
| Git 2.40+ | Diff generation | `brew install git` |
| GitHub org admin rights | To create rulesets and runners | — |
| GitHub Copilot **Enterprise** seat | Programmatic completions API | Org billing portal |
| Copilot PAT (classic) with `copilot` scope | API authentication | https://github.com/settings/tokens |
| Slack incoming webhook (optional) | PR failure notifications | https://api.slack.com/messaging/webhooks |
| SMTP credentials (optional) | Email distribution list | Internal mail relay |

---

## 1. Clone the central governance repo

The package you have in front of you is meant to live in **one** central
repository in your org, e.g. `your-org/commit-agent`. Every other repo
calls it via `workflow_call`.

```bash
# Create the central repo (one time, on github.com)
gh repo create your-org/commit-agent --private --confirm

# Push this package into it
cd commit-agent
git init
git add .
git commit -m "feat: initial BMAD Code Guardian skeleton"
git branch -M main
git remote add origin git@github.com:your-org/commit-agent.git
git push -u origin main
```

---

## 2. Run the macOS setup script

```bash
chmod +x scripts/*.sh
./scripts/setup-mac.sh
```

The script:

1. Verifies Homebrew, installs it if missing.
2. Installs Node 20, TypeScript, and `pnpm`.
3. Runs `pnpm install`.
4. Compiles the orchestrator with `tsc`.
5. Sanity-checks the prompts and JSON schema.

If anything fails, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

---

## 3. Install the self-hosted runner on a macOS server

The runner sits inside your corporate perimeter so source code never leaves
the private network during scanning.

```bash
./scripts/install-runner-mac.sh \
  --org your-org \
  --labels "self-hosted,macos,arm64,code-guardian" \
  --token <RUNNER_REG_TOKEN_FROM_GITHUB_UI>
```

Get the registration token from
**GitHub → Org Settings → Actions → Runners → New self-hosted runner**.

The script:

1. Downloads the latest `actions/runner` release for `osx-arm64` (or `osx-x64`).
2. Configures it as a launchd service so it survives reboots.
3. Tags it with `self-hosted, macos, arm64, code-guardian` so workflows can
   target it precisely.

Verify the runner shows up under **Org Settings → Actions → Runners** with a
green dot.

---

## 4. Configure secrets

In **GitHub → Org Settings → Secrets and variables → Actions**, add:

| Name | Description |
| --- | --- |
| `COPILOT_PAT` | Personal Access Token (classic) with `copilot` scope |
| `SLACK_WEBHOOK_URL` | Optional. Incoming webhook to post failures |
| `EMAIL_SMTP_HOST` | Optional. e.g. `smtp.your-org.internal` |
| `EMAIL_SMTP_USER` | Optional. SMTP username |
| `EMAIL_SMTP_PASS` | Optional. SMTP password |
| `EMAIL_RECIPIENTS` | Optional. Comma-separated distribution list |

---

## 5. Create the GitHub Repository Ruleset

Copy `config/ruleset.example.json`, edit the `bypass_actors` and
`required_status_checks` lists, then apply it:

```bash
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  /orgs/your-org/rulesets \
  --input config/ruleset.example.json
```

This creates an **organization-wide** ruleset that:

- Requires the `code-guardian / scan` status check to pass before merge.
- Blocks force-pushes and deletions on `main` and `release/*`.
- Disallows merging when the required check is missing or red.

The ruleset is what physically greys out the **Merge Pull Request** button.

---

## 6. Drop the light client caller into every repo

In each application repo (AEM project, Magento storefront, frontend app), add
a single 15-line file at `.github/workflows/code-guardian.yml`:

```yaml
name: Code Guardian

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  scan:
    uses: your-org/commit-agent/.github/workflows/code-guardian.yml@main
    secrets: inherit
```

That's it. Every PR will now be intercepted, scanned, and gated centrally.
Updates to the central repo propagate to every consumer on the next PR.

---

## 7. Verify end-to-end

Open a test PR that deliberately introduces a violation:

```js
// frontend test — should trigger the Frontend bucket
const html = `<div>${userInput}</div>`;
element.innerHTML = html;  // raw DOM insertion -> XSS
```

Within ~60 seconds you should see:

- A red **code-guardian / scan** status on the PR.
- A markdown comment from the bot listing the issue and remediation.
- A Slack message in the configured channel (if enabled).
- An email to the distribution list (if enabled).
- The **Merge Pull Request** button greyed out.

Push a fix, the check re-runs on `synchronize`, goes green, the button unlocks.

---

## 8. Day-2 operations

| Task | How |
| --- | --- |
| Update prompts org-wide | Edit `skills/code-guardian/prompts/*.md` in the central repo, merge to `main`. Next PR in every consumer repo picks it up. |
| Add a new language bucket | Add a new prompt file + a routing rule in `src/language-router.ts`. |
| Rotate Copilot PAT | Update `COPILOT_PAT` org secret; no workflow changes needed. |
| Tail runner logs | `tail -f ~/actions-runner/_diag/Runner_*.log` on the macOS server |
| Clear stale workspace | Workflow already runs `scripts/cleanup-workspace.sh` before every scan |

---

## 9. Uninstall

```bash
# On the runner host
cd ~/actions-runner
sudo ./svc.sh uninstall
./config.sh remove --token <REMOVAL_TOKEN>

# Delete the ruleset
gh api --method DELETE /orgs/your-org/rulesets/<RULESET_ID>
```
