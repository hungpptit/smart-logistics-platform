import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const routes = await prisma.route.findMany({
    include: {
      stops: {
        include: {
          shipment: {
            include: { shipmentTransfers: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  for (const r of routes) {
    console.log('Route:', r.routeCode, '| status:', r.status);
    for (const stop of r.stops) {
      const sh = stop.shipment;
      console.log('  Stop:', stop.stopType, '| status:', stop.status, '| shipment:', sh?.shipmentCode, `(${sh?.status})`);
      const transfers = sh?.shipmentTransfers || [];
      console.log('    Transfers:', JSON.stringify(transfers.map(t => ({ status: t.status, dispatchedAt: t.dispatchedAt }))));
    }
  }
}

main().finally(() => prisma.$disconnect());
