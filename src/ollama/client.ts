import { OllamaModel, OllamaResponse, OllamaError } from './types';

export class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async generate(
    model: string,
    prompt: string,
    options: {
      system?: string;
      template?: string;
      context?: number[];
      options?: {
        temperature?: number;
        top_p?: number;
        top_k?: number;
        num_ctx?: number;
        num_gpu?: number;
        num_thread?: number;
        repeat_penalty?: number;
        repeat_last_n?: number;
        seed?: number;
        stop?: string[];
        tfs_z?: number;
        num_predict?: number;
        mirostat?: number;
        mirostat_eta?: number;
        mirostat_tau?: number;
        penalize_newline?: boolean;
        presence_penalty?: number;
        frequency_penalty?: number;
        typical_p?: number;
      };
    } = {}
  ): Promise<OllamaResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        system: options.system,
        template: options.template,
        context: options.context,
        options: options.options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new OllamaError(error.error || 'Failed to generate response');
    }

    const data = await response.json();
    return {
      model: data.model,
      created_at: data.created_at,
      response: data.response,
      done: data.done,
      context: data.context,
      total_duration: data.total_duration,
      load_duration: data.load_duration,
      prompt_eval_duration: data.prompt_eval_duration,
      eval_duration: data.eval_duration,
      eval_count: data.eval_count,
    };
  }

  async listModels(): Promise<OllamaModel[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      const error = await response.json();
      throw new OllamaError(error.error || 'Failed to list models');
    }

    const data = await response.json();
    return data.models.map((model: any) => ({
      name: model.name,
      modified_at: model.modified_at,
      size: model.size,
      digest: model.digest,
      details: model.details,
    }));
  }

  async pullModel(model: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: model }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new OllamaError(error.error || 'Failed to pull model');
    }
  }

  async deleteModel(model: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: model }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new OllamaError(error.error || 'Failed to delete model');
    }
  }

  async showModel(model: string): Promise<OllamaModel> {
    const response = await fetch(`${this.baseUrl}/api/show`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: model }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new OllamaError(error.error || 'Failed to show model');
    }

    const data = await response.json();
    return {
      name: data.name,
      modified_at: data.modified_at,
      size: data.size,
      digest: data.digest,
      details: data.details,
    };
  }
} 