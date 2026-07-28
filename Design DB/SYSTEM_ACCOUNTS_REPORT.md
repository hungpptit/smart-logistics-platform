# BÁO CÁO DANH SÁCH TÀI KHOẢN ĐĂNG NHẬP HỆ THỐNG
**Dự án**: Smart Logistics Platform (SLP)  
**Ngày khởi tạo**: 28/07/2026  
**Mục đích**: Tổng hợp danh sách toàn bộ tài khoản thử nghiệm ứng dụng (Web/Mobile App) và tài khoản phân quyền CSDL (PostgreSQL DB User Roles) để thuận tiện cho việc tra cứu & đăng nhập.

---

## 🔑 1. DANH SÁCH TÀI KHOẢN ĐĂNG NHẬP ỨNG DỤNG (WEB & MOBILE APP)

Dùng cho việc đăng nhập vào **Giao diện Web Admin, Cổng Khách hàng, App Mobile Shipper** hoặc test các API qua Swagger / Postman.

| STT | Vai Trò (Role) | Username (Tên đăng nhập) | Password (Mật khẩu) | Mã Định Danh | Quyền Hạn Trực Quan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **ADMIN** | `admin` | `AdminPassword123` | `EMP-ADMIN-01` | **Quản trị viên toàn hệ thống**: Có toàn quyền cấu hình, quản lý người dùng, xem báo cáo tổng hợp. |
| **2** | **STAFF** | `staff` | `StaffPassword123` | `EMP-STAFF-01` | **Nhân viên Điều phối / Bưu cục**: Tạo & duyệt chuyến hàng, phân công xe, điều hành kho bãi. |
| **3** | **SHIPPER** | `shipper` | `DriverPassword123` | `EMP-DRIVER-01` | **Tài xế Giao hàng (Driver)**: Nhận đơn giao, cập nhật GPS real-time, quét mã QR/Barcode và tải ảnh POD xác thực. |
| **4** | **CUSTOMER** | `customer` | `CustomerPassword123` | `CUST-001` | **Khách hàng**: Tạo đơn hàng gửi lẻ/doanh nghiệp, tra cứu hành trình vận đơn, quản lý sổ địa chỉ kho. |

---

## 🐘 2. DANH SÁCH TÀI KHOẢN KẾT NỐI CSDL (POSTGRESQL DATABASE USER ROLES)

Dùng cho việc kết nối và truy vấn CSDL qua các phần mềm như **DBeaver, pgAdmin, DataGrip, psql**.

- **Host**: `localhost` (hoặc `127.0.0.1`)
- **Port**: `5432`
- **Database Name**: `smart_logistics_db`

| DB Role Name | DB Username | DB Password | Chuỗi Kết Nối (`DATABASE_URL`) | Giới Hạn Bảo Mật CSDL |
| :--- | :--- | :--- | :--- | :--- |
| **Admin DB User** | `app_admin_user` | `AdminSecurePass2026!` | `postgresql://app_admin_user:AdminSecurePass2026!@localhost:5432/smart_logistics_db` | **`ALL PRIVILEGES`**: Toàn quyền Đọc/Ghi/Sửa/Xóa trên toàn bộ CSDL. |
| **Staff DB User** | `app_staff_user` | `StaffSecurePass2026!` | `postgresql://app_staff_user:StaffSecurePass2026!@localhost:5432/smart_logistics_db` | Đọc/Ghi các bảng vận hành (`staff`, `facilities`, `orders`, `shipments`, `vehicles`). **Cấm `system_settings`, `roles`**. |
| **Customer DB User** | `app_customer_user` | `CustSecurePass2026!` | `postgresql://app_customer_user:CustSecurePass2026!@localhost:5432/smart_logistics_db` | Đọc/Ghi các bảng khách hàng (`customers`, `customer_addresses`, `orders`). **Cấm `staff`, `users`, `system_settings`**. |
| **Auth DB User** | `app_auth_user` | `AuthSecurePass2026!` | `postgresql://app_auth_user:AuthSecurePass2026!@localhost:5432/smart_logistics_db` | Đọc/Ghi duy nhất trên bảng `users` phục vụ xác thực đăng nhập. **Cấm tất cả các bảng khác**. |

---

## 📌 LƯU Ý KHI SỬ DỤNG
- File cấu hình này được lưu chính thức tại: **[SYSTEM_ACCOUNTS_REPORT.md](file:///d:/smart-logistics-platform/Design%20DB/SYSTEM_ACCOUNTS_REPORT.md)**
- Để kiểm tra nhanh tính khả thi của tài khoản API, bạn có thể truy cập **Swagger API Docs** tại: `http://localhost:5000/api-docs`
