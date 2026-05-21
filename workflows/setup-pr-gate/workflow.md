---
name: Setup Code Guardian
id: setup-code-guardian
version: 1.0.0
description: |
  Interactive workflow to install and configure Code Guardian PR gatekeeper 
  in your repository. Walks through central repo deployment, secret setup, 
  runner configuration, and consumer repo integration.

prerequisites:
  - GitHub organization or personal account with admin access
  - Node.js 20+ installed locally (for testing)
  - GitHub Copilot Enterprise seat OR Anthropic API key

estimated_time: 30-45 minutes

phases:
  - name: Prerequisites Check
    steps: [step-01-check-prereqs]
  - name: Central Deployment
    steps: [step-02-deploy-central, step-03-add-secrets]
  - name: Runner Setup
    steps: [step-04-choose-runner, step-05-install-runner]
  - name: Repository Integration
    steps: [step-06-add-workflow, step-07-branch-protection]
  - name: Testing & Verification
    steps: [step-08-test-pr, step-09-verify-blocking]

outputs:
  - Central repository URL
  - Runner status (online/offline)
  - Number of repos protected
  - Test PR link

dependencies:
  internal:
    - skills/code-guardian/SKILL.md
  external:
    - GitHub Actions (runner infrastructure)
    - GitHub Copilot API or Anthropic Claude API
---

# Setup Code Guardian Workflow

This workflow guides you through deploying Code Guardian as an organization-wide 
PR quality gate.

## What You'll Set Up

1. **Central Repository** — Single source of truth for scanning logic
2. **Secrets** — API keys and notification credentials
3. **Runner** — GitHub-hosted (testing) or self-hosted (production)
4. **Consumer Integration** — 4-line workflow file in each protected repo
5. **Branch Protection** — Enforcement rules that block merges

## Before You Start

Answer these questions (they'll guide the workflow):

- **Runner type:** GitHub-hosted (quick testing) or self-hosted (production)?
- **AI provider:** GitHub Copilot or Anthropic Claude?
- **Notifications:** Slack, email, both, or neither?
- **Scope:** Single repo (pilot) or org-wide rollout?

## Invoking This Workflow

If you have BMad installed:
```
bmad-help setup-code-guardian
```

Or invoke the first step directly:
```
workflows/setup-pr-gate/steps/step-01-check-prereqs.md
```

Then follow the numbered steps sequentially.
