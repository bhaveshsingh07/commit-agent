import { AIClientOptions, AIVerdict } from './types';

/**
 * Universal AI client supporting multiple providers:
 * - GitHub Copilot
 * - Anthropic Claude (Sonnet, Opus, Haiku)
 * - OpenAI ChatGPT (GPT-4, GPT-4 Turbo, GPT-3.5)
 * - Azure OpenAI
 * - Custom OpenAI-compatible APIs (Groq, Together, local models)
 */
export class AIClient {
  private readonly provider: string;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(opts: AIClientOptions) {
    this.provider = opts.provider || 'copilot';
    this.model = opts.model || this.getDefaultModel();
    this.apiKey = opts.apiKey || '';
    this.baseUrl = opts.baseUrl || this.getDefaultBaseUrl();
    this.timeoutMs = opts.timeoutMs || 30_000;
    this.maxRetries = opts.maxRetries || 2;

    if (!this.apiKey) {
      throw new Error(`API key required for provider: ${this.provider}`);
    }
  }

  private getDefaultModel(): string {
    switch (this.provider) {
      case 'copilot':
        return 'gpt-4o';
      case 'claude':
        return 'claude-sonnet-4-20250514';
      case 'openai':
        return 'gpt-4o';
      case 'azure':
        return 'gpt-4';
      default:
        return 'gpt-4o';
    }
  }

  private getDefaultBaseUrl(): string {
    switch (this.provider) {
      case 'copilot':
        return 'https://api.githubcopilot.com/chat/completions';
      case 'claude':
        return 'https://api.anthropic.com/v1/messages';
      case 'openai':
        return 'https://api.openai.com/v1/chat/completions';
      case 'azure':
        return '';
      default:
        return 'https://api.openai.com/v1/chat/completions';
    }
  }

  async evaluate(systemPrompt: string, userContent: string): Promise<AIVerdict> {
    let lastError: unknown = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const text = await this.callProvider(systemPrompt, userContent);
        return this.parseStrict(text);
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          await sleep(500 * Math.pow(2, attempt));
          continue;
        }
      }
    }

    return {
      isCompliant: false,
      issue: `${this.provider} API unreachable or malformed: ${formatError(lastError)}`,
      remediation:
        'The scanner could not get a definitive verdict from the AI service. ' +
        'Re-run the workflow; if the failure persists, check the runner network or API key.',
    };
  }

  private async callProvider(system: string, user: string): Promise<string> {
    switch (this.provider) {
      case 'copilot':
        return this.callCopilot(system, user);
      case 'claude':
        return this.callClaude(system, user);
      case 'openai':
      case 'azure':
      case 'custom':
      default:
        return this.callOpenAI(system, user);
    }
  }

  private async callCopilot(system: string, user: string): Promise<string> {
    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    };

    const res = await this.fetchWithTimeout(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Copilot-Integration-Id': 'vscode-chat',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Copilot ${res.status}: ${await safeText(res)}`);
    }

    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  private async callClaude(system: string, user: string): Promise<string> {
    const body = {
      model: this.model,
      max_tokens: 800,
      system: system,
      messages: [{ role: 'user', content: user }],
      temperature: 0,
    };

    const res = await this.fetchWithTimeout(this.baseUrl, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Claude ${res.status}: ${await safeText(res)}`);
    }

    const data: any = await res.json();
    const content = data?.content?.[0]?.text;
    if (!content) {
      throw new Error('Claude response missing content[0].text');
    }
    return content;
  }

  private async callOpenAI(system: string, user: string): Promise<string> {
    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.provider === 'azure') {
      headers['api-key'] = this.apiKey;
    } else {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await this.fetchWithTimeout(this.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`${this.provider} ${res.status}: ${await safeText(res)}`);
    }

    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  private async fetchWithTimeout(
    url: string,
    opts: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    
    try {
      return await fetch(url, { ...opts, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private parseStrict(raw: string): AIVerdict {
    const cleaned = raw
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    let obj: any;
    try {
      obj = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`Non-JSON response: ${cleaned.slice(0, 200)}`);
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
