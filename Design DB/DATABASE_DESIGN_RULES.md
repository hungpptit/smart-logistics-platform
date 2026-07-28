# NGUYÊN TẮC VÀ BỘ QUY TẮC THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE DESIGN RULES)
**Dự án**: Smart Logistics Platform (SLP)  
**Phiên bản**: 2.0 (Chuẩn hóa 3NF, Phân quyền DB Role Security & Bảo mật PII)  
**Áp dụng**: Tất cả các Module CSDL (Module 1 đến Module 9)

---

## 📋 MỤC LỤC
1. [Triết Lý & Mục Tiêu Thiết Kế](#1-triết-lý--mục-tiêu-thiết-kế)
2. [Quy Tắc 1: Phân Tách Danh Tính Đăng Nhập & Hồ Sơ PII](#quy-tắc-1-phân-tách-danh-tính-đăng-nhập--hồ-sơ-pii)
3. [Quy Tắc 2: Lưu Thông Tin Liên Lạc Trực Tiếp Tại Bảng Profile](#quy-tắc-2-lưu-thông-tin-liên-lạc-trực-tiếp-tại-bảng-profile)
4. [Quy Tắc 3: Hợp Nhất Thực Thể Tương Đồng Tránh Phân Mảnh](#quy-tắc-3-hợp-nhất-thực-thể-tương-đồng-tránh-phân-mảnh)
5. [Quy Tắc 4: Quản Lý Ẩn Dữ Liệu Dùng Flag `is_hidden`](#quy-tắc-4-quản-lý-ẩn-dữ-liệu-dùng-flag-is_hidden)
6. [Quy Tắc 5: Phân Quyền Bảo Mật Cấp CSDL (PostgreSQL DB Roles)](#quy-tắc-5-phân-quyền-bảo-mật-cấp-csdl-postgresql-db-roles)
7. [Quy Tắc 6: Chuẩn Đặt Tên (Naming Conventions) & Indexing](#quy-tắc-6-chuẩn-đặt-tên-naming-conventions--indexing)
8. [Quy Tắc 7: Bộ Quy Tắc Tối Ưu Hóa Truy Vấn CSDL](#quy-tắc-7-bộ-quy-tắc-tối-ưu-hóa-truy-vấn-csdl-query-optimization-rules)
9. [Hướng Dẫn Áp Dụng Cho Các Module Còn Lại (Module 2 -> 9)](#8-hướng-dẫn-áp-dụng-cho-các-module-còn-lại-module-2---9)

---

## 1. TRIẾT LÝ & MỤC TIÊU THIẾT KẾ

Cơ sở dữ liệu của Smart Logistics Platform phải tuân thủ 3 trụ cột kiến trúc cốt lõi:
1. **Chuẩn Hóa 3NF (Third Normal Form)**: Loại bỏ triệt để dữ liệu dư thừa, đảm bảo tính toàn vẹn tham chiếu (Referential Integrity) và không bị bất thường khi Thêm/Sửa/Xóa.
2. **Bảo Mật Phòng Thủ Theo Chiều Sâu (Defense-in-Depth Security)**: Phân tách danh tính credentials khỏi thông tin định danh cá nhân (PII). Xây dựng lớp bảo mật phân quyền ngay tại động cơ PostgreSQL DB Level.
3. **Tối Ưu Hóa Truy Vấn (Query Optimization)**: Thiết kế đường đi truy vấn ngắn nhất (ít JOIN nhất) cho các tác vụ lấy dữ liệu tần suất cao như gửi email, SMS notification, tra cứu đơn hàng, định vị tài xế.

---

## QUY TẮC 1: PHÂN TÁCH DANH TÍNH ĐĂNG NHẬP & HỒ SƠ PII

### 🔒 Nguyên tắc:
Bảng `users` chỉ đóng vai trò **Xác thực danh tính thuần túy (Pure Identity Credentials)**. 

### 📐 Chi tiết thiết kế:
- **Bảng `users` CHỈ LƯU TRỮ**:
  - `id` (UUID Primary Key)
  - `username` (Tên tài khoản đăng nhập duy nhất)
  - `password_hash` (Chuỗi băm mật khẩu Bcrypt)
  - `status` (Enum: `ACTIVE`, `LOCKED`, `DISABLED`, `PENDING_VERIFICATION`)
  - `is_hidden` (Boolean flag ẩn tài khoản)
  - `role_id` (Foreign key trỏ tới vai trò)
  - `last_login_at`, `created_at`, `updated_at` (Timestamps)
- **TẤT CẢ THÔNG TIN PII ĐỀU PHẢI ĐƯỢC CHUYỂN SANG BẢNG PROFILE BÊN NGOÀI**:
  - ❌ **KHÔNG** để `email`, `phone`, `full_name`, `avatar_url`, `citizen_id`, `deleted_at` trong bảng `users`.
  - 💡 **Mục đích bảo mật**: Trường hợp hacker tấn công chiếm được bảng `users`, chúng chỉ thu được danh sách `username` và `password_hash` mà **KHÔNG BIẾT** tài khoản đó là của ai, thuộc về khách hàng nào hay nhân viên nào.

---

## QUY TẮC 2: LƯU THÔNG TIN LIÊN LẠC TRỰC TIẾP TẠI BẢNG PROFILE

### 🚀 Nguyên tắc:
Đặt các thông tin liên lạc (`email`, `phone`, `full_name`) trực tiếp tại bảng Profile nghiệp vụ (`customers` hoặc `staff`).

### 📐 Chi tiết thiết kế:
- **Bảng `customers`**: Lưu `full_name`, `phone`, `email`, `customer_code`, `customer_type`, `company_name`, `tax_code`.
- **Bảng `staff`**: Lưu `full_name`, `phone`, `email`, `citizen_id`, `employee_code`, `position`, `assigned_facility_id`.
- **Lý do tối ưu**:
  - Đăng nhập hệ thống sử dụng duy nhất `username` (truy vấn 1 bảng `users`).
  - Khi hệ thống/Worker cần gửi SMS/Email thông báo đơn hàng cho khách hàng hoặc tài xế, chỉ cần thực hiện `SELECT email, phone FROM customers WHERE id = ...` $\rightarrow$ Truy vấn trực tiếp tại 1 bảng, **không cần SQL JOIN** sang bảng `users`, giúp tăng tốc độ đọc dữ liệu cực lớn.

---

## QUY TẮC 3: HỢP NHẤT THỰC THỂ TƯƠNG ĐỒNG TRÁNH PHÂN MẢNH

### 🧩 Nguyên tắc:
Hợp nhất các thực thể có cùng bản chất nhân sự/người dùng trong doanh nghiệp vào chung một bảng master profile, tránh tạo nhiều bảng riêng lẻ gây rối loạn quan hệ.

### 📐 Chi tiết thiết kế:
- **Hợp nhất `staff_profiles` và `drivers` $\rightarrow$ Duy nhất bảng `staff` (`@map("staff")`)**:
  - Mọi người lao động trong công ty (Nhân viên văn phòng, Nhân viên điều phối bưu cục, Thủ kho, Tài xế giao hàng) đều lưu chung trong bảng `staff`.
  - Phân biệt chức vụ qua trường `position` (Enum: `ADMIN`, `DISPATCHER`, `WAREHOUSE_STAFF`, `DRIVER`).
  - **Các trường chuyên biệt cho Tài xế** (`driver_license_number`, `driver_license_class`, `driver_type`, `employment_status`, `preferred_latitude`, `preferred_longitude`) được đặt là **Nullable** (`?`).
    - Nếu `position == 'DRIVER'`: các trường này chứa dữ liệu bằng lái, loại xe.
    - Nếu `position != 'DRIVER'`: các trường này mang giá trị `NULL`.

---

## QUY TẮC 4: QUẢN LÝ ẨN DỮ LIỆU DÙNG FLAG `is_hidden`

### 🚩 Nguyên tắc:
Loại bỏ hoàn toàn trường `deleted_at` kiểu `DateTime?` đối với việc quản lý trạng thái ẩn dữ liệu. Thay thế bằng flag boolean **`is_hidden`**.

### 📐 Chi tiết thiết kế:
- Thêm trường `@default(false) @map("is_hidden") Boolean` ở tất cả các bảng master dữ liệu.
- **Tại sao không dùng `deleted_at`?**
  - Trường `deleted_at` gây ra lỗi ràng buộc Unique Constraint phức tạp (ví dụ: người dùng xóa tài khoản `userA`, sau đó tạo lại `userA`, nếu dùng Unique `(username, deleted_at)` sẽ phức tạp và làm hỏng 3NF).
  - Dùng `is_hidden` boolean giúp truy vấn lọc dữ liệu hoạt động cực nhanh: `WHERE is_hidden = false`. Index trên trường boolean vô cùng nhẹ và tối ưu bộ nhớ.
- Khi người dùng bấm xóa: Đổi `is_hidden = true`, đồng thời cập nhật `status = 'DISABLED'` hoặc `'INACTIVE'`.

---

## QUY TẮC 5: PHÂN QUYỀN BẢO MẬT CẤP CSDL (POSTGRESQL DB ROLES)

### 🛡️ Nguyên tắc:
Không chỉ phân quyền ở cấp ứng dụng (Node.js Middleware), hệ thống bắt buộc áp dụng **Phân quyền truy cập bảng ngay tại động cơ PostgreSQL** (Table-Level Access Control via DB Roles).

### 📐 Danh sách 4 PostgreSQL DB Roles bắt buộc:

```sql
-- 1. DB Role cho Service Auth (Chỉ xác thực username/password)
CREATE ROLE app_auth_user WITH LOGIN PASSWORD 'AuthSecurePass2026!';
GRANT CONNECT ON DATABASE smart_logistics_db TO app_auth_user;
GRANT USAGE ON SCHEMA public TO app_auth_user;
GRANT SELECT, INSERT, UPDATE ON TABLE users TO app_auth_user;

-- 2. DB Role cho Portal Khách hàng (API Cổng Customer)
CREATE ROLE app_customer_user WITH LOGIN PASSWORD 'CustSecurePass2026!';
GRANT CONNECT ON DATABASE smart_logistics_db TO app_customer_user;
GRANT USAGE ON SCHEMA public TO app_customer_user;
GRANT SELECT, INSERT, UPDATE ON TABLE customers, customer_addresses, customer_contacts, orders TO app_customer_user;
REVOKE ALL ON TABLE staff, users, system_settings FROM app_customer_user;

-- 3. DB Role cho Operations / Staff / Shipper Portal API
CREATE ROLE app_staff_user WITH LOGIN PASSWORD 'StaffSecurePass2026!';
GRANT CONNECT ON DATABASE smart_logistics_db TO app_staff_user;
GRANT USAGE ON SCHEMA public TO app_staff_user;
GRANT SELECT, INSERT, UPDATE ON TABLE staff, customers, facilities, routes, route_stops, shipments, vehicles, orders, barcode_scans, delivery_proofs TO app_staff_user;
REVOKE ALL ON TABLE system_settings, roles, permissions, role_permissions FROM app_staff_user;

-- 4. DB Role cho Admin Portal (Toàn quyền quản trị)
CREATE ROLE app_admin_user WITH LOGIN PASSWORD 'AdminSecurePass2026!';
GRANT CONNECT ON DATABASE smart_logistics_db TO app_admin_user;
GRANT USAGE ON SCHEMA public TO app_admin_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_admin_user;
```

---

## QUY TẮC 6: CHUẨN ĐẶT TÊN (NAMING CONVENTIONS) & INDEXING

### 🏷️ 1. Quy tắc đặt tên:
- **Tên Bảng trong Database**: Số nhiều (`plural`), viết chữ thường, phân cách bằng gạch dưới (`snake_case`). Gán bắt buộc qua directive `@map("table_name")` trong Prisma (Ví dụ: `users`, `customers`, `staff`, `facilities`, `orders`, `delivery_proofs`).
- **Tên Cột trong Database**: Viết kiểu `snake_case` (gán qua `@map("column_name")`).
- **Tên Thuộc tính trong Code TS/Prisma Model**: Viết kiểu `camelCase`.
- **Khoá Chính (Primary Key)**: Đặt tên `id`, sử dụng kiểu dữ liệu UUID v4 String (`@id @default(uuid()) @db.Uuid`).
- **Khoá Ngoại (Foreign Key)**: Đặt tên dạng `entity_name_id` (Ví dụ: `user_id`, `assigned_facility_id`, `order_id`).

### ⚡ 2. Quy tắc Đánh Index (Indexing Guidelines):
- Đánh Index đơn (`@index([column_name])`) cho tất cả các khoá ngoại FK và các cột tham gia lọc dữ liệu tần suất cao.
- Đánh Index kết hợp (`@index([col1, col2])`) cho các truy vấn ghép cặp thường xuyên (ví dụ: `facility_id` + `status`, `assigned_to` + `status`).
- Tên Index chuẩn: `idx_tablename_columnname` (Ví dụ: `@index([assignedTo], name: "idx_disp_tasks_driver")`).

---

## QUY TẮC 7: BỘ QUY TẮC TỐI ƯU HÓA TRUY VẤN CSDL (QUERY OPTIMIZATION RULES)

### ⚡ 1. Giảm thiểu tối đa SQL JOIN không cần thiết (Denormalization cho Read-Heavy Data)
- **Đặt thông tin liên lạc tại Profile**: Lưu `full_name`, `phone`, `email` trực tiếp ở `customers` và `staff`. Tránh việc mỗi lần gửi email/SMS phải `JOIN` bảng `users`.
- **Snapshot thông tin lịch sử**: Bảng `orders` lưu snapshot trực tiếp `sender_name`, `sender_phone`, `receiver_name`, `receiver_phone`, `pickup_address_snapshot`. Khi xem danh sách đơn hàng hoặc xuất hóa đơn, truy vấn lấy thẳng từ bảng `orders` mà không cần `JOIN` ngược lại `customers` hay `customer_contacts`.

### 🎯 2. Chỉ chọn đúng các trường cần thiết (Field Projection vs `SELECT *`)
- Khi truy vấn qua Prisma, **LUÔN DÙNG `select`** để lấy đúng các cột cần dùng thay vì `include` toàn bộ object:
  ```ts
  // ✅ TỐI ƯU: Chỉ lấy các trường cần dùng
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, status: true }
  });

  // ❌ LỄNH LẠNG: Mang theo toàn bộ passwordHash và quan hệ không cần thiết
  const user = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  ```

### 🔍 3. Chiến lược Đánh Index Tối Ưu (Indexing & Composite Indexes)
- **Single Column Index**: Đánh `@index([fk_column])` cho 100% khoá ngoại (Foreign Keys).
- **Composite Index (Index kết hợp)**: Áp dụng cho các truy vấn ghép cặp mệnh đề `WHERE` + `ORDER BY` phổ biến:
  - `orders(facility_id, status)`: Phục vụ màn hình quản lý đơn theo bưu cục & trạng thái.
  - `staff(assigned_facility_id, position)`: Phục vụ lọc danh sách tài xế theo kho.
  - `driver_locations(driver_id, recorded_at DESC)`: Phục vụ lấy tọa độ GPS mới nhất của tài xế.
- **Partial/Filtered Index**: Sử dụng flag `is_hidden`:
  - Lọc `WHERE is_hidden = false` giúp tập chỉ mục B-Tree gọn nhẹ hơn 90% so với index full table.

### 🚫 4. Phòng Tránh Nỗi Đau N+1 Query
- Khi cần lấy danh sách kèm thông tin liên quan, dùng `include`/`select` của ORM hoặc dùng `Promise.all` batching thay vì đặt truy vấn DB bên trong vòng lặp `for`/`forEach`/`map`.
  ```ts
  // ❌ N+1 QUERY (Rất chậm khi có 1000 orders)
  for (const order of orders) {
    const customer = await prisma.customer.findUnique({ where: { id: order.customerId } });
  }

  // ✅ BATCH QUERY (Gom 1 truy vấn SQL duy nhất)
  const customerIds = orders.map(o => o.customerId);
  const customers = await prisma.customer.findMany({ where: { id: { in: customerIds } } });
  ```

### 📄 5. Phân Trang Tối Ưu Tốc Độ (Pagination Optimization)
- Với danh sách nhỏ (< 10,000 bản ghi): Dùng Offset-based Pagination (`skip`, `take`).
- Với các bảng Log siêu lớn (`driver_locations`, `barcode_scans`, `shipment_events` > 1 triệu dòng): **Bắt buộc dùng Cursor-based Pagination** (`WHERE id > last_seen_id LIMIT 20`) để tránh hiện tượng DB phải quét toàn bộ các trang trước đó.

### 🚀 6. Tận dụng Redis Caching cho Dữ liệu Tĩnh / Tần suất Đọc Cao
- Dữ liệu ít thay đổi: Danh mục administrative units (Tỉnh/Thành/Phường/Xã), `system_settings`, JWT Refresh Token được lưu trên **Redis Cache**.
- Vị trí Real-time GPS của tài xế: Cập nhật liên tục vào Redis Hash (`driver_location:{driverId}`), chỉ ghi xuống DB theo chu kỳ batching (ví dụ: 1 phút/lần).

---

## 8. HƯỚNG DẪN ÁP DỤNG CHO CÁC MODULE CÒN LẠI (MODULE 2 -> 9)

Khi tiến hành refactor các Module tiếp theo, hãy áp dụng trực tiếp danh sách kiểm tra (Checklist) sau:

### 📦 Module 2: Facilities & Warehouses (Quản lý Mạng lưới Kho bãi)
- [ ] Bảng `facilities`: Dùng `is_hidden` thay `deleted_at`.
- [ ] Quan hệ Quản lý Kho: Kho trỏ tới `manager_user_id` trong `users` hoặc `staff_id` trong `staff`.
- [ ] Quan hệ Nhân viên Kho: Bảng `staff` có `assigned_facility_id` trỏ về `facilities(id)`.

### 📦 Module 3: Orders & Packages (Quản lý Đơn hàng & Kiện hàng)
- [ ] Bảng `orders`: Trỏ `customer_id` trực tiếp về `customers(id)`. Lưu thông tin người gửi/người nhận (`sender_name`, `sender_phone`, `receiver_name`, `receiver_phone`) trực tiếp snapshot trong `orders` để bảo đảm tính lịch sử.
- [ ] Thay thế `deleted_at` bằng `is_hidden` trên `orders` và `packages`.

### 🚛 Module 4: Fleet & Vehicles (Quản lý Đội xe & Phương tiện)
- [ ] Bảng `driver_vehicle_assignments`: Trỏ `driver_id` về `staff(id)` (thay vì bảng `drivers` cũ).
- [ ] Bảng `driver_locations`: Trỏ `driver_id` về `staff(id)`.

### 🗺️ Module 5 & 6: Routing & Shipments (Tuyển đường AI & Chuyển tải)
- [ ] Bảng `dispatch_tasks`: Trỏ `assigned_to` về `staff(id)`.
- [ ] Bảng `routes`: Trỏ tới `driver_vehicle_assignment_id` kết nối tới `staff`.

### 📸 Module 7: Tracking & POD (Xác thực Bàn giao & Barcode)
- [ ] Bảng `driver_check_ins`: Trỏ `driver_id` về `staff(id)`.
- [ ] Bảng `barcode_scans`: Trỏ `scanned_by` về `user_id` hoặc `staff_id`.

### ⚙️ Module 8 & 9: Pricing, Billing & System Config
- [ ] Bảng `system_settings`: Phân quyền `REVOKE ALL` đối với `app_staff_user` và `app_customer_user`. Chỉ `app_admin_user` được phép sửa cấu hình AI/hệ thống.

---
*Tài liệu này được lưu trữ chính thức tại `Design DB/DATABASE_DESIGN_RULES.md` để toàn bộ đội ngũ phát triển tuân thủ trong suốt quá trình nâng cấp và mở rộng hệ thống SLP.*
