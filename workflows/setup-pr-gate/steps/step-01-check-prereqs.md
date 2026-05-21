# Step 1: Check Prerequisites

Before setting up Code Guardian, verify you have the required access and tools.

## Required Access

Check off each item:

- [ ] **GitHub Admin Access**
  - Organization: Can create repos, manage secrets, configure runners
  - Personal: Repo admin rights on target repositories
  
- [ ] **AI Service Access**
  - Option A: GitHub Copilot Enterprise seat in your org
  - Option B: Anthropic API key (get at console.anthropic.com)

- [ ] **Local Development Setup**
  - Node.js 20+ installed (`node --version`)
  - Git 2.40+ installed (`git --version`)
  - GitHub CLI optional but helpful (`gh --version`)

## Decision Points

Answer these before proceeding (we'll use your answers in later steps):

### 1. Runner Type

**GitHub-hosted (recommended for testing):**
- ✅ Zero setup — works immediately
- ✅ Free for public repos, included in Actions minutes for private
- ⚠️ Code leaves your infrastructure (goes to GitHub's cloud)
- ⚠️ Limited to GitHub's OS/arch options

**Self-hosted (recommended for production):**
- ✅ Code stays in your private network
- ✅ Customize hardware/OS/environment
- ✅ No Actions minutes consumed
- ⚠️ You manage the server/VM
- ⚠️ Initial setup: ~30 minutes

**Your choice:** ___________________

### 2. AI Provider

**GitHub Copilot:**
- Requires GitHub Copilot Enterprise org seat
- Currently has authentication complexity (needs GitHub App)
- Best if your org already standardized on Copilot

**Anthropic Claude:**
- Requires Anthropic API key (paid, starts at $5 credit)
- Simpler auth (just an API key)
- Model: Claude Sonnet 4 recommended (~$0.03-0.05 per PR)

**Your choice:** ___________________

### 3. Notifications

Check all that apply:
- [ ] Slack (requires incoming webhook URL)
- [ ] Email (requires SMTP credentials)
- [ ] GitHub PR comments only (always enabled)

## Verification Commands

Run these to confirm your local environment is ready:

```bash
# Node version (must be 20+)
node --version

# Git version
git --version

# GitHub CLI (optional)
gh --version

# Can you create repos in your org?
gh repo create YOUR_ORG/test-repo --private --confirm
# (delete after: gh repo delete YOUR_ORG/test-repo --yes)
```

## Next Step

Once all prerequisites are confirmed, proceed to:

**Step 2:** Deploy Central Repository (`step-02-deploy-central.md`)
