import { CopilotClientOptions, CopilotVerdict } from './types';

const DEFAULT_ENDPOINT = 'https://api.githubcopilot.com/chat/completions';
const DEFAULT_INTEGRATION_ID = 'vscode-chat';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;

/**
 * Thin client over the GitHub Copilot programmatic completions API.
 * Returns a strictly-shaped CopilotVerdict or throws.
 */
export class CopilotClient {
  private readonly endpoint: string;
  private readonly integrationId: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly pat: string;

  constructor(opts: CopilotClientOptions) {
    if (!opts.pat) {
      throw new Error('COPILOT_PAT is required');
    }
    this.pat = opts.pat;
    this.endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;
    this.integrationId = opts.integrationId ?? DEFAULT_INTEGRATION_ID;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  async evaluate(systemPrompt: string, userContent: string): Promise<CopilotVerdict> {
    const body = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0,
      max_tokens: 800,
      response_format: { type: 'json_object' as const },
    };

    let lastError: unknown = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const text = await this.postOnce(body);
        return this.parseStrict(text);
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          await sleep(500 * Math.pow(2, attempt));
          continue;
        }
      }
    }
    // Fail-closed: any unrecoverable error becomes a non-compliant verdict
    return {
      isCompliant: false,
      issue: `Copilot API unreachable or malformed: ${formatError(lastError)}`,
      remediation:
        'The scanner could not get a definitive verdict from the AI service. ' +
        'Re-run the workflow; if the failure persists, check the runner network or rotate COPILOT_PAT.',
    };
  }

  private async postOnce(body: unknown): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.pat}`,
          'Copilot-Integration-Id': this.integrationId,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await safeText(res);
        throw new Error(`Copilot API ${res.status}: ${errText}`);
      }

      const data: any = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('Copilot response missing choices[0].message.content');
      }
      return content;
    } finally {
      clearTimeout(timer);
    }
  }

  private parseStrict(raw: string): CopilotVerdict {
    // Strip code fences just in case the model misbehaves
    const cleaned = raw
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    let obj: any;
    try {
      obj = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`Non-JSON response from Copilot: ${cleaned.slice(0, 200)}`);
    }

    if (typeof obj.isCompliant !== 'boolean') {
      throw new Error('Response missing boolean isCompliant');
    }
    return {
      isCompliant: obj.isCompliant,
      issue: typeof obj.issue === 'string' ? obj.issue : '',
      remediation: typeof obj.remediation === 'string' ? obj.remediation : '',
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '<unreadable>';
  }
}
