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
exports.routeFile = routeFile;
exports.shouldRunSecurityOverlay = shouldRunSecurityOverlay;
const path = __importStar(require("node:path"));
/**
 * Route a file path to the correct language bucket.
 * Matches the routing matrix in skills/code-guardian/SKILL.md.
 */
function routeFile(filePath) {
    const normalised = filePath.replace(/\\/g, '/').toLowerCase();
    const ext = path.extname(normalised);
    // ---- Magento / PHP (path-based takes precedence over generic .php)
    if (normalised.includes('/app/code/') ||
        normalised.includes('/vendor/magento/') ||
        ext === '.php' ||
        ext === '.phtml') {
        return 'magento';
    }
    // ---- AEM (path-based, then extension)
    const aemPathHints = ['/apps/', '/libs/', '/blocks/', '/scripts/'];
    const aemExts = new Set(['.java', '.jsp', '.xml']);
    const hasAemPath = aemPathHints.some((p) => normalised.includes(p));
    if (hasAemPath && (aemExts.has(ext) || ext === '.html')) {
        return 'aem';
    }
    if (aemExts.has(ext)) {
        return 'aem';
    }
    // EDS blocks live under /blocks/ with .js / .css
    if (normalised.includes('/blocks/') && (ext === '.js' || ext === '.css')) {
        return 'aem';
    }
    // ---- Modern Frontend
    const frontendExts = new Set([
        '.js',
        '.jsx',
        '.ts',
        '.tsx',
        '.html',
        '.css',
        '.scss',
        '.mjs',
        '.cjs',
    ]);
    if (frontendExts.has(ext)) {
        return 'frontend';
    }
    return 'unknown';
}
/**
 * Whether the bucket should still get a security overlay scan.
 * Currently every textual chunk gets one; binaries are filtered upstream.
 */
function shouldRunSecurityOverlay(bucket) {
    return bucket !== 'unknown' || true;
}
//# sourceMappingURL=language-router.js.map