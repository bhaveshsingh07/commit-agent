# Architecture

This document explains the physical and logical layers of the BMAD Code
Guardian system and why each one exists.

---

## 1. Trust boundary

```
┌──────────────────────────────────────────────────────────────────┐
│  GitHub Cloud                                                    │
│  ─────────────                                                   │
│  • Hosts repos                                                   │
│  • Fires `pull_request` webhooks                                 │
│  • Hosts the Copilot completions API                             │
│  • Enforces Repository Rulesets (blocks the merge button)        │
└──────────────────────────────────────────────────────────────────┘
                          ▲                          ▲
                          │ outbound HTTPS only      │ status check
                          │ (long-poll + POST)       │ result
                          │                          │
┌──────────────────────────────────────────────────────────────────┐
│  Corporate private network                                       │
│  ──────────────────────────                                      │
│  Self-hosted runner (macOS or Linux)                             │
│  • Pulls the central BMAD module                                 │
│  • Checks out PR source code                                     │
│  • Computes git diff                                             │
│  • Runs orchestrator → Copilot API                               │
│  • Posts results back via outbound HTTPS                         │
└──────────────────────────────────────────────────────────────────┘
```

Key property: **no inbound port is ever opened on the corporate network.**
The runner agent maintains a long-poll connection to GitHub and pulls work.

---

## 2. Per-PR data path

```
[PR opened/synchronize/reopened]
        │
        ▼  (webhook → workflow_dispatch)
[GitHub schedules the workflow]
        │
        ▼  (long-poll picks it up)
[Self-hosted runner on macOS]
        │
        ├──> rm -rf .guardian-tmp                  ← cleanup-workspace.sh
        ├──> actions/checkout @ PR head SHA       ← isolated working copy
        ├──> actions/checkout @ central BMAD repo ← orchestrator + prompts
        ├──> npm install && npm run build         ← TS → JS
        ├──> git diff base..head > /tmp/push_modifications.diff
        ├──> node dist/index.js                    ← orchestrator
        │       │
        │       ├── parseDiff()      → CodeBlock[]
        │       ├── routeFile()      → 'aem' | 'frontend' | 'magento' | 'unknown'
        │       ├── CopilotClient.evaluate(security overlay)
        │       ├── CopilotClient.evaluate(bucket-specific overlay)
        │       └── aggregate → AggregateVerdict
        │
        ├──> reporter → PR comment + Slack + email
        └──> exit 0 if compliant else exit 1       ← gates the merge button
```

---

## 3. Why each layer exists

### Self-hosted runners
Keeps raw enterprise source inside the corporate perimeter. The Copilot API
sees only the **diff chunks** we explicitly send, never the whole repo.

### Workspace purification (`rm -rf`)
Self-hosted runners persist disk state across jobs. Without cleanup, files
from a previous repo could leak into the current scan or cause TypeScript
compilation to pick up stale artefacts.

### Central BMAD module checkout
The orchestrator and prompts live in **one** repo. Every consumer pulls
the latest `main` at scan time, so prompt updates propagate org-wide
without touching consumer workflows.

### Strict JSON output contract
LLMs love prose. Without `response_format: { type: 'json_object' }` and a
zero-shot system instruction, ~10% of responses include "Here is the
analysis:" preamble that breaks parsing. The strict contract + retry +
fail-closed semantics give deterministic behaviour.

### Concurrency cap
The orchestrator runs at most 4 chunks in parallel. This is a balance
between throughput (so a 50-file PR doesn't take 10 minutes) and not
hammering the Copilot API into rate limits.

### Fail-closed
Any unrecoverable error (network, malformed JSON, timeout) is treated as
a non-compliant verdict. We block the merge rather than letting a silent
failure pass dangerous code.

### Repository Rulesets, not Branch Protection
Rulesets are organization-wide, versioned, and supersede the per-repo
branch protection model. One ruleset definition covers every repo in the
org.

---

## 4. Extending the system

| Change | What to edit |
| --- | --- |
| Add a new violation class to security overlay | `skills/code-guardian/prompts/security.md` |
| Tighten/loosen AEM rules | `skills/code-guardian/prompts/aem.md` |
| Support a new language (e.g. Python) | Add `prompts/python.md`, extend `LanguageBucket` in `src/types.ts`, add a case in `routeFile()` and `bucketPrompt()` |
| Change LLM model | `model: 'gpt-4o'` in `src/copilot-client.ts` |
| Change concurrency | `CONCURRENCY` constant in `src/orchestrator.ts` |
| Add a new notifier (Teams, PagerDuty) | New file under `src/notifiers/`, wire into `src/index.ts` |

---

## 5. Performance envelope

Rough numbers observed on a typical Adobe Commerce PR (~30 changed files,
~200 hunks):

| Phase | Duration |
| --- | --- |
| Checkout PR + central repo | 8–15 s |
| npm install + tsc build | 25–40 s |
| git diff | <1 s |
| Copilot evaluation (200 hunks @ concurrency 4) | 60–90 s |
| Reporting (PR comment + Slack + email) | 1–3 s |
| **Total** | **~2 minutes** |

Caching `node_modules` and pre-building the orchestrator into a Docker
image trims another 30–40 s if needed.
