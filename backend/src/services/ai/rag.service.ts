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

    // 1. Nạp cẩm nang tài xế (SHIPPER) từ thư mục driver/
    const driverDir = path.join(knowledgeDir, 'driver');
    const driverFiles = this.loadMarkdownFilesFromDir(driverDir);
    if (driverFiles.length === 0) {
      const driverPath = path.join(knowledgeDir, 'driver_handbook.md');
      if (fs.existsSync(driverPath)) {
        driverFiles.push({ name: 'driver_handbook.md', content: fs.readFileSync(driverPath, 'utf-8') });
      }
    }
    for (const f of driverFiles) {
      const prefix = f.name.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');
      const driverChunks = this.chunkMarkdown(f.content, 'SHIPPER', prefix);
      this.chunks.push(...driverChunks);
    }

    // 2. Nạp chính sách khách hàng (CUSTOMER) từ thư mục customer/
    const customerDir = path.join(knowledgeDir, 'customer');
    const customerFiles = this.loadMarkdownFilesFromDir(customerDir);
    if (customerFiles.length === 0) {
      const customerPath = path.join(knowledgeDir, 'customer_policies.md');
      if (fs.existsSync(customerPath)) {
        customerFiles.push({ name: 'customer_policies.md', content: fs.readFileSync(customerPath, 'utf-8') });
      }
    }
    for (const f of customerFiles) {
      const prefix = f.name.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');
      const customerChunks = this.chunkMarkdown(f.content, 'CUSTOMER', prefix);
      this.chunks.push(...customerChunks);
    }

    this.isInitialized = true;
    console.log(`[RagService] Đã nạp thành công ${this.chunks.length} phân đoạn tri thức (chunks) từ thư mục knowledge.`);

    // 3. Nếu có API key, tự động tạo embedding vector cho các chunks
    const hasKey =
      !!process.env.NVIDIA_API_KEY &&
      process.env.NVIDIA_API_KEY.trim() !== '' &&
      process.env.NVIDIA_API_KEY !== 'your_nvidia_api_key_here';

    if (hasKey) {
      await this.generateEmbeddings();
    }
  }

  private loadMarkdownFilesFromDir(dirPath: string): Array<{ name: string; content: string }> {
    if (!fs.existsSync(dirPath)) return [];
    const entries = fs.readdirSync(dirPath);
    const files: Array<{ name: string; content: string }> = [];
    for (const entry of entries) {
      if (entry.toLowerCase().endsWith('.md')) {
        const fullPath = path.join(dirPath, entry);
        if (fs.statSync(fullPath).isFile()) {
          files.push({
            name: entry,
            content: fs.readFileSync(fullPath, 'utf-8'),
          });
        }
      }
    }
    return files;
  }

  /**
   * Tạo vector embedding cho tất cả các chunk bằng NVIDIA Nemotron Embed 8B (có cache trên ổ đĩa)
   */
  public async generateEmbeddings(): Promise<void> {
    const cache = this.loadCache();
    let cacheHits = 0;
    let newlyComputed = 0;

    console.log('[RagService] Đang kiểm tra và đồng bộ vector embedding cho các chunks...');
    try {
      for (let i = 0; i < this.chunks.length; i++) {
        const chunk = this.chunks[i];
        const text = `${chunk.title}\n${chunk.content}`;
        const hash = this.simpleHash(text);

        if (cache[chunk.id] && cache[chunk.id].hash === hash && cache[chunk.id].embedding) {
          chunk.embedding = cache[chunk.id].embedding;
          cacheHits++;
        } else {
          const embedding = await nvidiaEmbeddingService.createEmbedding(text, 'passage');
          chunk.embedding = embedding;
          cache[chunk.id] = { hash, embedding };
          newlyComputed++;
        }
      }

      if (newlyComputed > 0) {
        this.saveCache(cache);
      }

      console.log(
        `[RagService] Hoàn tất nạp vector: ${cacheHits} từ cache, ${newlyComputed} tính toán mới. Tổng: ${this.chunks.length} chunks sẵn sàng.`
      );
    } catch (error: any) {
      console.warn(`[RagService] Chưa thể hoàn tất tính embedding (chuyển sang tìm kiếm từ khóa fallback): ${error.message}`);
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `${hash}_${str.length}`;
  }

  private getCachePath(): string {
    const cacheDir = path.resolve(__dirname, 'knowledge', '.cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    return path.join(cacheDir, 'embeddings.json');
  }

  private loadCache(): Record<string, { hash: string; embedding: number[] }> {
    const p = this.getCachePath();
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      } catch {
        return {};
      }
    }
    return {};
  }

  private saveCache(cache: Record<string, { hash: string; embedding: number[] }>): void {
    const p = this.getCachePath();
    try {
      fs.writeFileSync(p, JSON.stringify(cache));
    } catch (err: any) {
      console.warn('[RagService] Không thể lưu cache:', err.message);
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
   * Phân đoạn văn bản Markdown theo đề mục tiêu đề (#, ##, ###, ####) hoặc mã câu hỏi ID/Code
   */
  private chunkMarkdown(markdown: string, role: 'SHIPPER' | 'CUSTOMER', docPrefix: string): KnowledgeChunk[] {
    const lines = markdown.split(/\r?\n/);
    const chunks: KnowledgeChunk[] = [];

    let currentTitle = 'Tổng quan';
    let currentLines: string[] = [];
    let sectionIndex = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      const isHeader =
        /^#{1,4}\s+/.test(trimmed) ||
        trimmed.startsWith('ID: ') ||
        /^[A-Z]{3,4}-\d{3}/.test(trimmed);

      if (isHeader) {
        if (currentLines.length > 0) {
          const content = currentLines.join('\n').trim();
          if (content.length > 0) {
            chunks.push({
              id: `${docPrefix}_chunk_${sectionIndex}`,
              role,
              title: currentTitle,
              content,
            });
            sectionIndex++;
          }
        }
        currentTitle = trimmed.replace(/^#+\s*/, '');
        currentLines = [line];
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      const content = currentLines.join('\n').trim();
      if (content.length > 0) {
        chunks.push({
          id: `${docPrefix}_chunk_${sectionIndex}`,
          role,
          title: currentTitle,
          content,
        });
      }
    }

    // Nếu văn bản không có tiêu đề markdown chuẩn (chỉ có 1 chunk lớn duy nhất)
    // thì tự động chia nhỏ theo từng đoạn văn (paragraphs)
    if (chunks.length <= 1 && markdown.length > 1000) {
      const paragraphs = markdown.split(/\r?\n\s*\r?\n/);
      const refinedChunks: KnowledgeChunk[] = [];
      let pIdx = 1;
      let buffer: string[] = [];

      for (const p of paragraphs) {
        const pTrimmed = p.trim();
        if (!pTrimmed) continue;
        buffer.push(pTrimmed);

        // Gom khoảng 2-3 đoạn ngắn thành 1 chunk ~150-250 từ
        if (buffer.join('\n\n').split(/\s+/).length >= 100) {
          const text = buffer.join('\n\n');
          refinedChunks.push({
            id: `${docPrefix}_para_${pIdx}`,
            role,
            title: buffer[0].slice(0, 60),
            content: text,
          });
          pIdx++;
          buffer = [];
        }
      }

      if (buffer.length > 0) {
        refinedChunks.push({
          id: `${docPrefix}_para_${pIdx}`,
          role,
          title: buffer[0].slice(0, 60),
          content: buffer.join('\n\n'),
        });
      }

      if (refinedChunks.length > 1) {
        return refinedChunks;
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

