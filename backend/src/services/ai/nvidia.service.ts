import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Readable } from 'stream';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

export interface ChatTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ChatCompletionOptions {
  model?: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  tools?: ChatTool[];
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class NvidiaAIService {
  private client: AxiosInstance;
  private defaultModel: string;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.baseUrl = (process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
    this.apiKey = process.env.NVIDIA_API_KEY || '';
    this.defaultModel = process.env.NVIDIA_CHAT_MODEL || 'nvidia/nemotron-3.5-super-vl-120b-a12b';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000,
    });
  }

  /**
   * Cập nhật API Key hoặc Model linh hoạt khi runtime
   */
  public configure(apiKey?: string, model?: string, baseUrl?: string): void {
    if (apiKey) this.apiKey = apiKey;
    if (model) this.defaultModel = model;
    if (baseUrl) {
      this.baseUrl = baseUrl.replace(/\/+$/, '');
      this.client.defaults.baseURL = this.baseUrl;
    }
  }

  public getModel(): string {
    return this.defaultModel;
  }

  /**
   * Gọi Chat Completion không stream (trả về toàn bộ response)
   */
  public async createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const activeApiKey = this.getApiKey();
    const activeModel = options.model || process.env.NVIDIA_CHAT_MODEL || this.defaultModel;

    const payload: Record<string, any> = {
      model: activeModel,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 0.95,
      stream: false,
    };

    if (options.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      payload.tool_choice = 'auto';
    }

    try {
      const response: AxiosResponse<ChatCompletionResponse> = await this.client.post(
        '/chat/completions',
        payload,
        {
          headers: {
            Authorization: `Bearer ${activeApiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      this.handleApiError(error, payload.model);
      throw error;
    }
  }

  /**
   * Gọi Chat Completion với chế độ Streaming (Server-Sent Events)
   */
  public async createChatCompletionStream(options: ChatCompletionOptions): Promise<Readable> {
    const activeApiKey = this.getApiKey();
    const activeModel = options.model || process.env.NVIDIA_CHAT_MODEL || this.defaultModel;

    const payload: Record<string, any> = {
      model: activeModel,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 0.95,
      stream: true,
    };

    if (options.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      payload.tool_choice = 'auto';
    }

    try {
      const response = await this.client.post('/chat/completions', payload, {
        headers: {
          Authorization: `Bearer ${activeApiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        responseType: 'stream',
      });

      return response.data as Readable;
    } catch (error: any) {
      this.handleApiError(error, payload.model);
      throw error;
    }
  }

  /**
   * Helper sinh nhanh câu trả lời văn bản từ prompt hệ thống và câu hỏi
   */
  public async quickChat(
    systemPrompt: string,
    userQuery: string,
    options?: Partial<ChatCompletionOptions>
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery },
    ];

    const response = await this.createChatCompletion({
      ...options,
      messages,
    });

    const msg = response.choices[0]?.message as any;
    return msg?.content || msg?.reasoning_content || '';
  }

  private getApiKey(): string {
    const key = this.apiKey || process.env.NVIDIA_API_KEY || '';
    if (!key || key.trim() === '' || key === 'your_nvidia_api_key_here') {
      throw new Error(
        'NVIDIA_API_KEY chưa được cấu hình. Vui lòng thêm NVIDIA_API_KEY=nvapi-... vào file backend/.env'
      );
    }
    return key;
  }

  private handleApiError(error: any, modelName: string): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      console.error(`[NvidiaAIService] API Error ${status} for model ${modelName}:`, data);
    } else {
      console.error(`[NvidiaAIService] Request failed: ${error.message}`);
    }
  }
}

export const nvidiaAIService = new NvidiaAIService();

