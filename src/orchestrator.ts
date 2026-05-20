import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AggregateVerdict,
  ChunkResult,
  CodeBlock,
  CopilotVerdict,
  LanguageBucket,
} from './types';
import { CopilotClient } from './copilot-client';

const PROMPT_DIR = path.resolve(
  __dirname,
  '..',
  'skills',
  'code-guardian',
  'prompts',
);

interface PromptCache {
  security: string;
  aem: string;
  frontend: string;
  magento: string;
}

function loadPrompts(): PromptCache {
  const read = (name: string) =>
    fs.readFileSync(path.join(PROMPT_DIR, `${name}.md`), 'utf-8');
  return {
    security: read('security'),
    aem: read('aem'),
    frontend: read('frontend'),
    magento: read('magento'),
  };
}

function bucketPrompt(prompts: PromptCache, bucket: LanguageBucket): string | null {
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

function buildUserContent(block: CodeBlock): string {
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

export async function evaluateChunks(
  blocks: CodeBlock[],
  client: CopilotClient,
): Promise<AggregateVerdict> {
  const prompts = loadPrompts();
  const results: ChunkResult[] = [];
  let violations = 0;

  // Concurrency cap so we don't hammer the API
  const CONCURRENCY = 4;
  const queue = [...blocks];

  const workers: Promise<void>[] = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const block = queue.shift();
          if (!block) break;

          const userContent = buildUserContent(block);

          // Security overlay always runs
          const securityVerdict: CopilotVerdict = await client.evaluate(
            prompts.security,
            userContent,
          );

          // Bucket-specific only if there is one
          const bucketSystem = bucketPrompt(prompts, block.bucket);
          const bucketVerdict: CopilotVerdict | null = bucketSystem
            ? await client.evaluate(bucketSystem, userContent)
            : null;

          const isCompliant =
            securityVerdict.isCompliant &&
            (bucketVerdict ? bucketVerdict.isCompliant : true);

          if (!isCompliant) violations++;

          results.push({
            block,
            securityVerdict,
            bucketVerdict,
            isCompliant,
          });
        }
      })(),
    );
  }
  await Promise.all(workers);

  return {
    isCompliant: violations === 0,
    results,
    totalChunks: blocks.length,
    violations,
  };
}
