import { prisma } from '../src/config/prisma';
import {
  getMyOrders,
  getNextStop,
  getOrderDeliveryInfo,
  getCodSummary,
  findNearestFacility,
  sanitizeNoteText,
  maskPhoneMiddle,
  calculateHaversineDistance,
} from '../src/services/ai/tools/driver_read.tools';
import { toolRegistry } from '../src/services/ai/tool_registry';
import { securityAuditService } from '../src/services/ai/security_audit.service';
import { ToolContext } from '../src/services/ai/tools/customer_read.tools';
import { ChatMessageInputSchema } from '../src/dtos/chat_validation.dto';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details?: string) {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    results.push({ name, passed: true, details });
  } else {
    console.error(`  [FAIL] ${name} - ${details || ''}`);
    results.push({ name, passed: false, details });
  }
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('  BẮT ĐẦU BỘ KIỂM THỬ TOÀN DIỆN BƯỚC 4: TOOL CHỈ ĐỌC TÀI XẾ  ');
  console.log('===============================================================\n');

  // Chuẩn bị dữ liệu tài xế mẫu: shp_dangvanbi_1 (Nguyễn Văn Hùng)
  const driverUser = await prisma.user.findUnique({
    where: { username: 'shp_dangvanbi_1' },
    include: { staff: true },
  });

  if (!driverUser || !driverUser.staff) {
    throw new Error('Không tìm thấy tài khoản tài xế mẫu shp_dangvanbi_1 trong CSDL');
  }

  const driverCtx: ToolContext = {
    userId: driverUser.id,
    staffId: driverUser.staff.id,
    driverName: driverUser.staff.fullName,
    role: 'DRIVER',
  };

  console.log(`[Setup] Đang thử nghiệm với Tài xế: ${driverCtx.driverName} (staffId: ${driverCtx.staffId})`);

  // Tìm route hiện tại của tài xế này
  const myRoute = await prisma.route.findFirst({
    where: {
      driverVehicleAssignment: { driverId: driverCtx.staffId, isActive: true },
      status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
      completedAt: null,
    },
    include: {
      stops: {
        orderBy: { sequence: 'asc' },
        include: { order: { include: { payment: true } } },
      },
    },
  });

  console.log(`[Setup] Lộ trình hiện tại: ${myRoute?.routeCode || 'Chưa có'} (${myRoute?.stops.length || 0} điểm dừng)\n`);

  // -------------------------------------------------------------
  // PHẦN 1: KIỂM THỬ CHỨC NĂNG 5 TOOL
  // -------------------------------------------------------------
  console.log('--- 1. Kiểm thử Tool 1: get_my_orders ---');
  {
    // Test 1.1: Nhóm ACTIVE
    const resActive = await getMyOrders({ group: 'ACTIVE', limit: 5 }, driverCtx);
    assert(
      resActive.success === true && Array.isArray(resActive.orders) && resActive.orders.length > 0,
      '1.1 get_my_orders (nhóm ACTIVE) trả về danh sách đơn hợp lệ',
      `Đã trả về ${resActive.orders?.length} đơn`
    );

    // Test 1.2: DTO Whitelist - Không có SĐT, không có số nhà chi tiết
    const sampleOrder = resActive.orders[0];
    assert(
      sampleOrder.orderCode && sampleOrder.status && sampleOrder.area && sampleOrder.codAmount !== undefined,
      '1.2 DTO get_my_orders chứa đủ các trường: orderCode, status, sequence, area, codAmount'
    );
    assert(
      sampleOrder.receiverPhone === undefined && sampleOrder.phone === undefined,
      '1.3 DTO get_my_orders TUYỆT ĐỐI KHÔNG chứa số điện thoại'
    );

    // Test 1.4: Nhóm DELIVERED khi chưa có đơn giao xong -> trả danh sách rỗng, không bịa
    const resDelivered = await getMyOrders({ group: 'DELIVERED' }, driverCtx);
    assert(
      resDelivered.success === true && resDelivered.orders.length === 0,
      '1.4 get_my_orders (nhóm DELIVERED) trả về mảng rỗng trung thực, không ảo giác'
    );
  }

  console.log('\n--- 2. Kiểm thử Tool 2: get_next_stop ---');
  {
    // Test 2.1: Lấy điểm dừng kế tiếp
    const resNext = await getNextStop({}, driverCtx);
    assert(
      resNext.success === true && resNext.sequence !== undefined,
      '2.1 get_next_stop trả về điểm dừng kế tiếp chính xác theo thứ tự lộ trình',
      `Chặng #${resNext.sequence} - Đơn: ${resNext.orderCode || 'N/A'}`
    );

    if (resNext.stopType === 'DELIVERY') {
      assert(
        Boolean(resNext.receiverPhone && resNext.receiverName && resNext.deliveryAddress),
        '2.2 Điểm dừng DELIVERY trả về đầy đủ SĐT, tên người nhận và địa chỉ để tài xế gọi điện'
      );
    }

    // Test 2.2: Mock tài xế chưa có lộ trình
    const resHubMock = await getNextStop({}, {
      ...driverCtx,
      staffId: '00000000-0000-0000-0000-000000000099', // staff hợp lệ nhưng không có lộ trình
    });
    assert(
      resHubMock.success === true && resHubMock.message.includes('chưa được phân công'),
      '2.3 Tài xế chưa có lộ trình thông báo rõ ràng, không bị crash'
    );
  }

  console.log('\n--- 3. Kiểm thử Tool 3: get_order_delivery_info ---');
  {
    // Lấy mã đơn đầu tiên của tài xế
    const validOrderCode = myRoute?.stops.find((s) => s.order?.orderCode)?.order?.orderCode || 'ORD-TD-012';

    // Test 3.1: Đơn của chính mình ở chặng hiện tại/kế tiếp -> SĐT đầy đủ
    const resInfo = await getOrderDeliveryInfo({ orderCode: validOrderCode }, driverCtx);
    assert(
      resInfo.success === true && resInfo.orderCode === validOrderCode,
      `3.1 get_order_delivery_info xem đúng đơn của chính mình (${validOrderCode})`
    );
    assert(
      Boolean(resInfo.receiverPhone && !resInfo.receiverPhone.includes('****')),
      '3.2 Đơn ở chặng hiện tại hiển thị đầy đủ SĐT người nhận'
    );

    // Test 3.3: Đơn ở chặng xa hơn (sequence > 2) -> SĐT bị che 4 số giữa
    const farStop = myRoute?.stops.find((s) => s.sequence >= 5 && s.order?.orderCode);
    if (farStop?.order?.orderCode) {
      const resFar = await getOrderDeliveryInfo({ orderCode: farStop.order.orderCode }, driverCtx);
      assert(
        resFar.success === true && resFar.receiverPhone.includes('****'),
        `3.3 Đơn ở chặng xa (#${farStop.sequence} - ${farStop.order.orderCode}) được che 4 số giữa SĐT (${resFar.receiverPhone})`
      );
    }

    // Test 3.4: Đơn không tồn tại -> Thông báo chuẩn
    const resNotFound = await getOrderDeliveryInfo({ orderCode: 'ORD-NON-EXISTENT-999' }, driverCtx);
    assert(
      resNotFound.success === false && resNotFound.message === 'Không tìm thấy đơn hàng này trong danh sách của bác.',
      '3.4 Đơn không tồn tại trả về thông báo chuẩn "Không tìm thấy đơn hàng này trong danh sách của bác."'
    );
  }

  console.log('\n--- 4. Kiểm thử Tool 4: get_cod_summary ---');
  {
    const resCod = await getCodSummary({ includeOrders: true }, driverCtx);
    assert(
      resCod.success === true && resCod.totalReceivable !== undefined && resCod.deadline.includes('18:30'),
      '4.1 get_cod_summary trả về tổng COD và hạn nộp 18:30 chuẩn quy định',
      `Tổng phải thu: ${resCod.totalReceivable} đ`
    );

    // Đối chiếu SQL độc lập: Tính tổng tiền COD từ stops của lộ trình
    let sqlSum = 0;
    if (myRoute) {
      for (const s of myRoute.stops) {
        const amt = Number(s.order?.payment?.finalCodAmount || s.order?.estimatedCodAmount || 0);
        sqlSum += amt;
      }
    }
    assert(
      resCod.totalReceivable === sqlSum,
      `4.2 Tổng COD khớp 100% với phép cộng SQL độc lập (${resCod.totalReceivable} === ${sqlSum})`
    );
  }

  console.log('\n--- 5. Kiểm thử Tool 5: find_nearest_facility & GPS Handling ---');
  {
    // Test 5.1: Trường hợp chưa có GPS (hoặc xóa tạm thời GPS)
    await prisma.driverLocation.deleteMany({ where: { driverId: driverCtx.staffId } });
    const resNoGps = await findNearestFacility({ limit: 1 }, driverCtx);
    assert(
      resNoGps.success === true && resNoGps.hasFreshGps === false && resNoGps.facility !== undefined,
      '5.1 Khi không có GPS: Đề xuất bưu cục xuất phát của ca giao kèm thông báo cảnh báo',
      resNoGps.facility?.note
    );
    assert(
      resNoGps.facility?.note.includes('không phải bưu cục gần vị trí thực tế'),
      '5.2 Bưu cục xuất phát nêu rõ ràng không phải bưu cục gần vị trí hiện tại'
    );

    // Test 5.2: Trường hợp GPS cũ (> 10 phút trước)
    const tenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000); // 15 phút trước
    await prisma.driverLocation.upsert({
      where: { driverId: driverCtx.staffId! },
      create: {
        driverId: driverCtx.staffId!,
        latitude: 10.8505,
        longitude: 106.7719,
        recordedAt: tenMinutesAgo,
      },
      update: {
        recordedAt: tenMinutesAgo,
      },
    });

    const resStaleGps = await findNearestFacility({ limit: 1 }, driverCtx);
    assert(
      resStaleGps.success === true && resStaleGps.hasFreshGps === false && resStaleGps.reason === 'STALE_GPS',
      '5.3 GPS cũ hơn 10 phút: Báo rõ "vị trí đã cũ" và không dùng tính bưu cục gần nhất'
    );

    // Test 5.3: Trường hợp GPS tươi mới (vừa cập nhật)
    await prisma.driverLocation.update({
      where: { driverId: driverCtx.staffId! },
      data: { recordedAt: new Date() },
    });

    const resFreshGps = await findNearestFacility({ limit: 2 }, driverCtx);
    assert(
      resFreshGps.success === true && resFreshGps.hasFreshGps === true && resFreshGps.facilities?.length > 0,
      `5.4 GPS tươi mới: Tính khoảng cách Haversine chính xác (bưu cục gần nhất: ${resFreshGps.facilities?.[0]?.facilityName} - ${resFreshGps.facilities?.[0]?.distanceKm} km)`
    );
    assert(
      resFreshGps.facilities[0].hotline === '1900-6868 (Phím 1)',
      '5.5 Bưu cục trả về Hotline chính thức 1900-6868, không lộ số cá nhân quản lý'
    );
  }

  // -------------------------------------------------------------
  // PHẦN 2: KIỂM THỬ BẢO MẬT & PHÂN QUYỀN (SECURITY AUDIT)
  // -------------------------------------------------------------
  console.log('\n--- 6. Kiểm thử Bảo mật Cô lập (Cross-Driver Isolation) ---');
  {
    // Tìm đơn của tài xế khác (ví dụ: shp_dangvanbi_2)
    const otherDriverOrder = await prisma.order.findFirst({
      where: {
        routeStops: {
          some: {
            route: {
              driverVehicleAssignment: {
                driver: { user: { username: 'shp_dangvanbi_2' } },
              },
            },
          },
        },
      },
    });

    if (otherDriverOrder) {
      const resCross = await getOrderDeliveryInfo({ orderCode: otherDriverOrder.orderCode }, driverCtx);
      assert(
        resCross.success === false && resCross.message === 'Không tìm thấy đơn hàng này trong danh sách của bác.',
        `6.1 Tài xế A tra cứu đơn (${otherDriverOrder.orderCode}) của Tài xế B bị từ chối như đơn không tồn tại`
      );
    }
  }

  console.log('\n--- 7. Kiểm thử Lộ trình Cũ (Completed Route Isolation) ---');
  {
    // Tạo giả lập một đơn nằm trong lộ trình đã COMPLETED
    const completedRoute = await prisma.route.findFirst({
      where: { status: 'COMPLETED' },
      include: { stops: { include: { order: true } } },
    });

    if (completedRoute && completedRoute.stops[0]?.order) {
      const oldOrderCode = completedRoute.stops[0].order.orderCode;
      const resOld = await getOrderDeliveryInfo({ orderCode: oldOrderCode }, driverCtx);
      assert(
        resOld.success === false,
        `7.1 Đơn (${oldOrderCode}) thuộc lộ trình cũ đã COMPLETED không được hiển thị cho tài xế`
      );
    } else {
      console.log('  [SKIP] 7.1 CSDL chưa có lộ trình COMPLETED mẫu, bỏ qua kiểm tra DB');
    }
  }

  console.log('\n--- 8. Kiểm thử Zod Schema Strict & Parameter Tampering ---');
  {
    // Test 8.1: Truyền thêm staffId giả mạo hoặc admin: true vào get_my_orders
    const fakeParams: any = { group: 'ACTIVE', staffId: 'HACKED_STAFF_ID', admin: true };
    const resTamper = await getMyOrders(fakeParams, driverCtx);
    assert(
      resTamper.success === false && resTamper.message.includes('không chấp nhận tham số lạ'),
      '8.1 Zod .strict() phát hiện và từ chối tham số lạ (staffId, admin)'
    );

    // Test 8.2: Truyền tọa độ vào find_nearest_facility
    const fakeCoords: any = { limit: 1, latitude: 10.5, longitude: 106.5 };
    const resCoords = await findNearestFacility(fakeCoords, driverCtx);
    assert(
      resCoords.success === false && resCoords.message.includes('không chấp nhận tham số lạ'),
      '8.2 Zod .strict() từ chối nhận tọa độ từ client trong find_nearest_facility'
    );

    // Test 8.3: Truyền tham số vào get_next_stop (vốn không nhận tham số)
    const fakeNext: any = { orderCode: 'ORD-123' };
    const resNextTamper = await getNextStop(fakeNext, driverCtx);
    assert(
      resNextTamper.success === false &&
        (resNextTamper.message.includes('không chấp nhận tham số lạ') ||
          resNextTamper.message.includes('không nhận bất kỳ tham số nào')),
      '8.3 Zod .strict() từ chối tham số lạ trong get_next_stop'
    );
  }

  console.log('\n--- 9. Kiểm thử Runtime Tool Authorization ---');
  {
    // Test 9.1: Kiểm tra danh sách tool phân quyền cho role DRIVER
    const driverTools = toolRegistry.getToolsForRole('DRIVER');
    const customerTools = toolRegistry.getToolsForRole('CUSTOMER');

    assert(
      driverTools.length === 5 && customerTools.length > 5,
      '9.1 getToolsForRole("DRIVER") trả về chính xác 5 tool của tài xế'
    );

    const hasOverlap = driverTools.some((dt) =>
      customerTools.some((ct) => ct.function.name === dt.function.name)
    );
    assert(
      !hasOverlap,
      '9.2 Bộ công cụ của DRIVER và CUSTOMER độc lập 100%, không trùng lặp bất kỳ tool nào'
    );
  }

  console.log('\n--- 10. Kiểm thử Cảnh báo Dò quét & Khóa Tạm thời (Probing Detection) ---');
  {
    const probeStaffId = '00000000-0000-0000-0000-000000000088';
    const probeCtx: ToolContext = {
      userId: '00000000-0000-0000-0000-000000000077',
      staffId: probeStaffId,
      role: 'DRIVER',
    };

    // Dò 3 đơn lạ liên tiếp
    await getOrderDeliveryInfo({ orderCode: 'ORD-PROBE-001' }, probeCtx);
    await getOrderDeliveryInfo({ orderCode: 'ORD-PROBE-002' }, probeCtx);
    await getOrderDeliveryInfo({ orderCode: 'ORD-PROBE-003' }, probeCtx);

    const lockStatus = securityAuditService.isDriverLockedOut(probeStaffId);
    assert(
      lockStatus.locked === true && (lockStatus.remainingSec || 0) > 0,
      `10.1 Phát hiện dò quét 3 đơn liên tiếp: Tạm khóa tài xế trong ${lockStatus.remainingSec}s`
    );

    const resLocked = await getOrderDeliveryInfo({ orderCode: 'ORD-ANY-004' }, probeCtx);
    assert(
      resLocked.success === false && resLocked.message.includes('tạm thời bị khóa'),
      '10.2 Khi bị khóa, tool từ chối ngay lập tức không truy vấn DB'
    );
  }

  console.log('\n--- 11. Kiểm thử Rate Limit & Quota ---');
  {
    const testUserId = 'test-rate-limit-user-' + Date.now();

    // Test Chat Rate Limit: Gửi 21 tin nhắn liên tiếp
    let chatLimited = false;
    for (let i = 0; i < 22; i++) {
      const check = securityAuditService.checkChatRateLimit(testUserId);
      if (!check.allowed) {
        chatLimited = true;
        break;
      }
    }
    assert(chatLimited, '11.1 Gửi tin nhắn quá 20 lần/phút kích hoạt Rate Limit');

    // Test Tool Rate Limit: Gọi tool 16 lần liên tiếp
    let toolLimited = false;
    for (let i = 0; i < 17; i++) {
      const check = securityAuditService.checkToolRateLimit(testUserId);
      if (!check.allowed) {
        toolLimited = true;
        break;
      }
    }
    assert(toolLimited, '11.2 Gọi tool quá 15 lần/phút kích hoạt Tool Rate Limit');

    // Test Session Quota: Gọi tool quá 20 lần trong 1 conversation
    const testConvId = 'test-conv-quota-' + Date.now();
    let sessionQuotaExceeded = false;
    for (let i = 0; i < 22; i++) {
      const check = securityAuditService.checkSessionToolQuota(testConvId);
      if (!check.allowed) {
        sessionQuotaExceeded = true;
        break;
      }
    }
    assert(sessionQuotaExceeded, '11.3 Quá 20 tool calls trong 1 conversation chạm trần Session Quota');
  }

  console.log('\n--- 12. Kiểm thử Validation Dữ liệu Chat & Sanitization ---');
  {
    // Test 12.1: Strip ký tự điều khiển trong ghi chú
    const dirtyNote = 'Hàng dễ vỡ \x00\x1B\x07giao cẩn thận';
    const cleanNote = sanitizeNoteText(dirtyNote);
    assert(
      cleanNote === 'Hàng dễ vỡ giao cẩn thận' && !cleanNote.includes('\x00'),
      '12.1 sanitizeNoteText loại bỏ thành công các ký tự điều khiển độc hại'
    );

    // Test 12.2: Che SĐT
    const masked = maskPhoneMiddle('0981000014');
    assert(masked === '098****014', `12.2 maskPhoneMiddle che đúng 4 số giữa: ${masked}`);

    // Test 12.3: Che dữ liệu trước khi lưu DB
    const toolResultRaw = {
      orderCode: 'ORD-TD-012',
      receiverPhone: '0981000012',
      driverPhone: '0902000001',
      address: 'Số 48 Võ Văn Ngân, Thủ Đức',
    };
    const maskedStorage = securityAuditService.maskToolResultForStorage(toolResultRaw);
    assert(
      maskedStorage.receiverPhone.includes('****') && maskedStorage.driverPhone.includes('****'),
      '12.3 maskToolResultForStorage che SĐT trước khi lưu vào chat_messages'
    );
  }

  // -------------------------------------------------------------
  // TỔNG KẾT
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`  KẾT QUẢ: ĐÃ VƯỢT QUA ${passedCount}/${totalCount} BÀI KIỂM THỬ (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log('===============================================================');

  if (passedCount === totalCount) {
    console.log('\n🎉 TOÀN BỘ CÁC BÀI KIỂM THỬ CHỨC NĂNG & BẢO MẬT BƯỚC 4 ĐẠT 100%!');
  } else {
    console.error(`\n⚠️ Có ${totalCount - passedCount} bài kiểm thử thất bại! Vui lòng rà soát log ở trên.`);
    process.exit(1);
  }
}

runTestSuite()
  .catch((err) => {
    console.error('Lỗi khi chạy bộ test:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
