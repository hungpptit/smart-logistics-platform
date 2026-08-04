# Kế hoạch Tái cấu trúc CSDL & Bảng Theo dõi Tiến độ (Task Tracker)

Tài liệu này tổng hợp toàn bộ các yêu cầu tái cấu trúc CSDL, được sắp xếp theo thứ tự ưu tiên **từ dễ đến khó** (ưu tiên sửa tên / xóa trường thuộc tính đơn giản trước, sau đó đến thay đổi mối quan hệ và tái cấu trúc bảng).

---

## 📋 Danh sách Nhiệm vụ & Tiến độ (Task Tracker)

| STT | Phân nhóm | Mô tả Nhiệm vụ | Trạng thái | Ghi chú kỹ thuật |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **Phase 1: Thuộc tính đơn giản** | Xóa trường `gps_device_id` khỏi bảng `vehicles` | ✅ ĐÃ HOÀN THÀNH | Đã xóa thành công khỏi CSDL & Code |
| **2** | **Phase 1: Thuộc tính đơn giản** | Đổi tên `refrigeration_supported` ➔ `is_refrigerated` (bảng `vehicles`) | ✅ ĐÃ HOÀN THÀNH | Đã cập nhật thành thuộc tính boolean chuẩn |
| **3** | **Phase 1: Thuộc tính đơn giản** | Đổi tên `home_facility_id` ➔ `assigned_facility_id` (bảng `vehicles`) | ✅ ĐÃ HOÀN THÀNH | Đã đổi tên rõ nghĩa bưu cục gán xe |
| **4** | **Phase 1: Thuộc tính đơn giản** | Xóa trường `formatted_address` khỏi bảng `addresses` | ✅ ĐÃ HOÀN THÀNH | Đã loại bỏ chuỗi địa chỉ ghép sẵn |
| **5** | **Phase 2: Mối quan hệ N-N** | Tạo bảng trung gian N-N giữa Tài xế (`staff`) và Loại hình giao hàng | ✅ ĐÃ HOÀN THÀNH | Đã tách thành bảng trung gian staff_driver_types |
| **6** | **Phase 3: Mạng lưới Bưu cục** | Tái cấu trúc `facilities` gắn với Địa lý (3 Cấp kho: Miền ➔ Tỉnh ➔ Phường/Xã) | ✅ ĐÃ HOÀN THÀNH | Phân cấp 6 Kho Tổng Miền, 34 Kho Tổng Tỉnh & Trạm Bưu cục Phường/Xã |
| **7** | **Phase 4: Tái cấu trúc Packages** | Chuẩn hóa mô hình 1:1 `Order` ➔ `Package` ➔ `Shipment` | ✅ ĐÃ CHUẨN HÓA | 1 Đơn hàng (`Order`) tương ứng 1 Kiện hàng (`Package`). Gom nhiều kiện trung chuyển dùng `Shipment`. |

---

## 🛠️ Chi tiết Kế hoạch Thực hiện theo từng Phase

### Phase 1: Sửa tên Thuộc tính & Xóa trường Đơn giản (Ưu tiên thực hiện trước)
> **Mục tiêu:** Thực hiện nhanh các thay đổi trên từng thuộc tính đơn lẻ mà không làm vỡ cấu trúc liên kết chính của CSDL.

#### 1. Bảng `vehicles` (Danh mục Phương tiện):
* **Xóa cột:** `gps_device_id` (Loại bỏ hoàn toàn thiết bị GPS phần cứng).
* **Đổi tên cột:** `refrigeration_supported` ➔ `is_refrigerated` (Tên ngắn gọn, đúng chuẩn boolean).
* **Đổi tên cột:** `home_facility_id` ➔ `assigned_facility_id` (Tên rõ nghĩa hơn: Bưu cục quản lý / gán xe).
* **Đồng bộ mã nguồn:** Cập nhật Prisma Schema, các DTO, Controller và từ điển CSDL [database_dictionary.md](file:///d:/smart-logistics-platform/Design%20DB/database_dictionary.md).

#### 2. Bảng `addresses` (Kho Địa chỉ):
* **Xóa cột:** `formatted_address` (Xóa bỏ chuỗi địa chỉ ghép sẵn).
* **Cập nhật mã nguồn:** Cập nhật các hàm xử lý địa chỉ trong `order.service.ts`, `customer.service.ts`, `facility.service.ts` để đọc và trả về trực tiếp từ `addressLine1` + `ward` / `province`.

---

### Phase 2: Mối quan hệ N-N Tài xế - Hình thức Giao hàng
> **Mục tiêu:** Cho phép 1 Tài xế (`staff`) có thể chạy nhiều Hình thức/Loại hình giao hàng khác nhau (Ví dụ: Vừa chạy Giao hỏa tốc nội thành `HUB_DELIVERY`, vừa chạy Chuyển tuyến liên tỉnh `LINEHAUL_TRANSFER`).

* **Tạo bảng trung gian:** `staff_driver_types` (hoặc `driver_delivery_modes`)
  * `staff_id` (FK ➔ `staff.id`)
  * `driver_type` (Enum `DriverType`: `HUB_DELIVERY`, `LINEHAUL_TRANSFER`, `ON_DEMAND`)
* **Chuyển đổi:** Xóa cột đơn `driver_type` trên bảng `staff` và thay bằng quan hệ N-N qua bảng trung gian mới.

---

### Phase 3: Mạng lưới Bưu cục theo Địa lý Tỉnh/Thành (`facilities` Hierarchy)
> **Mục tiêu:** Chuẩn hóa quy định mỗi Tỉnh/Thành phố có **1 Kho tổng (Provincial Hub)** làm đầu mối, các Bưu cục nhỏ trong tỉnh đóng vai trò là **Trạm giao nhận Phường/Xã (Ward Station / Sub-hub)**.

* **Cấu hình bảng `facilities`:**
  * Thêm/Chuẩn hóa liên kết `province_code` (FK ➔ `provinces.code`) để xác định bưu cục thuộc Tỉnh/Thành nào.
  * Phân biệt rõ loại bưu cục `facility_type`: `SORTING_CENTER` (Kho Tổng Miền - Cấp 1), `PROVINCIAL_HUB` (Kho Tổng Tỉnh - Cấp 2), `WARD_STATION` (Trạm Bưu cục Phường/Xã - Cấp 3).
  * Quy tắc cây phân cấp `parent_facility_id`: Tự động gán Trạm con Phường/Xã trỏ về Kho Tổng Tỉnh tương ứng theo `provinceCode` và `wardCode`.

---

### Phase 4: Chuẩn hóa Mô hình Kiện hàng (`packages`) & Lô hàng Trung chuyển (`shipments`)
> **Mục tiêu:** Thống nhất định nghĩa đúng vai trò của từng Entity trong hệ thống Logistics Chuyển phát nhanh.

* **Làm rõ mô hình:**
  * **`Order` ➔ `Package` (Quan hệ 1 - 1):** 1 Đơn hàng (`Order`) tương ứng với 1 Kiện hàng (`Package`) vật lý duy nhất. `Package` chứa mã barcode, cân nặng `weight`, thể tích `volume`, chỉ số hàng dễ vỡ `isFragile`.
  * **`Shipment` & `ShipmentPackage` (Quan hệ 1 - N):** Quản lý việc gom nhiều Kiện hàng (`Package`) vào 1 Lô hàng/Vận đơn trung chuyển giữa các Bưu cục (`originFacilityId` ➔ `destinationFacilityId`).
* **Kết luận:** Mô hình chuẩn hóa 1 Đơn hàng = 1 Kiện hàng đơn giản, dễ quản lý và việc gom hàng trung chuyển do `Shipment` đảm nhận.

---

## 🔍 Kế hoạch Kiểm tra & Xác minh (Verification Plan)

### Automated Tests & Code Verification
1. Sau mỗi Phase, chạy `npx prisma db push --accept-data-loss` để đồng bộ PostgreSQL DB.
2. Chạy `npx prisma generate` để làm mới `@prisma/client`.
3. Chạy `npx tsc --noEmit` để đảm bảo **0 lỗi biên dịch TypeScript**.
4. Chạy kịch bản `audit_db.js` để đảm bảo CSDL thực tế và tài liệu `database_dictionary.md` trùng khớp 100%.
