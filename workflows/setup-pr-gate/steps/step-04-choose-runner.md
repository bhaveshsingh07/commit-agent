# Step 4: Choose Runner Type

Based on your decision in Step 1, follow the appropriate path.

## Path A: GitHub-Hosted Runners (Testing)

Update `.github/workflows/code-guardian.yml`:

```yaml
runs-on: ubuntu-latest  # Change from [self-hosted, linux, x64, code-guardian]
```

**Skip to Step 6** — no runner installation needed.

## Path B: Self-Hosted Runners (Production)

Proceed to **Step 5** for installation instructions.

### Why Self-Hosted?

- Code never leaves your infrastructure
- Customize environment (Node version, tools, caching)
- No GitHub Actions minutes consumed
- Required if you have data residency requirements

**Next:** `step-05-install-runner.md`
