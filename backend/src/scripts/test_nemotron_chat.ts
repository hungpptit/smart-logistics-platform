import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const models = [
  'nvidia/nemotron-3.5-bolt-e4b',
  'nvidia/nemotron-3.5-lightning-30b-a3b',
  'nvidia/nemotron-3.5-super-vl-120b-a12b',
  'nvidia/nemotron-3-ultra-550b-a55b',
];

async function pingModel(model: string) {
  const start = Date.now();
  process.stdout.write(`Đang ping ${model}... `);
  try {
    const res = await axios.post(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: 'Xin chào, bạn có thể hỗ trợ gì cho ứng dụng giao hàng Smart Logistics?' }],
        max_tokens: 100,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 25000,
      }
    );
    const time = ((Date.now() - start) / 1000).toFixed(2);
    const content = res.data.choices[0]?.message?.content?.replace(/\n/g, ' ') || '';
    console.log(`✅ OK (${time}s):\n   "${content.slice(0, 120)}..."\n`);
  } catch (err: any) {
    const time = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`❌ Lỗi (${time}s): ${err.response?.status || err.message}\n`);
  }
}

async function main() {
  console.log('--- SO SÁNH CÁC MODEL CHAT NVIDIA NATIVE TRÊN NIM ---');
  for (const m of models) {
    await pingModel(m);
  }
}

main();

