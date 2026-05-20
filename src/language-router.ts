import * as path from 'node:path';
import { LanguageBucket } from './types';

/**
 * Route a file path to the correct language bucket.
 * Matches the routing matrix in skills/code-guardian/SKILL.md.
 */
export function routeFile(filePath: string): LanguageBucket {
  const normalised = filePath.replace(/\\/g, '/').toLowerCase();
  const ext = path.extname(normalised);

  // ---- Magento / PHP (path-based takes precedence over generic .php)
  if (
    normalised.includes('/app/code/') ||
    normalised.includes('/vendor/magento/') ||
    ext === '.php' ||
    ext === '.phtml'
  ) {
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
export function shouldRunSecurityOverlay(bucket: LanguageBucket): boolean {
  return bucket !== 'unknown' || true;
}
