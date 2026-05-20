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
exports.parseDiff = parseDiff;
const fs = __importStar(require("node:fs"));
const language_router_1 = require("./language-router");
/**
 * Parse a unified git diff file into an array of CodeBlocks.
 *
 * The diff is expected to be produced by:
 *   git diff --unified=3 <base>...<head> > /tmp/push_modifications.diff
 *
 * One CodeBlock per hunk per file.
 */
function parseDiff(diffPath) {
    if (!fs.existsSync(diffPath)) {
        throw new Error(`Diff file not found: ${diffPath}`);
    }
    const raw = fs.readFileSync(diffPath, 'utf-8');
    const lines = raw.split('\n');
    const blocks = [];
    let currentFile = null;
    let currentHunkHeader = null;
    let currentBody = [];
    let currentStart = 0;
    const flushHunk = () => {
        if (currentFile && currentHunkHeader && currentBody.length > 0) {
            const bucket = (0, language_router_1.routeFile)(currentFile);
            blocks.push({
                filePath: currentFile,
                hunkHeader: currentHunkHeader,
                body: currentBody.join('\n'),
                bucket,
                startLine: currentStart,
            });
        }
        currentHunkHeader = null;
        currentBody = [];
        currentStart = 0;
    };
    // Regexes
    const FILE_HEADER = /^\+\+\+ b\/(.+)$/;
    const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
    for (const line of lines) {
        // New file marker
        const fileMatch = line.match(FILE_HEADER);
        if (fileMatch) {
            flushHunk();
            currentFile = fileMatch[1];
            continue;
        }
        // New hunk in the current file
        const hunkMatch = line.match(HUNK_HEADER);
        if (hunkMatch) {
            flushHunk();
            currentHunkHeader = line;
            currentStart = parseInt(hunkMatch[1], 10);
            continue;
        }
        // Skip diff metadata lines we don't care about
        if (line.startsWith('diff --git') ||
            line.startsWith('index ') ||
            line.startsWith('--- ') ||
            line.startsWith('new file mode') ||
            line.startsWith('deleted file mode') ||
            line.startsWith('similarity index') ||
            line.startsWith('rename from') ||
            line.startsWith('rename to') ||
            line.startsWith('Binary files')) {
            continue;
        }
        if (currentHunkHeader && currentFile) {
            currentBody.push(line);
        }
    }
    flushHunk();
    return blocks;
}
//# sourceMappingURL=diff-parser.js.map