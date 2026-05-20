"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postGithubComment = postGithubComment;
/**
 * Post a markdown comment to the PR using the GitHub REST API.
 */
async function postGithubComment(opts) {
    const { token, repo, prNumber, body } = opts;
    const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
    });
    if (!res.ok) {
        const text = await safeText(res);
        throw new Error(`GitHub comment failed ${res.status}: ${text}`);
    }
}
async function safeText(res) {
    try {
        return await res.text();
    }
    catch {
        return '<unreadable>';
    }
}
//# sourceMappingURL=github.js.map