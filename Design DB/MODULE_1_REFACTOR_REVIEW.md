# BÁO CÁO REVIEW CHI TIẾT CÁC BẢNG ĐÃ THAY ĐỔI / REFACTOR (MODULE 1)
**Dự án**: Smart Logistics Platform (SLP)  
**Ngày thực hiện**: 28/07/2026  
**Phạm vi**: Refactor CSDL Module 1 (Auth, Roles, Profiles, PostgreSQL DB Roles)

---

## 📊 TỔNG QUAN CÁC BẢNG ĐÃ THAY ĐỔI & TẠO MỚI

Trong phiên refactor Module 1 vừa qua, hệ thống đã thực hiện điều chỉnh cấu trúc của **3 bảng chính**, hợp nhất **2 bảng cũ**, và điều chỉnh khóa ngoại FK ở **5 bảng liên quan**, cùng **4 PostgreSQL DB Roles**.

---

## 🔍 CHI TIẾT THAY ĐỔI CÁC BẢNG (BEFORE vs AFTER)

### 1. BẢNG `users` (`@map("users")`) — Bảng Tài Khoản Đăng Nhập

- **Mục đích refactor**: Tách biệt hoàn toàn thông tin bảo mật xác thực (Credentials) với thông tin cá nhân/liên lạc (PII). Khi hacker tấn công chiếm được bảng `users`, chúng chỉ có `username` và `password_hash` mà **không hề biết** tài khoản thuộc về ai hay thông tin liên hệ.
- **Biến động cấu trúc**:

| Trường | Trước Refactor | Sau Refactor | Ghi chú & Rationale |
| :--- | :---: | :---: | :--- |
| `id` | UUID | UUID | Khóa chính PK (Giữ nguyên) |
| `username` | VarChar(50) | VarChar(50) | Tên đăng nhập duy nhất (`UNIQUE`) |
| `password_hash` | Text | Text | Chuỗi mật khẩu băm Bcrypt |
| `status` | UserStatus ENUM | UserStatus ENUM | `ACTIVE`, `LOCKED`, `DISABLED`, `PENDING_VERIFICATION` |
| `role_id` | UUID (FK) | UUID (FK) | Trỏ tới `roles(id)` |
| `email` | VarChar(255) | ❌ **LOẠI BỎ** | Chuyển sang lưu tại bảng Profile (`customers`, `staff`) |
| `phone` | VarChar(20) | ❌ **LOẠI BỎ** | Chuyển sang lưu tại bảng Profile (`customers`, `staff`) |
| `full_name` | VarChar(150) | ❌ **LOẠI BỎ** | Chuyển sang lưu tại bảng Profile (`customers`, `staff`) |
| `avatar_url` | Text | ❌ **LOẠI BỎ** | Chuyển sang bộ lưu trữ Media/Profile |
| `deleted_at` | Timestamptz | ❌ **LOẠI BỎ** | Loại bỏ hoàn toàn `deleted_at` |
| `is_hidden` | ❌ Không có | ✅ **THÊM MỚI** | Boolean `@default(false)` thay thế `deleted_at` |
| `last_login_at` | Timestamptz | Timestamptz | Thời điểm đăng nhập gần nhất |
| `created_at` | Timestamptz | Timestamptz | Ngày tạo tài khoản |
| `updated_at` | Timestamptz | Timestamptz | Ngày cập nhật gần nhất |

---

### 2. BẢNG `customers` (`@map("customers")`) — Hồ Sơ Khách Hàng

- **Mục đích refactor**: Đưa các thông tin định danh & liên lạc PII (`full_name`, `phone`, `email`) trực tiếp vào bảng `customers`. Giúp tác vụ gửi SMS/Email/Noti đơn hàng chỉ cần đọc 1 bảng `customers` mà **không cần SQL JOIN** sang bảng `users`.
- **Biến động cấu trúc**:

| Trường | Trước Refactor | Sau Refactor | Ghi chú & Rationale |
| :--- | :---: | :---: | :--- |
| `id` | UUID | UUID | Khóa chính PK (Giữ nguyên) |
| `user_id` | UUID (FK 1-1) | UUID (FK 1-1) | Liên kết 1-1 với `users(id)` |
| `customer_code` | VarChar(30) | VarChar(30) | Mã khách hàng duy nhất (`CUST-000001`) |
| `full_name` | ❌ Không có | ✅ **THÊM MỚI** | VarChar(150) - Họ và tên khách hàng/đại diện |
| `phone` | ❌ Không có | ✅ **THÊM MỚI** | VarChar(20) - Số điện thoại liên lạc |
| `email` | ❌ Không có | ✅ **THÊM MỚI** | VarChar(255) Nullable - Email nhận thông báo/hóa đơn |
| `customer_type` | CustomerType | CustomerType | `INDIVIDUAL` (Gửi lẻ), `BUSINESS` (Doanh nghiệp/Shop) |
| `company_name` | VarChar(255) | VarChar(255) | Tên công ty (nếu là BIZ) |
| `tax_code` | VarChar(30) | VarChar(30) | Mã số thuế (nếu là BIZ) |
| `status` | CustomerStatus | CustomerStatus | `ACTIVE`, `INACTIVE`, `BLOCKED` |
| `deleted_at` | Timestamptz | ❌ **LOẠI BỎ** | Loại bỏ `deleted_at` |
| `is_hidden` | ❌ Không có | ✅ **THÊM MỚI** | Boolean `@default(false)` thay thế `deleted_at` |
| `created_at` | Timestamptz | Timestamptz | Ngày đăng ký |
| `updated_at` | Timestamptz | Timestamptz | Ngày cập nhật |

---

### 3. BẢNG `staff` (`@map("staff")`) — Hồ Sơ Hợp Nhất Nhân Viên & Tài Xế

- **Mục đích refactor**: Hợp nhất 2 bảng phân mảnh trước đây là **`staff_profiles`** và **`drivers`** thành **DUY NHẤT 1 BẢNG `staff`**.
  - Nhân viên bưu cục/kho: Điền `position` (`ADMIN`, `DISPATCHER`, `WAREHOUSE_STAFF`), các trường bằng lái xe mang giá trị `NULL`.
  - Tài xế giao hàng: Điền `position = 'DRIVER'`, điền thông tin bằng lái, hạng xe, loại tài xế.
- **Cấu trúc bảng `staff` hợp nhất**:

| Trường | Kiểu Dữ Liệu | Ràng Buộc | Ý Nghĩa & Rationale |
| :--- | :--- | :---: | :--- |
| `id` | UUID | PK | Khóa chính duy nhất của nhân sự |
| `user_id` | UUID | FK 1-1 Unique | Trỏ tới `users(id)` |
| `employee_code` | VarChar(30) | Unique | Mã nhân viên/tài xế (`STF-000001`, `DRV-000001`) |
| `full_name` | VarChar(150) | Not Null | Họ và tên nhân sự/tài xế |
| `phone` | VarChar(20) | Not Null | Số điện thoại làm việc |
| `email` | VarChar(255) | Nullable | Email nội bộ/liên hệ công việc |
| `citizen_id` | VarChar(20) | Unique Nullable | Số Căn cước công dân (CCCD) |
| `position` | VarChar(100) | Not Null | Chức vụ: `ADMIN`, `DISPATCHER`, `WAREHOUSE_STAFF`, `DRIVER` |
| `assigned_facility_id`| UUID | FK Nullable | Bưu cục/kho công tác (Trỏ `facilities.id`) |
| `driver_license_number`| VarChar(50)| Unique Nullable | Số bằng lái xe GPLX (Chỉ dùng cho Driver) |
| `driver_license_class`| VarChar(10) | Nullable | Hạng bằng lái: `A1`, `B2`, `C`, `FC` (Chỉ dùng cho Driver) |
| `driver_type` | DriverType ENUM | Nullable | Loại tài xế: `HUB_DELIVERY`, `ON_DEMAND` |
| `employment_status` | DriverEmploymentStatus| Nullable | Trạng thái: `ACTIVE`, `ON_LEAVE`, `TERMINATED` |
| `hire_date` | Date | Nullable | Ngày chính thức tuyển dụng |
| `created_at` | Timestamptz | Not Null | Mốc thời gian tạo |

---

### 4. BẢNG `customer_addresses` (`@map("customer_addresses")`) — Sổ Địa Chỉ & Tích Hợp Người Liên Hệ Kho

- **Mục đích refactor**: Tích hợp trực tiếp `contact_name` và `contact_phone` vào Sổ Địa Chỉ `customer_addresses` và **LOẠI BỎ BẢNG `customer_contacts`**. Giúp giảm 1 bảng CSDL, tiết kiệm dung lượng lưu trữ và tối ưu tốc độ truy vấn 1-query không cần SQL JOIN.
- **Các trường bổ sung**:
  - `contact_name` (VarChar 150 Nullable): Họ tên người liên hệ phụ trách kho (Ví dụ: "Chị Mai - Trưởng Kho Q7").
  - `contact_phone` (VarChar 20 Nullable): Số điện thoại liên hệ kho trực tiếp khi Shipper đến lấy hàng.

---

### 5. CÁC BẢNG LIÊN QUAN ĐƯỢC ĐIỀU CHỈNH KHÓA NGOẠI (FK UPDATES)

Do hợp nhất `drivers` và `staff_profiles` thành `staff`, 5 bảng liên quan trong CSDL đã được cập nhật lại quan hệ:

1. **`driver_vehicle_assignments`**: Đổi `driver_id` (trỏ `drivers`) $\rightarrow$ trỏ tới `staff(id)`.
2. **`driver_locations`**: Đổi `driver_id` (trỏ `drivers`) $\rightarrow$ trỏ tới `staff(id)`.
3. **`dispatch_tasks`**: Đổi `assigned_to` (trỏ `drivers`) $\rightarrow$ trỏ tới `staff(id)`.
4. **`driver_check_ins`**: Đổi `driver_id` (trỏ `drivers`) $\rightarrow$ trỏ tới `staff(id)`.
5. **`facilities`**: Hợp nhất 2 mảng quan hệ `drivers` và `staffProfiles` thành mảng `staffMembers Staff[]`.

---

### 5. THIẾT LẬP 4 POSTGRESQL DATABASE USER ROLES

#### 📂 File Script SQL Khởi Tạo:
Script SQL DDL chính thức đã khởi tạo và gán quyền được lưu tại:  
👉 `backend/prisma/migrations/0030_setup_db_roles_and_permissions.sql`

#### 🔍 Câu Lệnh SQL Tra Cứu Trực Tiếp Trong DBeaver / pgAdmin:
Các DB Roles này lưu trực tiếp tại động cơ CSDL PostgreSQL (`pg_roles`). Bạn có thể gõ câu SQL sau để kiểm tra:
```sql
SELECT rolname, rolcanlogin 
FROM pg_roles 
WHERE rolname LIKE 'app_%';
```

#### 🔑 Bảng Chi Tiết Tài Khoản, Mật Khẩu & Connection String:

| DB Role | Username | Password | Connection String (`DATABASE_URL`) | Quyền Hạn Chi Tiết & Giới Hạn Bằng REVOKE |
| :--- | :--- | :--- | :--- | :--- |
| **Auth Service** | `app_auth_user` | `AuthSecurePass2026!` | `postgresql://app_auth_user:AuthSecurePass2026!@localhost:5432/smart_logistics_db` | Chỉ `SELECT, INSERT, UPDATE` trên `users` |
| **Customer Portal** | `app_customer_user` | `CustSecurePass2026!` | `postgresql://app_customer_user:CustSecurePass2026!@localhost:5432/smart_logistics_db` | `SELECT, INSERT, UPDATE` trên `customers`, `customer_addresses`, `customer_contacts`, `orders`. (**`REVOKE ALL`** trên `staff`, `users`, `system_settings`) |
| **Staff / Operations** | `app_staff_user` | `StaffSecurePass2026!` | `postgresql://app_staff_user:StaffSecurePass2026!@localhost:5432/smart_logistics_db` | `SELECT, INSERT, UPDATE` trên `staff`, `customers`, `facilities`, `routes`, `shipments`, `vehicles`, `orders`, `barcode_scans`, `delivery_proofs`. (**`REVOKE ALL`** trên `system_settings`, `roles`, `permissions`) |
| **Admin Portal** | `app_admin_user` | `AdminSecurePass2026!` | `postgresql://app_admin_user:AdminSecurePass2026!@localhost:5432/smart_logistics_db` | **`ALL PRIVILEGES`** trên toàn bộ schema public |

---

## 🛠️ FILE REVIEW BẢNG THAY ĐỔI
Tài liệu này được lưu chính thức tại:  
👉 **[MODULE_1_REFACTOR_REVIEW.md](file:///d:/smart-logistics-platform/Design%20DB/MODULE_1_REFACTOR_REVIEW.md)**
