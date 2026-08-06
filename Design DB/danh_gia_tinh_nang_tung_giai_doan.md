# BÁO CÁO ĐÁNH GIÁ TÍNH NĂNG WEB/MOBILE THEO TỪNG GIAI ĐOẠN NGHIỆP VỤ (PHIÊN BẢN MÃ HÓA TÀI KHOẢN)

**Dự án**: Smart Logistics Platform (SLP)  
**Ngày kiểm tra**: 06/08/2026  
**Mục tiêu**: Kiểm tra độ phủ của phần mềm cho 8 giai đoạn vận hành, gán định danh tài khoản (`Role`) và loại tài xế (`DriverType`) tham gia tại từng màn hình.

---

## 📊 BẢNG TỔNG HỢP HIỆN TRẠNG & TÀI KHOẢN THAM GIA

| Giai đoạn | Loại Tài khoản (`Role`) | Loại Nhân viên / DriverType | Trạng thái Hỗ trợ | Màn hình Web / Mobile Phụ trách |
| :--- | :--- | :--- | :--- | :--- |
| **1. Tạo đơn & Sẵn sàng lấy** | `CUSTOMER` | Khách hàng Gửi (Shop) | 🟡 **Đạt 80%** | Web `CreateOrderModal`, `BulkOrderUploadModal`<br>Mobile `create_order_tab.dart` |
| **2. Chốt ca & AI Tái tối ưu** | `SYSTEM` & `STAFF` & `SHIPPER` | Điều phối viên (`STAFF`) & Shipper (`HUB_DELIVERY` / `ON_DEMAND`) | 🟡 **Đạt 60%** | Web `RouteOptimizationModal`<br>Mobile `driver_dashboard.dart` |
| **3. Nhập kho Xã Nguồn** | `SHIPPER` & `STAFF` | Shipper (`HUB_DELIVERY`) & Thủ kho Xã Nguồn (`STAFF`) | 🔴 **Đạt 40%** | Web `FacilityTab.tsx`, `CargoZoneModal`<br>*Thiếu Inbound Scanner Web* |
| **4. Trung chuyển Liên kho** | `SHIPPER` & `STAFF` | Tài xế Trung chuyển (`LINEHAUL_TRANSFER`) & Thủ kho Kho Tỉnh/Miền | 🟡 **Đạt 50%** | Web `LiveTrackingTab.tsx`<br>Mobile GPS Background Driver App |
| **5. Thủ kho Đích Phân sọt**| `STAFF` & `SHIPPER` | Thủ kho Xã Đích (`STAFF`) & Shipper Phát (`HUB_DELIVERY`) | 🟡 **Đạt 50%** | Web `RouteOptimizationModal`<br>*Thiếu Hub Inbound Scanner* |
| **6. Shipper giao chặng cuối**| `SHIPPER` & `CUSTOMER` | Shipper Phát (`HUB_DELIVERY`) & Khách hàng Nhận (`CUSTOMER`) | 🟡 **Đạt 70%** | Mobile `driver_dashboard.dart`<br>*Thiếu chụp POD & ký tên* |
| **7. Giao thất bại & Hoàn** | `SHIPPER` & `STAFF` | Shipper Phát (`HUB_DELIVERY`) & Điều phối Bưu cục (`STAFF`) | 🔴 **Đạt 30%** | Backend `DeliveryFailureReason`<br>*Thiếu màn hình báo thất bại Mobile* |
| **8. Kế toán Đối soát COD** | `SHIPPER` & `STAFF` | Shipper (`HUB_DELIVERY`) & Kế toán/Thủ quỹ (`ACCOUNTANT`/`CASHIER`) | 🔴 **Đạt 20%** | Backend `OrderPayment`<br>*Thiếu Web Kế toán nộp & đếm tiền T+1* |

---

## 📝 CHI TIẾT TÀI KHOẢN & TÍNH NĂNG THEO TỪNG GIAI ĐOẠN

### GIAI ĐOẠN 1: SHOP (KHÁCH HÀNG GỬI) - TẠO ĐƠN & SẴN SÀNG LẤY
* **Tài khoản thao tác**: `CUSTOMER` (Khách hàng Gửi / Shop).
* **Tính năng ĐÃ CÓ**:
  * Web `CreateOrderModal.tsx`: Tạo đơn lẻ (Tên, SĐT, COD, cân nặng, địa chỉ).
  * Web `BulkOrderUploadModal.tsx`: Import file Excel tạo đơn hàng loạt.
  * Mobile `create_order_tab.dart`: Tạo đơn trên ứng dụng di động Flutter.
* **Tính năng CẦN BỔ SUNG**:
  * ❌ Nút bấm Shop **"Sẵn sàng lấy" (`READY_FOR_PICKUP`)**.
  * ❌ Tính năng **In Tem Mã Vạch / Shipping Label (PDF)** dán lên bưu kiện.

---

### GIAI ĐOẠN 2: CHỐT CA & AI TÁI TỐI ƯU CỜ KÉP ⭐
* **Tài khoản thao tác**:
  1. `SYSTEM` (Hệ thống AI): Tự động gom cụm K-Means lúc 10h30 & 15h30.
  2. `STAFF` (Điều phối viên Bưu cục - Dispatcher): Xem danh sách cụm đơn trên Web Console, phê duyệt gán tuyến cho Shipper.
  3. `SHIPPER` (`HUB_DELIVERY` / `ON_DEMAND`): Nhận lộ trình Cờ Kép trên Mobile App.
* **Tính năng ĐÃ CÓ**: Web `RouteOptimizationModal.tsx`, Mobile `driver_dashboard.dart` phát GPS ngầm.
* **Tính năng CẦN BỔ SUNG**:
  * ❌ Thuật toán Tự động **Chốt ca 10h30 & 15h30**.
  * ❌ Thuật toán AI **Trộn Đơn Giao tồn + Đơn Lấy mới** xuất phát từ GPS thực tế.
  * ❌ Giao diện Mobile App Bản đồ **Cờ Đỏ 🔴 (Giao) & Cờ Xanh 🟢 (Lấy)**.
  * ❌ Camera Quét mã QR/Barcode Lấy hàng tại Shop.

---

### GIAI ĐOẠN 3: THỦ KHO NGUỒN (ARRIVED ORIGIN FACILITY & DISPATCH)
* **Tài khoản thao tác**:
  1. `SHIPPER` (`HUB_DELIVERY`): Chở bưu kiện về bưu cục Xã Nguồn.
  2. `STAFF` (Thủ kho Bưu cục Xã Nguồn): Nhập kho & đóng sọt xe trung chuyển.
* **Tính năng ĐÃ CÓ**: Web `FacilityTab.tsx`, `CargoZoneModal.tsx`.
* **Tính năng CẦN BỔ SUNG**:
  * ❌ Màn hình **Quét Mã Vạch Inbound Nhập Kho** (`ARRIVED_ORIGIN_FACILITY`).
  * ❌ Giao diện **Gom Vận Đơn (`Shipment`) xuất kho** cho xe tải (`READY_FOR_DISPATCH`).

---

### GIAI ĐOẠN 4: TRUNG CHUYỂN LIÊN KHO (3 CẤP KHO)
* **Tài khoản thao tác**:
  1. `SHIPPER` (`LINEHAUL_TRANSFER` - Tài xế Xe tải Trung chuyển): Khởi hành chuyến xe (`IN_TRANSIT`), phát vị trí GPS real-time ngầm.
  2. `STAFF` (Thủ kho Kho Tỉnh `PROVINCIAL_HUB` & Kho Miền `SORTING_CENTER`): Quét Check-in/Check-out trạm trung gian.
* **Tính năng ĐÃ CÓ**: Web `LiveTrackingTab.tsx` (xem bản đồ GPS xe tải vệ tinh real-time).
* **Tính năng CẦN BỔ SUNG**:
  * ❌ Màn hình **Quản lý Chuyến xe cho Tài xế Xe tải**.
  * ❌ Quét barcode **Check-in / Check-out** tại các trạm Kho Tỉnh & Kho Miền.

---

### GIAI ĐOẠN 5: THỦ KHO ĐÍCH PHÂN SỌT PHÁT CHẶNG CUỐI
* **Tài khoản thao tác**:
  1. `STAFF` (Thủ kho Bưu cục Xã Đích): Nhập kho chặng cuối (`AT_HUB`), chạy AI phân sọt phát.
  2. `SHIPPER` (`HUB_DELIVERY` - Shipper chặng cuối): Kiểm đếm & nhận sọt phát.
* **Tính năng ĐÃ CÓ**: Web `RouteOptimizationModal.tsx`.
* **Tính năng CẦN BỔ SUNG**:
  * ❌ Màn hình **Quét Inbound Kho Đích hàng loạt**.
  * ❌ Màn hình **In & Bàn giao Sọt hàng cho Shipper phát**.

---

### GIAI ĐOẠN 6: SHIPPER GIAO HÀNG CHẶNG CUỐI
* **Tài khoản thao tác**:
  1. `SHIPPER` (`HUB_DELIVERY` / `ON_DEMAND`): Bấm "Bắt đầu giao" (`OUT_FOR_DELIVERY`), giao hàng.
  2. `CUSTOMER` (Khách hàng Nhận / Recipient): Trả tiền COD & Ký nhận.
* **Tính năng ĐÃ CÓ**: Mobile `driver_dashboard.dart` (xem danh sách điểm dừng phát, mở Google Maps).
* **Tính năng CẦN BỔ SUNG**:
  * ❌ Nút **"Bắt đầu đi giao" (`OUT_FOR_DELIVERY`)**.
  * ❌ Màn hình **Quét Barcode & Nhập tiền COD thu thực tế**.
  * ❌ Tính năng **Chụp ảnh POD & Khung ký tên Điện tử** trên App (`DELIVERED`).

---

### GIAI ĐOẠN 7: XỬ LÝ GIAO THẤT BẠI & CHUYỂN HOÀN
* **Tài khoản thao tác**:
  1. `SHIPPER` (`HUB_DELIVERY`): Báo giao thất bại trên Mobile App, mang hàng về bưu cục.
  2. `STAFF` (Nhân viên Điều phối Bưu cục): Sắp xếp ca giao lại hoặc bấm Chuyển hoàn (`RETURNING`).
* **Tính năng ĐÃ CÓ**: Backend schema `DeliveryFailureReason`.
* **Tính năng CẦN BỔ SUNG**:
  * ❌ Màn hình **Báo Giao Thất Bại trên Mobile App**.
  * ❌ Chức năng **Lên lịch Giao lại / Chuyển hoàn (`RETURNING` $\rightarrow$ `RETURNED`)**.

---

### GIAI ĐOẠN 8: KẾ TOÁN / THỦ QUỸ - ĐỐI SOÁT COD CỦOI NGÀY ⭐
* **Tài khoản thao tác**:
  1. `SHIPPER` (`HUB_DELIVERY`): Nộp tiền mặt COD cuối ngày trên App Mobile.
  2. `STAFF` (Role `ACCOUNTANT` / `CASHIER` - Kế toán / Thủ quỹ Bưu cục): Đếm tiền, đối chiếu đơn, bóp lệch tiền & bấm **"Phê duyệt chuyển khoản COD T+1 cho Shop"** (`COMPLETED`).
* **Tính năng ĐÃ CÓ**: Backend database `OrderPayment`.
* **Tính năng CẦN BỔ SUNG**:
  * ❌ Màn hình **Shipper nộp tiền COD cuối ngày (Mobile App)**.
  * ❌ Mô-đun **Quản lý Đối soát Tài chính cho Kế toán / Thủ quỹ (Web Console)**.
