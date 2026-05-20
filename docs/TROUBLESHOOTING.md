# Troubleshooting

## "command not found: brew" after running setup-mac.sh

Homebrew didn't add itself to your shell profile. On Apple Silicon:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

On Intel:

```bash
echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/usr/local/bin/brew shellenv)"
```

---

## "node: command not found" after `brew install node@20`

`node@20` is keg-only. Re-link it:

```bash
brew link --overwrite --force node@20
```

Verify: `which node && node -v` — should report `v20.x.x`.

---

## Runner shows offline in the GitHub UI

```bash
cd ~/actions-runner
./svc.sh status
tail -n 100 _diag/Runner_*.log
```

Common causes:

- Mac went to sleep. Disable App Nap for the runner:
  `defaults write com.github.actions.runner NSAppSleepDisabled -bool YES`
- TLS interception by corporate proxy. Set `HTTPS_PROXY` in
  `~/actions-runner/.env` and restart the service.
- Runner token expired. Generate a new one in the GitHub UI and re-run
  `./scripts/install-runner-mac.sh`.

---

## Copilot API returns 401

- The PAT is missing the `copilot` scope. Regenerate at
  https://github.com/settings/tokens with `copilot` checked.
- The PAT belongs to a user who doesn't have a Copilot Enterprise seat
  in your org.
- The org has SSO enforced — authorise the PAT for SSO under
  **Settings → Developer settings → Personal access tokens (classic) →
  Configure SSO**.

---

## Copilot API returns 429

Rate-limited. Lower `CONCURRENCY` in `src/orchestrator.ts` from 4 to 2,
rebuild, and try again. For very large PRs, consider batching multiple
hunks per request.

---

## "Cannot find module 'nodemailer'" when email is enabled

Email is an *optional* dependency. Install it explicitly:

```bash
npm install nodemailer
npm run build
```

---

## PR comment fails with 403

The reusable workflow needs `pull-requests: write` permission. Verify
the consumer caller hasn't overridden permissions, and that the
organisation hasn't disabled the default `GITHUB_TOKEN` write
permission under **Org Settings → Actions → General → Workflow
permissions**.

---

## Merge button is still active despite a red check

- The Repository Ruleset wasn't applied. Re-run the `gh api` command in
  step 5 of SETUP.md.
- The ruleset's `bypass_actors` list contains the user trying to merge.
  Trim it.
- The required status check name doesn't match. The ruleset expects
  `Code Guardian / scan` (job name "scan" inside the workflow "Code
  Guardian"). If you renamed either, update the ruleset.

---

## "ENOSPC: no space left on device" on the runner

Self-hosted runners accumulate `_work/_temp/` and Docker layers over
time. Add a weekly cron:

```bash
crontab -e
# clean Mondays at 3am
0 3 * * 1 cd ~/actions-runner && rm -rf _work/_temp/* _diag/*.log.old
```
