"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateChunks = evaluateChunks;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const PROMPT_DIR = path.resolve(__dirname, '..', 'skills', 'code-guardian', 'prompts');
function loadPrompts() {
    const read = (name) => fs.readFileSync(path.join(PROMPT_DIR, `${name}.md`), 'utf-8');
    return {
        security: read('security'),
        aem: read('aem'),
        frontend: read('frontend'),
        magento: read('magento'),
    };
}
function bucketPrompt(prompts, bucket) {
    switch (bucket) {
        case 'aem':
            return prompts.aem;
        case 'frontend':
            return prompts.frontend;
        case 'magento':
            return prompts.magento;
        default:
            return null;
    }
}
function buildUserContent(block) {
    return [
        `File: ${block.filePath}`,
        `Bucket: ${block.bucket}`,
        `Hunk: ${block.hunkHeader}`,
        '',
        '--- diff ---',
        block.body,
        '--- end diff ---',
    ].join('\n');
}
async function evaluateChunks(blocks, client) {
    const prompts = loadPrompts();
    const results = [];
    let violations = 0;
    // Concurrency cap so we don't hammer the API
    const CONCURRENCY = 4;
    const queue = [...blocks];
    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
        workers.push((async () => {
            while (queue.length > 0) {
                const block = queue.shift();
                if (!block)
                    break;
                const userContent = buildUserContent(block);
                // Security overlay always runs
                const securityVerdict = await client.evaluate(prompts.security, userContent);
                // Bucket-specific only if there is one
                const bucketSystem = bucketPrompt(prompts, block.bucket);
                const bucketVerdict = bucketSystem
                    ? await client.evaluate(bucketSystem, userContent)
                    : null;
                const isCompliant = securityVerdict.isCompliant &&
                    (bucketVerdict ? bucketVerdict.isCompliant : true);
                if (!isCompliant)
                    violations++;
                results.push({
                    block,
                    securityVerdict,
                    bucketVerdict,
                    isCompliant,
                });
            }
        })());
    }
    await Promise.all(workers);
    return {
        isCompliant: violations === 0,
        results,
        totalChunks: blocks.length,
        violations,
    };
}
//# sourceMappingURL=orchestrator.js.map