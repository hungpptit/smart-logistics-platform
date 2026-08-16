import { prisma } from '../config/prisma';

async function main() {
  console.log('🔄 Checking and correcting Linehaul Routes & Shipments...');

  const wmTayNinh = await prisma.facility.findFirst({
    where: {
      OR: [
        { facilityCode: 'FAC-WM-TAYNINH' },
        { facilityCode: 'FAC_WM_TAYNINH' },
        { facilityName: { contains: 'Tây Ninh' } },
      ],
    },
    include: { address: true },
  });

  if (!wmTayNinh) {
    console.error('❌ Could not find Tây Ninh facility');
    return;
  }

  console.log('✅ Found Tây Ninh facility:', wmTayNinh.facilityCode, wmTayNinh.facilityName);

  // Find linehaul shipments that erroneously point to Thai Nguyen
  const thaiNguyenFac = await prisma.facility.findFirst({
    where: {
      OR: [
        { facilityCode: { contains: 'THAINGUYEN' } },
        { facilityName: { contains: 'Thái Nguyên' } },
      ],
    },
  });

  if (thaiNguyenFac) {
    const updatedShipments = await prisma.shipment.updateMany({
      where: { destinationFacilityId: thaiNguyenFac.id },
      data: { destinationFacilityId: wmTayNinh.id },
    });
    console.log(`✅ Corrected ${updatedShipments.count} shipments pointing to Thai Nguyen -> Tây Ninh`);

    const updatedRoutes = await prisma.route.updateMany({
      where: { endFacilityId: thaiNguyenFac.id },
      data: {
        endFacilityId: wmTayNinh.id,
        plannedDistanceKm: 88.5,
        plannedDurationMin: 95,
      },
    });
    console.log(`✅ Corrected ${updatedRoutes.count} routes pointing to Thai Nguyen -> Tây Ninh`);

    const updatedStops = await prisma.routeStop.updateMany({
      where: { facilityId: thaiNguyenFac.id },
      data: {
        facilityId: wmTayNinh.id,
        addressSnapshot: `${wmTayNinh.facilityName} - ${wmTayNinh.address?.addressLine1 || 'Dương Minh Châu, Tây Ninh'}`,
        latitude: wmTayNinh.address?.latitude ? Number(wmTayNinh.address.latitude) : 11.3520,
        longitude: wmTayNinh.address?.longitude ? Number(wmTayNinh.address.longitude) : 106.1820,
      },
    });
    console.log(`✅ Corrected ${updatedStops.count} route stops pointing to Thai Nguyen -> Tây Ninh`);
  }

  // Also check all route stops with latitude > 15 (in northern VN) for linehaul routes starting in HCM
  const northStops = await prisma.routeStop.findMany({
    where: {
      latitude: { gt: 15.0 },
      stopType: 'DELIVERY',
      route: {
        startFacility: {
          facilityCode: { in: ['FAC_SC_SOUTH', 'FAC-SC-SOUTH', 'FAC-HUB-HCM', 'FAC_HUB_HCM'] },
        },
      },
    },
  });

  for (const stop of northStops) {
    await prisma.routeStop.update({
      where: { id: stop.id },
      data: {
        facilityId: wmTayNinh.id,
        addressSnapshot: `${wmTayNinh.facilityName} - ${wmTayNinh.address?.addressLine1 || 'Dương Minh Châu, Tây Ninh'}`,
        latitude: wmTayNinh.address?.latitude ? Number(wmTayNinh.address.latitude) : 11.3520,
        longitude: wmTayNinh.address?.longitude ? Number(wmTayNinh.address.longitude) : 106.1820,
      },
    });
    console.log(`✅ Corrected northern stop ID ${stop.id} to Tây Ninh`);
  }

  console.log('🎉 Done fixing Linehaul destinations!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
