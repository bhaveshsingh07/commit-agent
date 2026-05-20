/**
 * Shared types for the BMAD Code Guardian orchestrator.
 */

export type LanguageBucket = 'aem' | 'frontend' | 'magento' | 'unknown';

export interface CodeBlock {
  /** File path as it appears in the diff (e.g. "src/components/Foo.tsx"). */
  filePath: string;
  /** The hunk header line, e.g. "@@ -10,5 +10,7 @@". */
  hunkHeader: string;
  /** The added + context lines (the body of the chunk). */
  body: string;
  /** Routing decision. */
  bucket: LanguageBucket;
  /** Line number in the new file where the chunk starts. */
  startLine: number;
}

export interface CopilotVerdict {
  isCompliant: boolean;
  issue: string;
  remediation: string;
}

export interface ChunkResult {
  block: CodeBlock;
  securityVerdict: CopilotVerdict;
  bucketVerdict: CopilotVerdict | null;
  /** True iff both overlays returned isCompliant: true. */
  isCompliant: boolean;
}

export interface PrContext {
  /** GitHub repo in "owner/name" form. */
  repo: string;
  /** PR number. */
  number: number;
  /** Head commit SHA. */
  sha: string;
  /** PR author login. */
  author: string;
}

export interface AggregateVerdict {
  isCompliant: boolean;
  results: ChunkResult[];
  totalChunks: number;
  violations: number;
}

export interface CopilotClientOptions {
  pat: string;
  endpoint?: string;
  integrationId?: string;
  timeoutMs?: number;
  maxRetries?: number;
}
