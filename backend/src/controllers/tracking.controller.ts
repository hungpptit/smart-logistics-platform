import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';

export class TrackingController {
  /**
   * Public Order Tracking Lookup Endpoint (No Auth Required)
   * GET /api/tracking/public/:code
   */
  public trackOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code } = req.params;
      if (!code || !code.trim()) {
        res.status(400).json({ success: false, message: 'Vui lòng nhập mã vận đơn.' });
        return;
      }

      const orderCodeClean = code.trim().toUpperCase();

      // 1. Query order from Prisma DB with exact relation names
      const order = await prisma.order.findUnique({
        where: { orderCode: orderCodeClean },
        include: {
          customer: true,
          pickupAddress: true,
          deliveryAddress: true,
          originFacility: { include: { address: true } },
          destinationFacility: { include: { address: true } },
          packages: true,
          payment: true,
          service: true,
          statusHistory: {
            orderBy: { createdAt: 'asc' },
          },
          routeStops: {
            include: {
              route: {
                include: {
                  driver: {
                    include: {
                      user: true,
                    },
                  },
                  vehicle: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        res.status(404).json({
          success: false,
          message: `Không tìm thấy mã vận đơn ${orderCodeClean} trên hệ thống.`,
        });
        return;
      }

      const senderName = order.customer?.fullName || order.customer?.companyName || 'Người gửi';
      const senderPhone = order.customer?.phone || 'N/A';

      // 2. Extract Route ID if assigned
      let activeRouteId: string | null = null;
      let driverName: string = 'Shipper';
      let vehiclePlate: string = 'Xe máy chuyên dụng';

      if (order.routeStops && order.routeStops.length > 0) {
        for (const rs of order.routeStops) {
          if (rs.route) {
            activeRouteId = rs.route.id;
            const driverStaff = rs.route.driver;
            if (driverStaff && driverStaff.fullName) {
              driverName = driverStaff.fullName;
            } else if (driverStaff && driverStaff.user) {
              driverName = driverStaff.user.username;
            }
            if (rs.route.vehicle) {
              vehiclePlate = rs.route.vehicle.plateNumber || vehiclePlate;
            }
            break;
          }
        }
      }

      // 3. Try reading live GPS location from Redis
      let liveGps: { latitude: number; longitude: number; recordedAt: string } | null = null;
      if (activeRouteId) {
        try {
          const redisData = await redis.get(`driver:location:${activeRouteId}`);
          if (redisData) {
            const parsed = JSON.parse(redisData);
            if (parsed.latitude && parsed.longitude) {
              liveGps = {
                latitude: parsed.latitude,
                longitude: parsed.longitude,
                recordedAt: parsed.recordedAt || new Date().toISOString(),
              };
            }
          }
        } catch (e) {
          console.warn('[TrackingController] Error reading Redis GPS location:', e);
        }
      }

      // 4. Comprehensive DB Status Mapping
      const statusMap: Record<string, { label: string; chipClass: string }> = {
        CREATED: { label: 'ĐÃ TẠO ĐƠN HÀNG', chipClass: 'created' },
        CONFIRMED: { label: 'ĐÃ XÁC NHẬN ĐƠN HÀNG', chipClass: 'confirmed' },
        ASSIGNED: { label: 'ĐÃ PHÂN CÔNG SHIPPER', chipClass: 'assigned' },
        PICKING_UP: { label: 'SHIPPER ĐANG ĐẾN LẤY HÀNG', chipClass: 'picking_up' },
        PICKED_UP: { label: 'ĐÃ LẤY HÀNG THÀNH CÔNG', chipClass: 'picked_up' },
        IN_FACILITY: { label: 'ĐÃ LƯU KHO BƯU CỤC', chipClass: 'in_facility' },
        READY_FOR_DISPATCH: { label: 'ĐÃ NHẬP KHO - SẴN SÀNG GIAO HÀNG', chipClass: 'ready' },
        DISPATCHED: { label: 'ĐÃ XUẤT KHO THỦ ĐỨC', chipClass: 'dispatched' },
        IN_TRANSIT: { label: 'ĐANG TRUNG CHUYỂN GIỮA KHO', chipClass: 'in_transit' },
        OUT_FOR_DELIVERY: { label: 'SHIPPER ĐANG GIAO HÀNG (XE MÁY 🏍️)', chipClass: 'out_for_delivery' },
        DELIVERED: { label: 'GIAO HÀNG THÀNH CÔNG', chipClass: 'delivered' },
        COMPLETED: { label: 'HOÀN TẤT ĐƠN HÀNG', chipClass: 'delivered' },
        CANCELLED: { label: 'ĐÃ HỦY ĐƠN HÀNG', chipClass: 'cancelled' },
      };

      const currentStatusInfo = statusMap[order.status] || { label: String(order.status), chipClass: 'default' };

      // 5. Construct Status History Timeline Events from DB Status History
      const timelineEvents = (order.statusHistory || []).map((h: any) => {
        let title = statusMap[h.status]?.label || h.status;
        let subtitle = h.note || 'Trạng thái được cập nhật trên hệ thống SLP';

        if (h.status === 'CREATED') subtitle = `Đơn hàng đã được tạo thành công bởi ${senderName}`;
        if (h.status === 'IN_FACILITY' || h.status === 'READY_FOR_DISPATCH') subtitle = `Hàng hóa đã phân loại và lưu kho tại ${order.destinationFacility?.facilityName || order.originFacility?.facilityName || 'Bưu cục phân phối'}`;
        if (h.status === 'IN_TRANSIT') subtitle = `Đơn hàng đang trên xe tải trung chuyển đến kho trung tâm`;
        if (h.status === 'OUT_FOR_DELIVERY') subtitle = `Shipper ${driverName} (${vehiclePlate}) đang chở sọt hàng đi giao`;
        if (h.status === 'DELIVERED' || h.status === 'COMPLETED') subtitle = `Đã giao thành công cho người nhận ${order.receiverName}`;

        return {
          status: h.status,
          title,
          subtitle,
          timestamp: new Date(h.createdAt).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          isCompleted: true,
        };
      });

      // Coordinates setup
      const senderLat = Number(order.pickupLatitude) || Number(order.pickupAddress?.latitude) || 10.857;
      const senderLng = Number(order.pickupLongitude) || Number(order.pickupAddress?.longitude) || 106.774;
      const receiverLat = Number(order.deliveryLatitude) || Number(order.deliveryAddress?.latitude) || 10.824;
      const receiverLng = Number(order.deliveryLongitude) || Number(order.deliveryAddress?.longitude) || 106.759;

      const originFacilityLat = Number(order.originFacility?.address?.latitude) || senderLat;
      const originFacilityLng = Number(order.originFacility?.address?.longitude) || senderLng;
      const destFacilityLat = Number(order.destinationFacility?.address?.latitude) || receiverLat;
      const destFacilityLng = Number(order.destinationFacility?.address?.longitude) || receiverLng;

      // Current Facility location (where package is currently stored if not out for delivery)
      const currentFacilityLat = destFacilityLat || originFacilityLat;
      const currentFacilityLng = destFacilityLng || originFacilityLng;
      const currentFacilityName = order.destinationFacility?.facilityName || order.originFacility?.facilityName || 'Bưu cục Phước Long';

      // Determine current driver / motorbike location
      const currentDriverLat = liveGps?.latitude || (order.status === 'OUT_FOR_DELIVERY' ? destFacilityLat : currentFacilityLat);
      const currentDriverLng = liveGps?.longitude || (order.status === 'OUT_FOR_DELIVERY' ? destFacilityLng : currentFacilityLng);

      const trackingPayload = {
        code: order.orderCode,
        status: order.status,
        statusLabel: currentStatusInfo.label,
        eta: order.scheduledPickupAt ? new Date(order.scheduledPickupAt).toLocaleDateString('vi-VN') : 'Dự kiến hôm nay',
        senderName: senderName,
        senderPhone: senderPhone,
        senderAddress: order.pickupAddressText || order.pickupAddress?.addressLine1 || '',
        receiverName: order.receiverName,
        receiverPhone: order.receiverPhone,
        receiverAddress: order.deliveryAddressText || order.deliveryAddress?.addressLine1 || '',
        originFacilityName: order.originFacility?.facilityName || 'Bưu cục Linh Trung',
        destinationFacilityName: currentFacilityName,
        driverName,
        vehiclePlate,
        routeId: activeRouteId,
        liveGps,
        coordinates: {
          sender: { lat: senderLat, lng: senderLng },
          originFacility: { lat: originFacilityLat, lng: originFacilityLng },
          destFacility: { lat: destFacilityLat, lng: destFacilityLng },
          currentFacility: { name: currentFacilityName, lat: currentFacilityLat, lng: currentFacilityLng },
          receiver: { lat: receiverLat, lng: receiverLng },
          currentDriver: { lat: currentDriverLat, lng: currentDriverLng },
        },
        timeline: timelineEvents,
      };

      res.status(200).json({
        success: true,
        message: 'Tra cứu thông tin vận đơn thành công',
        data: trackingPayload,
      });
    } catch (error) {
      next(error);
    }
  };
}
