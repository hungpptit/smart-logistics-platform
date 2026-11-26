# Contract Test Fixtures (`mobile/test/fixtures`)

- Ngày khảo sát backend (Pha 2A): **2026-11-25**
- Ngày chụp và ẩn danh hóa fixture `real_delivery_*_captured.json` (Pha 2B): **2026-11-26**

## Danh sách file

### 1. Fixture chụp THẬT từ API Backend (`captured`, đã ẩn danh hóa để an toàn đẩy lên Git)
Chụp trực tiếp từ backend chạy local (`GET /api/v1/routes` và `GET /api/v1/routes/:id`) với dữ liệu PostgreSQL hiện có (không chạy thêm seed/optimize/load-tote, không chỉnh sửa DB). Tất cả thông tin cá nhân/nhạy cảm đã được ẩn danh hóa: `fullName` -> `Driver Demo (...)`, `receiverName` -> `Receiver Stop XX`, `phone` / `receiverPhone` -> `000-000-xxxx`, `plateNumber` -> `00X-000.01`, `addressSnapshot` / `addressLine1` / `deliveryAddressText` / `pickupAddressText` -> chuỗi ẩn địa chỉ thực, `createdBy` -> `null`, không lưu email hay JWT token.

| File | Nguồn | Endpoint | Route / Trạng thái |
|---|---|---|---|
| `real_delivery_in_progress_list_captured.json` | **captured** | `GET /api/v1/routes` | `RT-23285603` (`IN_PROGRESS`, 13 điểm `DELIVERY`) |
| `real_delivery_in_progress_detail_captured.json` | **captured** | `GET /api/v1/routes/:id` | `RT-23285603` (`IN_PROGRESS`, 13 điểm `DELIVERY`) |
| `real_delivery_planned_list_captured.json` | **captured** | `GET /api/v1/routes` | `RT-28317284` (`PLANNED`, 16 điểm `DELIVERY`) |
| `real_delivery_planned_detail_captured.json` | **captured** | `GET /api/v1/routes/:id` | `RT-28317284` (`PLANNED`, 16 điểm `DELIVERY`) |

### 2. Fixture SUY DIỄN từ mã nguồn Backend (`derived, not captured`)
Do DB hiện tại chưa có tuyến `PICKUP` và chưa có tuyến `Linehaul` (`RT-LH-*`), hai file sau được **derived, not captured** — dựng theo đúng câu lệnh Prisma `include`/`select` tại `backend/src/services/routing/routing.service.ts` (`getAllRoutes` / `getRouteDetail`) và logic tạo tuyến tại `backend/src/services/routing/routing.service.ts` (`optimizeRoutesForFacility`) / `backend/src/services/shipment.service.ts` (`loadToteIntoShipment`), đồng thời dùng dữ liệu đã ẩn danh:

| File | Trạng thái nguồn | Đặc điểm hợp đồng JSON giữ nguyên |
|---|---|---|
| `derived_pickup_route.json` | **derived, not captured** | Tuyến `PICKUP` (3 điểm dừng: 1 `COMPLETED`/`PICKED_UP`, 2 `PENDING`); không có khóa `route.shipments` ở top-level; trường tiền là `String` (`"250000"`, `"18000"`, ...); điểm 3 có `order.payment == null`. |
| `derived_linehaul_route.json` | **derived, not captured** | Tuyến `Linehaul` (`RT-LH-DERIVED01`, 2 điểm `PICKUP` -> `DELIVERY` nối `Facility`); không có khóa `route.shipments` ở top-level; `stop.order == null`; đơn nằm trong `shipment.shipmentPackages[].package.order`; `warehouseScans[].toteBag` có `toteCode`; tiền là `String`; `order.payment == null`. |

### 3. Fixture có sẵn từ trước (giữ nguyên)
- `goong_route.json`: fixture có sẵn từ trước cho test navigation (`route_snapper_test.dart`, `navigation_engine_test.dart`), không liên quan tới contract test route.

---

## Phạm vi & ý nghĩa của Contract Test (`mobile/test/driver_route_contract_test.dart`)

- Với 4 file `real_delivery_*_captured.json`: toàn bộ stop trong DB hiện tại đều ở `ARRIVED`/`PENDING` và `order.payment == null`, nên các test `DELIVERY` **chủ yếu khóa hợp đồng dữ liệu JSON** (tên khóa thực tế của backend, tiền kiểu `String` từ Prisma `Decimal`, `order.payment == null`, không có khóa `route.shipments` ở top-level), **chưa chứng minh đầy đủ mọi nhánh nghiệp vụ** (như đơn đã `DELIVERED` hoặc đơn có `OrderPayment` + `feePayer = 'RECEIVER'`).
- Hai fixture `derived_pickup_route.json` và `derived_linehaul_route.json` hiện vẫn là fixture **dựng tay (`derived, not captured`)**, cần thay bằng bản chụp thật khi có dữ liệu `PICKUP`/`Linehaul` trên DB test.

---

## Cách tái tạo các fixture `real_delivery_*_captured.json`

1. Khởi động hạ tầng Docker (`postgres`, `redis`, `rabbitmq`) và backend (`npm run dev` trong `backend/`, mặc định lắng nghe `http://localhost:5000`, kiểm tra `GET http://localhost:5000/health`).
2. Đăng nhập `POST /api/v1/auth/login` bằng tài khoản tài xế demo local sở hữu tuyến `DELIVERY` `IN_PROGRESS` hoặc `PLANNED` (`<driver_username>` / `<driver_password>` trong môi trường seed local; không ghi mật khẩu hay token vào repo).
3. Gửi `GET /api/v1/routes` (kèm header `Authorization: Bearer <accessToken>`) để lưu bản `*_list_captured.json`, lấy `data[0].id` rồi gọi tiếp `GET /api/v1/routes/<id>` để lưu bản `*_detail_captured.json`.
4. Chạy bước ẩn danh hóa toàn bộ `fullName`, `receiverName`, `phone`, `receiverPhone`, `plateNumber`, `addressSnapshot`, `addressLine1`, `deliveryAddressText`, `pickupAddressText`, `createdBy`, và kiểm tra chắc chắn không còn chuỗi `09\d{8}`, `"email"`, `eyJ`, `password`, `token` trước khi commit.

### Cách chụp thật cho `PICKUP` và `Linehaul` về sau (khi được phép chạy seed trên DB test/local)
- **PICKUP**: chạy seed đơn `READY_FOR_PICKUP` (vd `backend/scripts/seed_case1_test_orders.ts`), gọi `POST /api/v1/routes/optimize` với `routeType: "PICKUP"`, rồi gọi `GET /api/v1/routes/:id`.
- **Linehaul**: chạy seed đơn + sọt `SEALED` (vd `backend/scripts/seed_case4_test_orders.ts` hoặc `seed_case5_test_orders.ts`), đăng nhập tài xế `LINEHAUL_TRANSFER` (bằng lái khác `A1`/`A2`), gọi `POST /api/v1/shipments/load-tote` với `toteCode`, rồi gọi `GET /api/v1/routes/:id`.
