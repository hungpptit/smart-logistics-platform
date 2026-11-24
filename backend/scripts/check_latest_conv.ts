import { prisma } from '../src/config/prisma';

async function main() {
  const conv = await prisma.chatConversation.findFirst({
    orderBy: { updatedAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });

  console.log('Conv ID:', conv?.id);
  console.log('Status:', conv?.status);
  console.log('Messages count:', conv?.messages?.length);
  conv?.messages?.forEach((m, idx) => {
    console.log(`[${idx}] id: ${m.id}, role: ${m.role}, content: "${m.content?.slice(0, 60)}...", len: ${m.content?.length}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
