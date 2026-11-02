import fs from 'fs';
import path from 'path';
import { nvidiaEmbeddingService } from './embedding.service';

export interface KnowledgeChunk {
  id: string;
  role: 'SHIPPER' | 'CUSTOMER';
  title: string;
  content: string;
  embedding?: number[];
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  score: number;
}

export class RagService {
  private chunks: KnowledgeChunk[] = [];
  private isInitialized = false;

  constructor() {}

  /**
   * Khởi tạo và nạp các tài liệu tri thức vào bộ nhớ
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.chunks = [];
    const knowledgeDir = path.resolve(__dirname, 'knowledge');

    // 1. Nạp cẩm nang tài xế (SHIPPER)
    const driverPath = path.join(knowledgeDir, 'driver_handbook.md');
    if (fs.existsSync(driverPath)) {
      const content = fs.readFileSync(driverPath, 'utf-8');
      const driverChunks = this.chunkMarkdown(content, 'SHIPPER', 'driver_handbook');
      this.chunks.push(...driverChunks);
    }

    // 2. Nạp chính sách khách hàng (CUSTOMER)
    const customerPath = path.join(knowledgeDir, 'customer_policies.md');
    if (fs.existsSync(customerPath)) {
      const content = fs.readFileSync(customerPath, 'utf-8');
      const customerChunks = this.chunkMarkdown(content, 'CUSTOMER', 'customer_policies');
      this.chunks.push(...customerChunks);
    }

    this.isInitialized = true;
    console.log(`[RagService] Đã nạp ${this.chunks.length} phân đoạn tri thức (chunks) vào bộ nhớ.`);

    // 3. Nếu có API key, tự động tạo embedding vector cho các chunks
    const hasKey =
      !!process.env.NVIDIA_API_KEY &&
      process.env.NVIDIA_API_KEY.trim() !== '' &&
      process.env.NVIDIA_API_KEY !== 'your_nvidia_api_key_here';

    if (hasKey) {
      await this.generateEmbeddings();
    }
  }

  /**
   * Tạo vector embedding cho tất cả các chunk bằng NVIDIA Nemotron Embed 8B
   */
  public async generateEmbeddings(): Promise<void> {
    console.log('[RagService] Đang tính toán vector embedding với nvidia/nemotron-3.5-embed-8b...');
    try {
      for (let i = 0; i < this.chunks.length; i++) {
        const text = `${this.chunks[i].title}\n${this.chunks[i].content}`;
        const embedding = await nvidiaEmbeddingService.createEmbedding(text, 'passage');
        this.chunks[i].embedding = embedding;
      }
      console.log(`[RagService] Đã tạo thành công vector embedding cho ${this.chunks.length} chunks.`);
    } catch (error: any) {
      console.warn(`[RagService] Chưa thể sinh embedding: ${error.message}`);
    }
  }

  /**
   * Tìm kiếm các đoạn tri thức liên quan nhất tới câu hỏi của người dùng
   */
  public async search(
    role: 'SHIPPER' | 'CUSTOMER',
    query: string,
    topK: number = 3
  ): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Lọc theo vai trò (Tài xế hoặc Khách hàng)
    const candidateChunks = this.chunks.filter((c) => c.role === role);
    if (candidateChunks.length === 0) return [];

    // Kiểm tra xem đã có vector embedding chưa
    const hasEmbeddings = candidateChunks.some((c) => c.embedding && c.embedding.length > 0);
    const hasKey =
      !!process.env.NVIDIA_API_KEY &&
      process.env.NVIDIA_API_KEY.trim() !== '' &&
      process.env.NVIDIA_API_KEY !== 'your_nvidia_api_key_here';

    if (hasKey && hasEmbeddings) {
      // 1. Chế độ Semantic Vector Search (Độ chính xác cao nhất)
      try {
        const queryVector = await nvidiaEmbeddingService.createEmbedding(query, 'query');
        const scored = candidateChunks.map((chunk) => {
          const score = chunk.embedding
            ? nvidiaEmbeddingService.cosineSimilarity(queryVector, chunk.embedding)
            : 0;
          return { chunk, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK);
      } catch (err: any) {
        console.warn(`[RagService] Lỗi khi tạo query embedding, chuyển sang tìm kiếm từ khóa fallback: ${err.message}`);
      }
    }

    // 2. Chế độ Fallback: Keyword & N-gram Token Overlap (hoạt động ngay cả khi chưa có API key)
    return this.fallbackKeywordSearch(candidateChunks, query, topK);
  }

  /**
   * Định dạng các đoạn trích xuất thành chuỗi ngữ cảnh đưa vào Prompt của LLM
   */
  public formatContextForPrompt(results: SearchResult[]): string {
    if (!results || results.length === 0) return '';

    return results
      .map((r, idx) => `[Tài liệu tham khảo #${idx + 1}: ${r.chunk.title}]\n${r.chunk.content}`)
      .join('\n\n---\n\n');
  }

  /**
   * Phân đoạn văn bản Markdown theo đề mục tiêu đề cấp 2 (##)
   */
  private chunkMarkdown(markdown: string, role: 'SHIPPER' | 'CUSTOMER', docPrefix: string): KnowledgeChunk[] {
    const lines = markdown.split(/\r?\n/);
    const chunks: KnowledgeChunk[] = [];

    let currentTitle = 'Tổng quan';
    let currentLines: string[] = [];
    let sectionIndex = 1;

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentLines.length > 0) {
          const content = currentLines.join('\n').trim();
          if (content.length > 0) {
            chunks.push({
              id: `${docPrefix}_section_${sectionIndex}`,
              role,
              title: currentTitle,
              content,
            });
            sectionIndex++;
          }
        }
        currentTitle = line.replace('## ', '').trim();
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      const content = currentLines.join('\n').trim();
      if (content.length > 0) {
        chunks.push({
          id: `${docPrefix}_section_${sectionIndex}`,
          role,
          title: currentTitle,
          content,
        });
      }
    }

    return chunks;
  }

  /**
   * Thuật toán tìm kiếm từ khóa fallback (khi chưa có API Key)
   */
  private fallbackKeywordSearch(
    candidateChunks: KnowledgeChunk[],
    query: string,
    topK: number
  ): SearchResult[] {
    const queryTokens = query
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 1);

    const scored = candidateChunks.map((chunk) => {
      const targetText = `${chunk.title} ${chunk.content}`.toLowerCase();
      let matchCount = 0;

      for (const token of queryTokens) {
        if (targetText.includes(token)) {
          matchCount++;
          // Tăng trọng số nếu từ khóa nằm trong tiêu đề
          if (chunk.title.toLowerCase().includes(token)) {
            matchCount += 2;
          }
        }
      }

      const score = queryTokens.length > 0 ? matchCount / (queryTokens.length * 2) : 0;
      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}

export const ragService = new RagService();

