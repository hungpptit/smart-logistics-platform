# 📚 TỔNG HỢP & GIẢI THÍCH TOÀN BỘ ENUM TRẠNG THÁI (STATUS ENUMS)
**Dự án**: Smart Logistics Platform (SLP)  
**Tác giả**: Antigravity AI & Team  
**Ngày cập nhật**: 29/07/2026  
**Phạm vi**: Danh mục tất cả Enum Trạng thái trong Hệ thống từ Module 1 đến Module 9

---

## 📑 MỤC LỤC
1. [Module 1 & 2: Auth, User Profiles & Accounts](#1-module-1--2-auth-user-profiles--accounts)
2. [Module 3: Facility Network (Mạng lưới Bưu cục & Kho bãi)](#2-module-3-facility-network-mạng-lưới-bưu-cục--kho-bãi)
3. [Module 4: Order & Package Management (Đơn hàng & Kiện hàng)](#3-module-4-order--package-management-đơn-hàng--kiện-hàng)
4. [Module 5: Shipment Management (Vận đơn & Trung chuyển)](#4-module-5-shipment-management-vận-đơn--trung-chuyển)
5. [Module 6: Fleet & Vehicle Management (Đội xe & Phương tiện)](#5-module-6-fleet--vehicle-management-đội-xe--phương-tiện)
6. [Module 7: Routing & AI Optimization (Tuyến đường AI & Điều phối)](#6-module-7-routing--ai-optimization-tuyến-đường-ai--điều-phối)
7. [Module 8: Tracking, Barcode & Proof of Delivery (POD)](#7-module-8-tracking-barcode--proof-of-delivery-pod)

---

## 1. Module 1 & 2: Auth, User Profiles & Accounts

### 1.1. `UserStatus` (Trạng thái Tài khoản Đăng nhập)
📌 **Phạm vi áp dụng**: Bảng `users` (Tài khoản xác thực Credentials).

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `ACTIVE` | Tài khoản đang hoạt động | Người dùng có thể đăng nhập, gọi API bình thường. |
| `LOCKED` | Tạm khóa tài khoản | Khóa do nhập sai mật khẩu quá 5 lần hoặc vi phạm chính sách tạm thời. |
| `DISABLED` | Vô hiệu hóa tài khoản | Thay thế `deleted_at`. Tài khoản bị vô hiệu hóa vĩnh viễn. |

---

### 1.2. `CustomerStatus` (Trạng thái Hồ sơ Khách hàng)
📌 **Phạm vi áp dụng**: Bảng `customers`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `ACTIVE` | Khách hàng hoạt động | Được phép tạo đơn, nạp tiền, nhận hàng bình thường. |
| `INACTIVE` | Tạm ngưng hoạt động | Khách chưa xác thực OTP/Email hoặc tạm ngưng giao dịch. |
| `BLOCKED` | Chặn tạo đơn | Khách nợ cước quá hạn hoặc bùng hàng. Chỉ được xem, không được tạo đơn mới. |
| `DISABLED` | Vô hiệu hóa / Xóa mềm | Thay thế `deleted_at`. Hồ sơ bị ẩn khỏi tìm kiếm thông thường. |

---

### 1.3. `DriverEmploymentStatus` (Trạng thái Làm việc của Nhân viên / Tài xế)
📌 **Phạm vi áp dụng**: Bảng `staff` (dành cho Nhân viên & Shipper).

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `ACTIVE` | Đang làm việc | Sẵn sàng nhận nhiệm vụ, sẵn sàng lên xe đi giao/nhận. |
| `OFFLINE` | Ngoại tuyến / Nghỉ ca | Tài xế tắt ứng dụng Shipper App hoặc đã hết ca làm việc. |
| `SUSPENDED` | Tạm đình chỉ | Đình chỉ công tác do vi phạm quy trình làm việc hoặc gây sự cố. |
| `DISABLED` | Đã nghỉ việc / Xóa mềm | Thay thế `deleted_at`. Tài xế đã nghỉ việc tại bưu cục. |

---

## 2. Module 3: Facility Network (Mạng lưới Bưu cục & Kho bãi)

### 2.1. `FacilityStatus` (Trạng thái Bưu cục / Kho bãi)
📌 **Phạm vi áp dụng**: Bảng `facilities`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `ACTIVE` | Mở cửa hoạt động | Bưu cục/Kho đang mở cửa nhận hàng, xuất/nhập kho bình thường. |
| `INACTIVE` | Tạm ngưng hoạt động | Kho tạm dừng tiếp nhận hàng hóa mới. |
| `MAINTENANCE` | Đang sửa chữa / Bảo trì | Kho đang sửa chữa thiết bị, kiểm kê tài sản định kỳ. |
| `CLOSED` | Đóng cửa vĩnh viễn | Thay thế `deleted_at`. Bưu cục đã giải thể hoặc di dời địa điểm. |

---

### 2.2. `FacilityZoneType` (Phân khu Chức năng trong Kho)
📌 **Phạm vi áp dụng**: Bảng `facility_zones`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `RECEIVING` | Khu vực Nhập kho | Nơi hạ hàng từ xe tải xuống để kiểm đếm ban đầu. |
| `SORTING` | Khu vực Chia chọn | Nơi đặt máy phân loại tự động hoặc phân loại thủ công theo tuyến. |
| `SHIPPING` | Khu vực Chờ xuất hàng | Nơi đóng kiện, xếp hàng sẵn sàng lên xe tải đi chuyến tiếp. |
| `STORAGE` | Khu vực Lưu kho | Nơi lưu trữ kiện hàng chờ khách ra nhận hoặc chờ ghép chuyến. |
| `RETURN` | Khu vực Hàng hoàn | Nơi tập kết các kiện hàng bị trả về chờ xử lý cho người gửi. |
| `QUARANTINE` | Khu cách ly / Kiểm tra | Nơi chứa hàng hóa nghi vấn hư hỏng, vỡ, rò rỉ hoặc thiếu tem. |

---

## 3. Module 4: Order & Package Management (Đơn hàng & Kiện hàng)

### 3.1. `OrderStatus` (Vòng đời Trạng thái Đơn hàng)
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

### 3.2. `PaymentStatus` (Trạng thái Thanh toán Cước & COD)
📌 **Phạm vi áp dụng**: Bảng `order_payments`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `UNPAID` | Chưa thanh toán | Cước phí hoặc COD chưa được thanh toán. |
| `PAID` | Đã thanh toán | Đã thu tiền cước/COD thành công qua Tiền mặt/Ví/Chuyển khoản. |
| `REFUNDED` | Đã hoàn tiền | Đã hoàn lại cước/tiền cho khách do đơn hủy hoặc bồi thường. |

---

## 4. Module 5: Shipment Management (Vận đơn & Trung chuyển)

### 4.1. `ShipmentStatus` (Trạng thái Phiếu Vận chuyển / Chuyến xe)
📌 **Phạm vi áp dụng**: Bảng `shipments` (Phiếu gom hàng nội bộ bưu cục).

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `CREATED` | Phiếu mới tạo | Vận đơn gom hàng mới lập, chờ xếp xe & gán tài xế. |
| `ASSIGNED` | Đã gán Xe & Tài xế | Đã gán xe tải và tài xế phụ trách chuyến đi. |
| `IN_TRANSIT` | Xe đang chạy trên đường | Xe đã rời kho xuất phát, đang chạy trên quốc lộ/liên tỉnh. |
| `AT_HUB` | Xe đã cập bến kho đích | Xe đã đến bưu cục đích, chuẩn bị hạ hàng xuống kho. |
| `OUT_FOR_DELIVERY` | Đang giao chặng cuối | Vận đơn gom các đơn chặng cuối cho Shipper đi phát. |
| `DELIVERED` | Đã hoàn thành vận đơn | Toàn bộ các kiện hàng trong phiếu đã giao/hạ kho thành công. |
| `DELIVERY_FAILED` | Chuyến xe gặp sự cố | Chuyến xe bị hỏng/sự cố hoặc giao hàng chặng cuối thất bại. |
| `RETURNING` | Đang chở hàng hoàn | Chuyến xe gom hàng hoàn chở ngược về kho gốc. |
| `RETURNED` | Đã trả hàng hoàn | Hoàn tất chuyến chở hàng hoàn về bưu cục gốc. |
| `CANCELLED` | Chuyến xe bị HỦY | Thay thế `deleted_at`. Chuyến xe bị hủy trước khi xuất phát. |

---

### 4.2. `TransferStatus` (Trạng thái Luân chuyển Kho Nội bộ)
📌 **Phạm vi áp dụng**: Bảng `shipment_transfers` (Nhập/Xuất kho giữa 2 Trưởng kho).

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `PENDING` | Chờ xuất kho | Kho xuất đã lập lệnh nhưng xe chưa xuất phát. |
| `IN_TRANSIT` | Đang luân chuyển | Hàng đã rời kho A, đang đi trên đường tới kho B. |
| `ARRIVED` | Đã nhập kho đích | Thủ kho B đã quét mã kiểm đếm và ký nhận nhập kho thành công. |
| `REJECTED` | Từ chối nhập kho | Kho B từ chối nhận do sai lệch số lượng hoặc hàng hư hỏng nặng. |

---

## 5. Module 6: Fleet & Vehicle Management (Đội xe & Phương tiện)

### 5.1. `VehicleStatus` (Trạng thái Xe Vận chuyển)
📌 **Phạm vi áp dụng**: Bảng `vehicles`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `ACTIVE` | Sẵn sàng hoạt động | Xe nằm tại bãi, tình trạng tốt, sẵn sàng gán cho chuyến mới. |
| `BUSY` | Đang đi chuyến | Xe đang được gán chạy cho một lộ trình/chuyến xe active. |
| `MAINTENANCE` | Đang bảo dưỡng / Sửa chữa| Xe đang ở Gara bảo dưỡng, thay nhớt hoặc sửa chữa. |
| `INACTIVE` | Tạm ngưng sử dụng | Xe tạm dừng chạy (thiếu tài xế hoặc hết hạn đăng kiểm). |
| `DISABLED` | Thanh lý / Vô hiệu hóa | Thay thế `deleted_at`. Xe đã thanh lý hoặc loại khỏi đội xe. |

---

## 6. Module 7: Routing & AI Optimization (Tuyến đường AI & Điều phối)

### 6.1. `RouteStatus` (Trạng thái Lộ trình Xe)
📌 **Phạm vi áp dụng**: Bảng `routes`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `PLANNED` | Mới lập lộ trình | Động cơ AI hoặc Điều phối viên vừa xếp tuyến thành công. |
| `ASSIGNED` | Đã gán cho Tài xế | Đã gửi lộ trình xuống ứng dụng của Tài xế. |
| `IN_PROGRESS` | Xe đang chạy theo tuyến | Tài xế đã bấm "Bắt đầu chạy" và đang di chuyển qua các stop. |
| `COMPLETED` | Hoàn thành lộ trình | Xe đã hoàn thành tất cả các điểm dừng trên tuyến. |
| `CANCELLED` | Hủy lộ trình | Lộ trình bị hủy do thời tiết, sự cố hoặc thay đổi kế hoạch. |

---

### 6.2. `RouteStopStatus` (Trạng thái Điểm dừng trên Tuyến)
📌 **Phạm vi áp dụng**: Bảng `route_stops`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `PENDING` | Chưa đến điểm | Điểm dừng đang chờ xe chạy đến. |
| `ARRIVED` | Đã đến điểm | Tài xế đã chạy xe đến đúng tọa độ GPS của điểm dừng. |
| `COMPLETED` | Đã xử lý xong điểm | Đã hoàn tất lấy hàng / giao hàng / trả hàng tại điểm. |
| `FAILED` | Xử lý thất bại | Không giao/lấy được hàng tại điểm dừng này. |
| `SKIPPED` | Bỏ qua điểm dừng | Tài xế hoặc hệ thống bỏ qua điểm dừng (do khách hẹn lại). |

---

## 7. Module 8: Tracking, Barcode & Proof of Delivery (POD)

### 7.1. `ScanType` (Mục đích Quét Mã Vạch Barcode)
📌 **Phạm vi áp dụng**: Bảng `barcode_scans`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `INBOUND` | Quét Nhập kho | Quét mã kiện hàng khi hạ từ xe tải xuống kho. |
| `OUTBOUND` | Quét Xuất kho | Quét mã kiện hàng khi xếp từ kho lên xe tải. |
| `SORTING` | Quét Chia chọn | Quét mã tại băng chuyền phân loại tự động. |
| `DELIVERY` | Quét Bàn giao | Shipper quét mã trước mặt khách hàng khi giao hàng. |

---

### 7.2. `PodType` (Hình thức Xác thực Bàn giao Giao hàng)
📌 **Phạm vi áp dụng**: Bảng `delivery_proofs`.

| Giá trị ENUM | Ý nghĩa Nghiệp vụ | Chi Tiết Sử Dụng |
| :--- | :--- | :--- |
| `SIGNATURE` | Chữ ký điện tử | Người nhận ký tên trực tiếp lên màn hình cảm ứng của Shipper. |
| `PHOTO` | Ảnh chụp bàn giao | Shipper chụp ảnh kiện hàng kèm vị trí trước cửa/nhà người nhận. |
| `OTP` | Mã OTP SMS | Khách hàng đọc mã OTP gửi qua SMS cho Shipper nhập xác nhận. |

---

📄 *Tài liệu giải thích ENUMs được khởi tạo & lưu chính thức tại*:  
👉 **[STATUS_ENUMS_EXPLANATION.md](file:///d:/smart-logistics-platform/Design%20DB/STATUS_ENUMS_EXPLANATION.md)**
