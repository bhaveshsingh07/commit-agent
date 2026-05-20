import * as fs from 'node:fs';
import { CodeBlock } from './types';
import { routeFile } from './language-router';

/**
 * Parse a unified git diff file into an array of CodeBlocks.
 *
 * The diff is expected to be produced by:
 *   git diff --unified=3 <base>...<head> > /tmp/push_modifications.diff
 *
 * One CodeBlock per hunk per file.
 */
export function parseDiff(diffPath: string): CodeBlock[] {
  if (!fs.existsSync(diffPath)) {
    throw new Error(`Diff file not found: ${diffPath}`);
  }

  const raw = fs.readFileSync(diffPath, 'utf-8');
  const lines = raw.split('\n');

  const blocks: CodeBlock[] = [];

  let currentFile: string | null = null;
  let currentHunkHeader: string | null = null;
  let currentBody: string[] = [];
  let currentStart = 0;

  const flushHunk = () => {
    if (currentFile && currentHunkHeader && currentBody.length > 0) {
      const bucket = routeFile(currentFile);
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
    if (
      line.startsWith('diff --git') ||
      line.startsWith('index ') ||
      line.startsWith('--- ') ||
      line.startsWith('new file mode') ||
      line.startsWith('deleted file mode') ||
      line.startsWith('similarity index') ||
      line.startsWith('rename from') ||
      line.startsWith('rename to') ||
      line.startsWith('Binary files')
    ) {
      continue;
    }

    if (currentHunkHeader && currentFile) {
      currentBody.push(line);
    }
  }

  flushHunk();

  return blocks;
}
