# KẾ HOẠCH TRIỂN KHAI CHI TIẾT CHO THÀNH VIÊN 1 - TUẦN 2 (BACKEND DEV)

Tài liệu này vạch ra lộ trình thực hiện từng bước (Step-by-step), danh sách các file cần tạo mới/chỉnh sửa và các hướng dẫn kỹ thuật chi tiết để Thành viên 1 hoàn thành 100% nhiệm vụ trong **Tuần 2**.

---

## 🎯 MỤC TIÊU CỐT LÕI
Hoàn thành 4 phân hệ chính phía Backend:
1.  **Phân hệ Auth (JWT & RBAC):** Hoàn thiện API Logout, Refresh Token, bảo vệ toàn bộ API bằng Middleware. (Đã hoàn thành)
2.  **Phân hệ Khách hàng (Customer & Address Book):** APIs quản lý tài khoản khách hàng, sổ địa chỉ nhận/gửi. (Đã hoàn thành)
3.  **Phân hệ Kho bãi (Facility & Cargo Zones):** APIs quản lý bưu cục, phân khu lưu kho hàng hóa. (Đã hoàn thành)
4.  **Phân hệ Đơn hàng & Tính phí tự động (Order Booking & Pricing Engine):** Tích hợp Geocoding API chuyển đổi địa chỉ thành GPS, tính phí tự động dựa trên quy tắc, tự sinh mã QR Code, lưu Snapshot đơn hàng. (Đã hoàn thành)

---

## 🛠️ CẤU TRÚC THƯ MỤC CẦN TRIỂN KHAI
Các file cần tạo mới (🆕) hoặc chỉnh sửa (✏️) trong thư mục `backend/src/`:

```text
backend/src/
├── dtos/
│   ├── auth.dto.ts (✏️ - Đã thêm RefreshTokenDto)
│   ├── customer.dto.ts (🆕 - Đã tạo)
│   ├── facility.dto.ts (🆕 - Đã tạo)
│   └── order.dto.ts (🆕 - Đã tạo)
├── controllers/
│   ├── auth.controller.ts (✏️ - Đã thêm refresh/logout)
│   ├── customer.controller.ts (🆕 - Đã tạo)
│   ├── facility.controller.ts (🆕 - Đã tạo)
│   └── order.controller.ts (🆕 - Đã tạo)
├── services/
│   ├── auth.service.ts (✏️ - Đã thêm logic refresh/logout)
│   ├── customer.service.ts (🆕 - Đã tạo)
│   ├── facility.service.ts (🆕 - Đã tạo)
│   ├── order.service.ts (🆕 - Đã tạo)
│   ├── geocoding.service.ts (🆕 - Đã tạo)
│   └── pricing/
│       └── pricing.service.ts (🆕 - Đã tạo)
├── routes/
│   ├── index.ts (✏️ - Đã mount customer, facility, order)
│   ├── auth.routes.ts (✏️ - Đã thêm route refresh/logout)
│   ├── customer.routes.ts (🆕 - Đã tạo)
│   ├── facility.routes.ts (🆕 - Đã tạo)
│   └── order.routes.ts (🆕 - Đã tạo)
```

---

## 📋 LỘ TRÌNH THỰC HIỆN TỪNG BƯỚC (STEP-BY-STEP PLAN)

### BƯỚC 1: HOÀN THIỆN PHÂN HỆ AUTH & MIDDLEWARE - **[ĐÃ HOÀN THÀNH 100%]**
*   **Kết quả đạt được:** 
    *   Đã hoàn thiện logic Refresh Token và Logout tích hợp cùng Redis Caching (cấu hình TTL 7 ngày).
    *   Đăng ký các route `/auth/refresh` và `/auth/logout` với middleware bảo vệ tương ứng.

---

### BƯỚC 2: APIs KHÁCH HÀNG & SỔ ĐỊA CHỈ - **[ĐÃ HOÀN THÀNH 100%]**
*   **Kết quả đạt được:**
    *   Xây dựng xong `CreateCustomerDto`, `UpdateCustomerDto` và `CreateAddressDto` để validate chặt chẽ thông tin đầu vào.
    *   Phát triển `customer.service.ts` xử lý CRUD khách hàng (soft-delete kiểm tra các đơn hàng đang hoạt động để ngăn chặn xóa).
    *   Phát triển Sổ địa chỉ (Address Book) hỗ trợ thiết lập duy nhất một địa chỉ mặc định (isDefault).
    *   Áp dụng kiểm tra phân quyền ngang (Ownership check): Khách hàng thường chỉ được phép chỉnh sửa/truy cập dữ liệu của chính mình, ADMIN/STAFF có toàn quyền.

---

### BƯỚC 3: APIs KHO BÃI & PHÂN KHU - **[ĐÃ HOÀN THÀNH 100%]**
*   **Kết quả đạt được:**
    *   Xây dựng DTO, Service, Controller, Router cho Kho bãi (Facility) và Phân khu hàng hóa (FacilityZone).
    *   Chỉ cho phép tài khoản có vai trò `ADMIN` hoặc `STAFF` truy cập và thao tác trên phân hệ này.
    *   Kiểm tra logic nghiệp vụ: Không cho xóa kho bãi nếu có kho bãi con trực thuộc hoặc đang có tuyến vận tải hoạt động qua.

---

### BƯỚC 4: BỘ TÍNH PHÍ TỰ ĐỘNG & APIs ĐƠN HÀNG - **[ĐÃ HOÀN THÀNH 100%]**
*   **Kết quả đạt được:**
    *   Xây dựng `geocoding.service.ts` chuyển đổi địa chỉ sang GPS sử dụng Nominatim API và cơ chế mock fallback an toàn. Tính khoảng cách địa lý Haversine.
    *   Xây dựng bộ tính phí `pricing.service.ts` tự động theo công thức của dự án (Cước cơ bản + Phí khoảng cách quá hạn + Phí trọng lượng quá hạn + Phụ phí hàng dễ vỡ/COD).
    *   Xây dựng `order.service.ts` xử lý quy trình đặt đơn trong database transaction: tự động sinh mã đơn/kiện hàng độc nhất, lưu snapshot chi tiết thông tin gửi/nhận lúc đặt đơn, ghi nhận lịch sử trạng thái `OrderStatusHistory` và thông tin thanh toán mặc định `OrderPayment`.
    *   Toàn bộ mã nguồn đã biên dịch thành công 100% bằng `tsc` không có lỗi.

---

### BƯỚC 5: TÀI LIỆU SWAGGER & BỘ KIỂM THỬ POSTMAN (Thời gian dự kiến: Ngày 7) - **[ĐÃ HOÀN THÀNH 100%]**
*   **Tác vụ 5.1 — Hoàn thiện Swagger Docs:** Viết tài liệu mô tả cho các APIs mới thêm. (Đã hoàn thành - Tích hợp tại /api-docs sử dụng swagger-jsdoc)
*   **Tác vụ 5.2 — Tạo Postman Collection:** Tạo các kịch bản kiểm thử API tự động. (Đã hoàn thành - File velocity_api_collection.json nằm trong thư mục Design DB)

---

### BƯỚC TĂNG CƯỜNG: CHUẨN HÓA DỮ LIỆU ĐỊA CHÍNH VIỆT NAM (DATABASE NORMALIZATION) - **[ĐÃ HOÀN THÀNH 100%]**
*   **Kết quả đạt được:**
    *   **Tích hợp Schema:** Định nghĩa thành công các model `Province`, `Ward`, `AdministrativeUnit`, và `AdministrativeRegion` trong `schema.prisma`.
    *   **Đồng bộ Database:** Chạy migration `add_administrative_units` và import thành công toàn bộ dữ liệu địa chính chính thức từ Git (`postgres_ImportData_vn_units.sql`) vào cơ sở dữ liệu PostgreSQL.
    *   **Chuẩn hóa Address:** Nâng cấp bảng `Address` thêm trường `wardCode` liên kết khóa ngoại với bảng `wards`.
    *   **Hỗ trợ tương thích ngược (Backward Compatibility):** Phát triển bộ giải quyết địa chỉ `address-resolver.ts` tự động điền các trường phẳng (`ward`, `district`, `province`) dựa trên `wardCode` được truyền lên. Điều này giữ cho toàn bộ logic nghiệp vụ tính phí và geocoding cũ không bị ảnh hưởng.
    *   **Nâng cấp DTOs:** Tích hợp trường `wardCode` tùy chọn vào `customer.dto.ts`, `facility.dto.ts` và `order.dto.ts`.

---

## ⚠️ CÁC TIÊU CHUẨN KỸ THUẬT BẮT BUỘC TUÂN THỦ (Từ file chuẩn dự án)
1.  **Dữ liệu tọa độ GPS:** Lưu độc lập 2 cột `latitude` và `longitude` kiểu `Float`. Trả về `[Longitude, Latitude]` cho Frontend.
2.  **Định dạng response JSON:** Định dạng chuẩn `{ success, message, data }`.
3.  **Xử lý lỗi tập trung:** Ném lỗi qua các lớp kế thừa `HttpException`, tự động xử lý bởi global error middleware.
4.  **Múi giờ:** Lưu trữ UTC-0.