import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface EmbeddingOptions {
  model?: string;
  inputType?: 'passage' | 'query';
  truncate?: 'NONE' | 'START' | 'END';
  modality?: string[];
}

export interface EmbeddingResponseItem {
  object: string;
  index: number;
  embedding: number[];
}

export interface EmbeddingApiResponse {
  object: string;
  data: EmbeddingResponseItem[];
  model: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class NvidiaEmbeddingService {
  private client: AxiosInstance;
  private defaultModel: string;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.baseUrl = (process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
    this.apiKey = process.env.NVIDIA_API_KEY || '';
    this.defaultModel = process.env.NVIDIA_EMBED_MODEL || 'nvidia/nemotron-3.5-embed-8b';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000,
    });
  }

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
   * Tạo vector embedding cho 1 đoạn văn bản
   * @param text Văn bản cần embed
   * @param inputType 'passage' (dùng cho tài liệu lưu trữ) hoặc 'query' (dùng cho câu hỏi tìm kiếm)
   */
  public async createEmbedding(
    text: string,
    inputType: 'passage' | 'query' = 'passage',
    options?: Partial<EmbeddingOptions>
  ): Promise<number[]> {
    const results = await this.createEmbeddings([text], inputType, options);
    if (!results || results.length === 0) {
      throw new Error('[EmbeddingService] Không nhận được vector embedding từ NVIDIA NIM API.');
    }
    return results[0];
  }

  /**
   * Tạo vector embedding theo danh sách (batch) văn bản
   */
  public async createEmbeddings(
    texts: string[],
    inputType: 'passage' | 'query' = 'passage',
    options?: Partial<EmbeddingOptions>
  ): Promise<number[][]> {
    const activeApiKey = this.getApiKey();

    if (!texts || texts.length === 0) {
      return [];
    }

    const model = options?.model || this.defaultModel;
    const resolvedInputType = options?.inputType || inputType;
    const truncate = options?.truncate || 'END';

    // Payload tương thích chuẩn NVIDIA NIM OpenAI REST API
    const payload: Record<string, any> = {
      model,
      input: texts,
      encoding_format: 'float',
      input_type: resolvedInputType,
      truncate,
    };

    if (options?.modality) {
      payload.modality = options.modality;
    }

    try {
      const response: AxiosResponse<EmbeddingApiResponse> = await this.client.post(
        '/embeddings',
        payload,
        {
          headers: {
            Authorization: `Bearer ${activeApiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      // Sắp xếp lại theo đúng index ban đầu để đảm bảo thứ tự
      const items = response.data.data.sort((a, b) => a.index - b.index);
      return items.map((item) => item.embedding);
    } catch (error: any) {
      this.handleApiError(error, model);
      throw error;
    }
  }

  /**
   * Tính độ tương đồng Cosine Similarity giữa hai vector: Cosine(A, B) = (A . B) / (||A|| * ||B||)
   * Giá trị trả về từ -1 đến 1 (càng gần 1 càng tương đồng cao).
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error(`Độ dài hai vector không khớp nhau: ${vecA.length} vs ${vecB.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Kiểm tra khả năng kết nối tới Endpoint NVIDIA NIM
   * Kiểm tra xem máy chủ có phản hồi không (ngay cả khi chưa có API key thực tế)
   */
  public async probeEndpoint(): Promise<{ reachable: boolean; status?: number; message: string }> {
    try {
      const testPayload = {
        model: this.defaultModel,
        input: ['probe connection test'],
        encoding_format: 'float',
      };

      const response = await this.client.post('/embeddings', testPayload, {
        headers: {
          Authorization: `Bearer ${this.apiKey || 'nvapi-dummy-probe-key'}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true, // Không ném exception với mọi HTTP status
      });

      if (response.status === 200) {
        return {
          reachable: true,
          status: response.status,
          message: 'Kết nối thành công tới NVIDIA NIM và xác thực API Key hợp lệ!',
        };
      } else if (response.status === 401) {
        return {
          reachable: true,
          status: response.status,
          message:
            'Đã kết nối thành công tới NVIDIA NIM Endpoint (Máy chủ NVIDIA phản hồi HTTP 401 Unauthorized do API Key đang chờ điền). Endpoint hoạt động hoàn hảo!',
        };
      } else {
        return {
          reachable: true,
          status: response.status,
          message: `Endpoint phản hồi mã HTTP ${response.status}: ${JSON.stringify(response.data)}`,
        };
      }
    } catch (error: any) {
      return {
        reachable: false,
        message: `Không thể kết nối tới NVIDIA NIM Endpoint: ${error.message}`,
      };
    }
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
      console.error(`[NvidiaEmbeddingService] API Error ${status} for model ${modelName}:`, data);
    } else {
      console.error(`[NvidiaEmbeddingService] Request failed: ${error.message}`);
    }
  }
}

export const nvidiaEmbeddingService = new NvidiaEmbeddingService();

