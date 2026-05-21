# Workflows reference folder

This folder is a **reference / source-of-truth view** for the workflow
files. The actual files that GitHub Actions executes live one folder
up, under `.github/workflows/`.

| File | Purpose |
| --- | --- |
| `code-guardian.reference.yml` | Identical copy of `.github/workflows/code-guardian.yml`. Kept here so reviewers see all workflow YAML in one place. |
| `reusable-guardian.yml` | The 15-line snippet to drop into **consumer** repositories at `.github/workflows/code-guardian.yml`. **Do not copy this into the central repo's `.github/workflows/`** — it would create a recursion. |

## What goes where

**Central repo (this one, `dept/dtin-commit-agent`):**
```
.github/workflows/
  └── code-guardian.yml         ← the reusable workflow (workflow_call)
```

**Every consumer repo (your AEM, Magento, frontend apps):**
```
.github/workflows/
  └── code-guardian.yml         ← copy of workflows/reusable-guardian.yml
```
