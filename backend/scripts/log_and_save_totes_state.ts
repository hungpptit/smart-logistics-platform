import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function logAndBackupState() {
  console.log('🔍 Fetching current state of the 2 Totes and 3 Orders...');

  const toteCodes = [
    'TOTE-FAC_TD_TANGNHONPHU-ZONE-W-PROVINCE-DISPATCH-001',
    'TOTE-FAC_TD_TANGNHONPHU-ZONE-W-PROVINCE-DISPATCH-002',
  ];

  const orderCodes = [
    'ORD-9782000002',
    'ORD-1314000001',
    'ORD-0419000003',
  ];

  const totes = await prisma.toteBag.findMany({
    where: { toteCode: { in: toteCodes } },
    include: {
      facility: true,
      warehouseScans: {
        include: {
          package: {
            include: {
              order: true,
            },
          },
        },
      },
    },
  });

  const orders = await prisma.order.findMany({
    where: { orderCode: { in: orderCodes } },
    include: {
      package: true,
      routeStops: { include: { route: true } },
      statusHistory: true,
    },
  });

  console.log('\n=================== 📦 TOTES CURRENT STATE ===================');
  totes.forEach((t) => {
    // Unique packages from scans
    const pkgMap = new Map<string, any>();
    t.warehouseScans.forEach((scan) => {
      if (scan.package) {
        pkgMap.set(scan.package.id, scan.package);
      }
    });

    console.log(`Tote Code: ${t.toteCode}`);
    console.log(`  ID: ${t.id}`);
    console.log(`  Status: ${t.status}`);
    console.log(`  ZoneCode: ${t.zoneCode}`);
    console.log(`  Facility: ${t.facility?.facilityName || 'N/A'} (${t.facilityId})`);
    console.log(`  Packages Count: ${pkgMap.size}`);
    pkgMap.forEach((pkg) => {
      console.log(`    - PackageCode: ${pkg.packageCode}, OrderCode: ${pkg.order?.orderCode}, OrderStatus: ${pkg.order?.status}`);
    });
    console.log('--------------------------------------------------');
  });

  console.log('\n=================== 🛍️ ORDERS CURRENT STATE ===================');
  orders.forEach((o) => {
    console.log(`Order Code: ${o.orderCode}`);
    console.log(`  ID: ${o.id}`);
    console.log(`  Status: ${o.status}`);
    console.log(`  Package Code: ${o.package?.packageCode}`);
    console.log(`  RouteStops Count: ${o.routeStops.length}`);
    o.routeStops.forEach((rs) => {
      console.log(`    - StopType: ${rs.stopType}, Status: ${rs.status}, RouteCode: ${rs.route?.routeCode}, RouteStatus: ${rs.route?.status}`);
    });
    console.log('--------------------------------------------------');
  });

  // Save snapshot JSON
  const snapshot = {
    timestamp: new Date().toISOString(),
    totes,
    orders,
  };

  const snapshotPath = path.join(__dirname, 'totes_orders_snapshot.json');
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`\n✅ Snapshot saved to: ${snapshotPath}`);
}

logAndBackupState().finally(() => prisma.$disconnect());
