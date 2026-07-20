import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample realistic coordinates around Ho Chi Minh City (District 1, 3, 5, 7, 8, Binh Chanh, Tan Binh)
const sampleLocations = [
  { lat: 10.7523, lng: 106.6712, text: 'Quận 5, TP. Hồ Chí Minh' },
  { lat: 10.7411, lng: 106.6625, text: 'Quận 8, TP. Hồ Chí Minh' },
  { lat: 10.7325, lng: 106.6991, text: 'Quận 7, TP. Hồ Chí Minh' },
  { lat: 10.7651, lng: 106.6822, text: 'Quận 10, TP. Hồ Chí Minh' },
  { lat: 10.7289, lng: 106.6854, text: 'Quận 8, TP. Hồ Chí Minh' },
  { lat: 10.7782, lng: 106.6901, text: 'Quận 3, TP. Hồ Chí Minh' },
  { lat: 10.7598, lng: 106.6543, text: 'Quận 6, TP. Hồ Chí Minh' },
  { lat: 10.7485, lng: 106.6789, text: 'Quận 8, TP. Hồ Chí Minh' },
  { lat: 10.7366, lng: 106.7123, text: 'Quận 7, TP. Hồ Chí Minh' },
  { lat: 10.7612, lng: 106.6698, text: 'Quận 5, TP. Hồ Chí Minh' },
];

async function main() {
  console.log('🔍 Checking database for orders with missing or zero coordinates...');

  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
  });

  console.log(`📦 Total active orders in DB: ${orders.length}`);

  let updatedCount = 0;

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    let needUpdate = false;
    const updateData: any = {};

    const pickLoc = sampleLocations[i % sampleLocations.length];
    const delivLoc = sampleLocations[(i + 3) % sampleLocations.length];

    if (!order.pickupLatitude || !order.pickupLongitude || Math.abs(order.pickupLatitude) < 1) {
      updateData.pickupLatitude = pickLoc.lat + (Math.random() - 0.5) * 0.01;
      updateData.pickupLongitude = pickLoc.lng + (Math.random() - 0.5) * 0.01;
      if (!order.pickupAddressText) updateData.pickupAddressText = pickLoc.text;
      needUpdate = true;
    }

    if (!order.deliveryLatitude || !order.deliveryLongitude || Math.abs(order.deliveryLatitude) < 1) {
      updateData.deliveryLatitude = delivLoc.lat + (Math.random() - 0.5) * 0.01;
      updateData.deliveryLongitude = delivLoc.lng + (Math.random() - 0.5) * 0.01;
      if (!order.deliveryAddressText) updateData.deliveryAddressText = delivLoc.text;
      needUpdate = true;
    }

    if (needUpdate) {
      await prisma.order.update({
        where: { id: order.id },
        data: updateData,
      });
      updatedCount++;
      console.log(`  ✅ Updated Order [${order.orderCode}] with valid coordinates (${updateData.pickupLatitude ?? order.pickupLatitude}, ${updateData.pickupLongitude ?? order.pickupLongitude})`);
    }
  }

  console.log(`🎉 Finished! Updated ${updatedCount} orders with missing coordinates.`);
}

main()
  .catch((e) => {
    console.error('❌ Error updating order coordinates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
