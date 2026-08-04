/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

declare const process: any;

const prisma = new PrismaClient();

async function cleanData() {
  console.log('🧹 Starting cleanup of mock operational data...');

  try {
    // 1. Clean Tracking, POD & Scans
    console.log('  ❌ Cleaning Tracking, POD & Scan attachments...');
    await prisma.trackingAttachment.deleteMany({});
    await prisma.deliveryProof.deleteMany({});
    await prisma.barcodeScan.deleteMany({});
    await prisma.trackingEvent.deleteMany({});

    // 2. Clean Route, Dispatch & Shipment Transfers
    console.log('  ❌ Cleaning Dispatch tasks, Route stops & Shipment transfers...');
    await prisma.dispatchTask.deleteMany({});
    await prisma.routeStop.deleteMany({});
    await prisma.shipmentTransfer.deleteMany({});
    await prisma.shipmentPackage.deleteMany({});
    await prisma.shipment.deleteMany({});
    await prisma.route.deleteMany({});
    await prisma.routeOptimization.deleteMany({});

    // 3. Clean Orders & Packages
    console.log('  ❌ Cleaning Order history, Payments, Packages & Orders...');
    await prisma.orderStatusHistory.deleteMany({});
    await prisma.orderPayment.deleteMany({});
    await prisma.package.deleteMany({});
    await prisma.order.deleteMany({});

    // 4. Clean Drivers, Vehicles & Facilities
    console.log('  ❌ Cleaning Vehicle assignments, Drivers, Vehicles & Facilities...');
    await prisma.driverVehicleAssignment.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.driverLocation.deleteMany({});
    await prisma.staff.deleteMany({});
    await prisma.facilityZone.deleteMany({});
    await prisma.facility.deleteMany({});

    // 5. Clean Customer profiles & Addresses
    console.log('  ❌ Cleaning Customer addresses, contacts, customers & address book...');
    await prisma.customerAddress.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.address.deleteMany({});

    // 6. Clean Non-Standard Test Users
    console.log('  ❌ Cleaning mock users (preserving standard test accounts)...');
    const standardUsernames = ['admin', 'dispatcher', 'Tài xế giao hàng (Shipper)', 'customer'];
    await prisma.user.deleteMany({
      where: {
        username: {
          notIn: standardUsernames
        }
      }
    });

    console.log('✅ Cleaned all mock test data successfully! Master data & Admin Units remain intact.');
  } catch (error) {
    console.error('❌ Error during data cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanData();
