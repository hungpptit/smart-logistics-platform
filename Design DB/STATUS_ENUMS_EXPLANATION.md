# 📚 TỔNG HỢP & GIẢI THÍCH TOÀN BỘ ENUM TRẠNG THÁI & PHÂN LOẠI (STATUS & SYSTEM ENUMS)
**Dự án**: Smart Logistics Platform (SLP)  
**Phiên bản**: Chuẩn hóa 100% đồng bộ với `schema.prisma`  
**Phạm vi**: Danh mục tất cả 28 ENUM trong Hệ thống từ Module 1 đến Module 9

---

## 📑 MỤC LỤC
1. [Module 1: Authentication & Authorization](#1-module-1-authentication--authorization)
2. [Module 2: Customers & Addresses](#2-module-2-customers--addresses)
3. [Module 3: Facility Network](#3-module-3-facility-network)
4. [Module 4: Orders & Services](#4-module-4-orders--services)
5. [Module 5: Shipment Management](#5-module-5-shipment-management)
6. [Module 6: Fleet & Driver Management](#6-module-6-fleet--driver-management)
7. [Module 7: Routing & Dispatch Engine](#7-module-7-routing--dispatch-engine)
8. [Module 8: Tracking, Scan & POD](#8-module-8-tracking-scan--pod)
9. [Module 9: System Configuration](#9-module-9-system-configuration)

---

## 1. Module 1: Authentication & Authorization

### 1.1. `UserStatus` (Trạng thái Tài khoản Đăng nhập)
📌 **Phạm vi áp dụng**: Bảng `users` (Tài khoản xác thực Credentials).

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `ACTIVE` | Tài khoản đang hoạt động | Người dùng có thể đăng nhập, gọi API bình thường. |
| `LOCKED` | Tạm khóa tài khoản | Khóa do nhập sai mật khẩu quá 5 lần hoặc vi phạm chính sách tạm thời. |
| `DISABLED` | Vô hiệu hóa tài khoản | Thay thế `deleted_at`. Tài khoản bị vô hiệu hóa vĩnh viễn. |

---

## 2. Module 2: Customers & Addresses

### 2.1. `CustomerType` (Phân loại Khách hàng)
📌 **Phạm vi áp dụng**: Bảng `customers`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `INDIVIDUAL` | Khách hàng cá nhân | Cá nhân gửi hàng nhỏ lẻ, không cần xuất hóa đơn VAT doanh nghiệp. |
| `BUSINESS` | Khách hàng doanh nghiệp / Shop | Doanh nghiệp, sàn TMĐT, Shop bán hàng có mã số thuế và hợp đồng cước. |

---

### 2.2. `CustomerAddressType` (Phân loại Sổ địa chỉ Khách hàng)
📌 **Phạm vi áp dụng**: Bảng `customer_addresses`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `HOME` | Nhà riêng | Địa chỉ nhà riêng của khách hàng cá nhân. |
| `OFFICE` | Văn phòng | Địa chỉ văn phòng, công ty làm việc. |
| `WAREHOUSE` | Kho hàng | Địa chỉ kho bãi tập kết hàng hóa của Shop/Doanh nghiệp. |
| `RETURN` | Địa chỉ trả hàng | Địa chỉ tiếp nhận bưu kiện khi xảy ra chuyển hoàn. |

---

## 3. Module 3: Facility Network

### 3.1. `FacilityStatus` (Trạng thái Bưu cục / Kho bãi)
📌 **Phạm vi áp dụng**: Bảng `facilities`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `ACTIVE` | Mở cửa hoạt động | Bưu cục/Kho đang mở cửa nhận hàng, xuất/nhập kho bình thường. |
| `INACTIVE` | Tạm ngưng hoạt động | Kho tạm dừng tiếp nhận hàng hóa mới. |
| `MAINTENANCE` | Đang sửa chữa / Bảo trì | Kho đang bảo dưỡng thiết bị, kiểm kê tài sản định kỳ. |
| `CLOSED` | Đóng cửa vĩnh viễn | Bưu cục đã giải thể hoặc di dời địa điểm. |

---

### 3.2. `FacilityZoneType` (Phân khu Chức năng trong Kho)
📌 **Phạm vi áp dụng**: Bảng `facility_zones`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `RECEIVING` | Khu vực Nhập kho | Nơi hạ hàng từ xe tải xuống để kiểm đếm ban đầu. |
| `SORTING` | Khu vực Chia chọn | Nơi đặt băng chuyền tự động hoặc chia chọn thủ công theo tuyến. |
| `SHIPPING` | Khu vực Chờ xuất hàng | Nơi đóng kiện, xếp hàng sẵn sàng lên xe tải đi chuyến tiếp. |
| `STORAGE` | Khu vực Lưu kho | Nơi lưu trữ kiện hàng chờ khách ra nhận hoặc chờ ghép chuyến. |
| `RETURN` | Khu vực Hàng hoàn | Nơi tập kết các kiện hàng bị trả về chờ xử lý cho người gửi. |
| `QUARANTINE` | Khu cách ly / Kiểm tra | Nơi chứa hàng hóa nghi vấn hư hỏng, vỡ, rò rỉ hoặc thiếu tem. |

---

## 4. Module 4: Orders & Services

### 4.1. `OrderStatus` (Vòng đời Trạng thái Đơn hàng)
📌 **Phạm vi áp dụng**: Bảng `orders` & `order_status_history`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `CREATED` | Đơn mới tạo | Khách vừa đặt đơn thành công trên Web/App. |
| `READY_FOR_PICKUP` | Sẵn sàng lấy hàng | Đơn đã duyệt, chờ AI/Điều phối gán Shipper đi lấy. |
| `PICKUP_ASSIGNED` | Đã gán Shipper lấy | Thuật toán AI Routing đã gán Shipper phụ trách. |
| `PICKING` | Đang đi lấy hàng | Shipper đang chạy xe đến địa chỉ người gửi. |
| `PICK_FAILED` | Lấy hàng thất bại | Shipper đến nhưng khách không nghe máy/không đưa hàng. |
| `PICKED_UP` | Đã lấy hàng thành công | Shipper đã nhận hàng và quét mã xác nhận. |
| `ARRIVED_ORIGIN_FACILITY` | Đã về bưu cục gốc | Shipper đã chở hàng về bưu cục nhận đầu tiên. |
| `READY_FOR_DISPATCH` | Sẵn sàng xuất kho | Đã chia chọn tại kho gốc, chờ gom lên xe tải liên tỉnh. |
| `IN_TRANSIT` | Đang trung chuyển | Hàng đang nằm trên xe tải chạy giữa các kho. |
| `AT_HUB` | Đã cập bến kho đích | Hàng đã đến bưu cục phát chặng cuối. |
| `OUT_FOR_DELIVERY` | Đang đi giao hàng | Shipper chặng cuối đang chở hàng đi giao cho người nhận. |
| `DELIVERED` | Giao thành công | Người nhận đã ký nhận & thanh toán tiền COD. |
| `DELIVERY_FAILED` | Giao thất bại | Shipper đến giao nhưng người nhận hẹn lại/không nghe máy. |
| `RETURNING` | Đang chuyển hoàn | Hàng đang được chở ngược về lại cho người gửi. |
| `RETURNED` | Đã trả người gửi | Đã trao trả lại tận tay kiện hàng cho người gửi. |
| `COMPLETED` | Hoàn tất đối soát | Đã đối soát xong cước phí & chuyển tiền COD cho Shop. |
| `CANCELLED` | Đơn đã Hủy | Đơn bị Hủy trước khi Shipper đến lấy hàng. |

---

### 4.2. `FeePayer` (Người Thanh Toán Cước)
📌 **Phạm vi áp dụng**: Bảng `order_payments`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `SENDER` | Người gửi thanh toán cước vận chuyển |
| `RECEIVER` | Người nhận thanh toán cước vận chuyển khi nhận hàng |

---

### 4.3. `PickupType` (Hình thức Gửi Hàng)
📌 **Phạm vi áp dụng**: Bảng `orders`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `PICKUP` | Shipper đến tận nhà / kho của Người gửi để lấy hàng |
| `DROP_OFF` | Người gửi chủ động mang bưu kiện ra Bưu cục gửi hàng |

---

### 4.4. `PaymentMethod` (Phương thức Thanh toán)
📌 **Phạm vi áp dụng**: Bảng `order_payments`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `CASH` | Tiền mặt trực tiếp cho Shipper |
| `BANK_TRANSFER` | Chuyển khoản ngân hàng (VietQR / Napas) |
| `E_WALLET` | Thanh toán qua ví điện tử (MoMo, ZaloPay, VNPay) |
| `COD` | Thu hộ tiền hàng khi giao (Cash on Delivery) |

---

### 4.5. `PaymentStatus` (Trạng thái Thanh toán Cước & COD)
📌 **Phạm vi áp dụng**: Bảng `order_payments`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `UNPAID` | Chưa thanh toán |
| `PAID` | Đã thanh toán thành công |
| `REFUNDED` | Đã hoàn tiền cho khách |

---

## 5. Module 5: Shipment Management

### 5.1. `ShipmentStatus` (Trạng thái Phiếu Vận chuyển / Vận đơn Gom)
📌 **Phạm vi áp dụng**: Bảng `shipments`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `CREATED` | Phiếu vận chuyển mới lập, chờ xếp xe & gán tài xế. |
| `ASSIGNED` | Đã gán xe tải và tài xế phụ trách chuyến đi. |
| `IN_TRANSIT` | Xe đã rời kho xuất phát, đang chạy trên đường. |
| `AT_HUB` | Xe đã đến bưu cục đích, chuẩn bị hạ hàng xuống kho. |
| `OUT_FOR_DELIVERY` | Vận đơn gom các đơn chặng cuối cho Shipper đi phát. |
| `DELIVERED` | Đã hoàn thành giao toàn bộ bưu kiện trong phiếu. |
| `DELIVERY_FAILED` | Chuyến xe gặp sự cố hoặc giao hàng thất bại. |
| `RETURNING` | Chuyến xe gom hàng hoàn chở ngược về kho gốc. |
| `RETURNED` | Đã trả hàng hoàn về bưu cục gốc thành công. |
| `CANCELLED` | Phiếu vận chuyển bị hủy. |

---

### 5.2. `TransferStatus` (Trạng thái Luân chuyển Kho Nội bộ)
📌 **Phạm vi áp dụng**: Bảng `shipment_transfers`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `PENDING` | Chờ xuất kho (Kho xuất đã lập lệnh nhưng xe chưa xuất phát). |
| `IN_TRANSIT` | Đang luân chuyển trên đường giữa 2 bưu cục. |
| `ARRIVED` | Đã nhập kho đích thành công (Thủ kho đích đã quét nhận). |
| `REJECTED` | Kho đích từ chối nhận do sai lệch số lượng hoặc hàng hư hỏng. |

---

## 6. Module 6: Fleet & Driver Management

### 6.1. `DriverEmploymentStatus` (Trạng thái Công tác của Nhân sự / Tài xế)
📌 **Phạm vi áp dụng**: Bảng `staff`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `ACTIVE` | Đang làm việc / Sẵn sàng nhận chuyến. |
| `OFFLINE` | Ngoại tuyến / Hết ca làm việc. |
| `SUSPENDED` | Tạm đình chỉ công tác do sự cố hoặc vi phạm. |
| `DISABLED` | Đã nghỉ việc / Vô hiệu hóa hồ sơ. |

---

### 6.2. `DriverType` (Loại hình Giao hàng của Tài xế)
📌 **Phạm vi áp dụng**: Bảng `staff_driver_types`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `HUB_DELIVERY` | Tài xế giao nhận bưu cục chặng cuối (Last-mile delivery). |
| `LINEHAUL_TRANSFER` | Tài xế xe tải lớn chạy tuyến trung chuyển liên bưu cục/liên tỉnh. |
| `ON_DEMAND` | Tài xế giao hàng hỏa tốc tức thì (Direct pickup & delivery). |

---

### 6.3. `VehicleOperatingStatus` (Trạng thái Vận hành Phương tiện)
📌 **Phạm vi áp dụng**: Bảng `vehicles`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `ACTIVE` | Xe sẵn sàng vận hành, tình trạng tốt. |
| `MAINTENANCE` | Xe đang bảo dưỡng, sửa chữa tại Gara. |
| `RETIRED` | Xe đã thanh lý hoặc ngừng sử dụng. |

---

## 7. Module 7: Routing & Dispatch Engine

### 7.1. `RouteStatus` (Trạng thái Tuyến đường Lộ trình)
📌 **Phạm vi áp dụng**: Bảng `routes`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `PLANNED` | Mới lập lộ trình tối ưu bởi AI / Điều phối viên. |
| `ASSIGNED` | Đã gán tuyến cho Tài xế + Phương tiện. |
| `IN_PROGRESS` | Xe đang chạy thực hiện tuyến. |
| `COMPLETED` | Hoàn thành tất cả các điểm dừng trên tuyến. |
| `CANCELLED` | Lộ trình bị hủy do sự cố. |

---

### 7.2. `RouteStopType` (Phân loại Điểm dừng trên Tuyến)
📌 **Phạm vi áp dụng**: Bảng `route_stops`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `PICKUP` | Điểm dừng lấy hàng tại nhà / kho của người gửi. |
| `HUB` | Điểm dừng tại Bưu cục trung chuyển để nhập/xuất kiện. |
| `DELIVERY` | Điểm dừng giao hàng tận tay cho người nhận. |

---

### 7.3. `RouteStopStatus` (Trạng thái Điểm dừng trên Tuyến)
📌 **Phạm vi áp dụng**: Bảng `route_stops`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `PENDING` | Đang chờ xe đến. |
| `ARRIVED` | Tài xế đã đến điểm dừng. |
| `DEPARTED` | Tài xế đã hoàn tất thủ tục và rời điểm dừng. |
| `SKIPPED` | Bỏ qua điểm dừng (khách hẹn lại hoặc hủy). |
| `FAILED` | Xử lý thất bại tại điểm dừng. |

---

### 7.4. `DispatchTaskType` (Loại Nhiệm vụ Điều phối)
📌 **Phạm vi áp dụng**: Bảng `dispatch_tasks`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `ASSIGN_ROUTE` | Phân công lộ trình mới cho tài xế. |
| `REASSIGN_ROUTE` | Điều chuyển lại lộ trình cho tài xế khác (khi có sự cố). |
| `EMERGENCY` | Nhiệm vụ khẩn cấp (cứu hộ, lấy hàng gấp). |

---

### 7.5. `DispatchTaskStatus` (Trạng thái Nhiệm vụ Điều phối)
📌 **Phạm vi áp dụng**: Bảng `dispatch_tasks`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `PENDING` | Nhiệm vụ mới phát, chờ tài xế bấm nhận. |
| `ACCEPTED` | Tài xế đã bấm Nhận nhiệm vụ trên App. |
| `REJECTED` | Tài xế từ chối nhiệm vụ. |
| `COMPLETED` | Hoàn thành toàn bộ nhiệm vụ. |
| `CANCELLED` | Nhiệm vụ bị hủy bởi điều phối viên. |

---

### 7.6. `OptimizationStatus` (Kết quả Tối ưu hóa AI)
📌 **Phạm vi áp dụng**: Bảng `route_optimizations`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `SUCCESS` | Động cơ AI giải bài toán VRP thành công. |
| `FAILED` | Thuật toán AI chạy thất bại / không tìm thấy lời giải hợp lệ. |

---

## 8. Module 8: Tracking, Scan & POD

### 8.1. `TrackingEventType` (Loại Sự kiện Theo dõi Hành trình)
📌 **Phạm vi áp dụng**: Bảng `tracking_events`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `CREATED` | Đơn hàng / Vận đơn được tạo mới. |
| `DRIVER_ASSIGNED` | Đã phân công tài xế phụ trách. |
| `PICKED_UP` | Đã lấy hàng từ người gửi thành công. |
| `ARRIVED_FACILITY` | Hàng đã nhập bưu cục. |
| `DEPARTED_FACILITY` | Hàng đã xuất bưu cục. |
| `ARRIVED_HUB` | Hàng đã đến trung tâm chia chọn. |
| `DEPARTED_HUB` | Hàng đã rời trung tâm chia chọn. |
| `OUT_FOR_DELIVERY` | Đang trên đường đi giao cho người nhận. |
| `DELIVERY_SUCCESS` | Giao hàng thành công cho người nhận. |
| `DELIVERY_FAIL` | Giao hàng không thành công. |
| `RETURN_STARTED` | Bắt đầu quy trình chuyển hoàn cho người gửi. |
| `EXCEPTION_OCCURRED` | Phát sinh sự cố ngoại lệ trong quá trình vận chuyển. |
| `RETURNED` | Đã chuyển hoàn trả lại cho người gửi thành công. |
| `CANCELLED` | Đã hủy vận đơn. |

---

### 8.2. `ScanType` (Mục đích Quét Mã Vạch Kho)
📌 **Phạm vi áp dụng**: Bảng `warehouse_scans`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `INBOUND` | Quét nhập kho khi hàng về bưu cục. |
| `OUTBOUND` | Quét xuất kho khi xếp hàng lên xe tải. |
| `DELIVERY` | Quét bàn giao cho Shipper đi phát. |
| `INVENTORY` | Quét kiểm kê bưu kiện trong kho định kỳ. |
| `SORTING` | Quét chia chọn tại khu vực phân loại. |

---

### 8.3. `ToteStatus` (Trạng thái Sọt gom Hàng)
📌 **Phạm vi áp dụng**: Bảng `tote_bags`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `OPEN` | Sọt đang mở, tiếp tục gom thêm kiện hàng. |
| `SEALED` | Sọt đã chốt niêm phong bằng seal. |
| `LOADED` | Sọt đã bốc lên xe tải trung chuyển. |

---

### 8.4. `DeliveryResult` (Kết quả Giao Hàng)
📌 **Phạm vi áp dụng**: Bảng `delivery_proofs`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `SUCCESS` | Giao hàng thành công. |
| `FAILED` | Giao hàng thất bại. |
| `PARTIAL` | Giao hàng thành công một phần. |

---

### 8.5. `DeliveryFailureReason` (Lý do Giao Hàng Thất Bại)
📌 **Phạm vi áp dụng**: Bảng `delivery_proofs`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `RECIPIENT_UNAVAILABLE` | Người nhận không nghe máy / không có nhà. |
| `INCORRECT_ADDRESS` | Sai địa chỉ / không tìm thấy địa chỉ người nhận. |
| `RECIPIENT_REJECTED` | Người nhận từ chối nhận hàng (bom hàng). |
| `FORCE_MAJEURE` | Sự cố bất khả kháng (thiên tai, tai nạn, ngập lụt). |
| `OTHER` | Lý do khác. |

---

## 9. Module 9: System Configuration

### 9.1. `SettingValueType` (Kiểu Dữ liệu Cấu hình)
📌 **Phạm vi áp dụng**: Bảng `system_settings`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `STRING` | Chuỗi ký tự văn bản |
| `INTEGER` | Số nguyên |
| `DECIMAL` | Số thực / Thập phân |
| `BOOLEAN` | Giá trị Đúng / Sai (`true`/`false`) |
| `JSON` | Cấu trúc dữ liệu JSON |

---

### 9.2. `SettingCategory` (Phân nhóm Cấu hình Hệ thống)
📌 **Phạm vi áp dụng**: Bảng `system_settings`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ |
| :--- | :--- |
| `AI` | Cấu hình tham số thuật toán AI (Genetic, K-Means) |
| `ROUTING` | Cấu hình định tuyến và cự ly di chuyển |
| `GPS` | Cấu hình chu kỳ và sai số phát sóng định vị GPS |
| `SYSTEM` | Cấu hình bảo mật và hạ tầng hệ thống |
| `MOBILE` | Cấu hình ứng dụng di động cho Shipper/Khách hàng |
| `BUSINESS` | Cấu hình quy tắc nghiệp vụ chuyển phát |
