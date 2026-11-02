import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const candidates = [
  'minimaxai/minimax-m3.1-flash',
  'z-ai/glm-5.3-flash',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'nvidia/nemotron-3.5-bolt-e4b',
  'deepseek-ai/deepseek-v4.1-flash',
];

async function pingModel(model: string) {
  const start = Date.now();
  process.stdout.write(`Đang ping ${model}... `);
  try {
    const res = await axios.post(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: 'Xin chào, bạn là AI nào?' }],
        max_tokens: 60,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );
    const time = ((Date.now() - start) / 1000).toFixed(2);
    const content = res.data.choices[0]?.message?.content?.replace(/\n/g, ' ') || '';
    console.log(`✅ OK (${time}s): "${content.slice(0, 80)}..."`);
    return { model, ok: true, time, content };
  } catch (err: any) {
    const time = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`❌ Lỗi (${time}s): ${err.response?.status || err.message}`);
    return { model, ok: false, time, error: err.message };
  }
}

async function main() {
  console.log('--- KIỂM TRA ĐỘ TRỄ CÁC MODEL CHAT TRÊN NVIDIA NIM ---');
  for (const model of candidates) {
    await pingModel(model);
  }
}

main();

