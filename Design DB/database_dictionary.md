# 📖 TỰ ĐIỂN CƠ SỞ DỮ LIỆU CHUẨN HÓA (DATABASE DICTIONARY) - SMART LOGISTICS PLATFORM

Tài liệu này tổng hợp toàn bộ **38 bảng cơ sở dữ liệu** được thiết kế theo chuẩn **Clean Architecture & Domain Driven Design**, đồng bộ 100% với mã nguồn **Prisma Schema (`schema.prisma`)**, phân chia theo 10 Phân hệ (Module) phục vụ hệ thống Smart Logistics Platform (SLP).

Trên mỗi bảng đều được bổ sung mục **📌 Chức năng của bảng** giải thích chi tiết mục đích nghiệp vụ và đóng vai trò gì trong hệ thống, cùng các ghi chú rõ ràng về **Khóa chính (PK)**, **Khóa ngoại (FK)**, **Cặp khóa chính phức hợp (Composite PK)**, **Khóa ngoại 1-1 (Unique FK)**, **Khóa duy nhất (Unique)** và **Ý nghĩa & Ví dụ thực tế chuẩn hóa** giúp bạn dễ dàng thuyết trình, bảo vệ đồ án trước Giảng viên và Hội đồng phản biện.

---

## 📌 CHÚ THÍCH CÁC KÝ HIỆU RÀNG BUỘC VÀ KHÓA (KEY NOTATION)

* **`Khóa chính (PK)`**: Primary Key - Khóa chính định danh duy nhất của bảng.
* **`Khóa ngoại (FK ➔ bảng X)`**: Foreign Key - Khóa ngoại tham chiếu đến bảng X.
* **`Khóa ngoại 1-1 (FK, Unique ➔ bảng X)`**: Foreign Key Unique - Khóa ngoại liên kết bắt buộc 1-1 với bảng X (Chuẩn Clean Architecture).
* **`Cặp khóa chính (Composite PK)`**: Khóa chính phức hợp kết hợp từ 2 cột trở lên (Ví dụ: Bảng trung gian N:N).
* **`Khóa duy nhất (Unique)`**: Ràng buộc không được trùng lặp dữ liệu trong hệ thống.
* **`Bắt buộc (Not Null)`**: Trường dữ liệu bắt buộc phải nhập.
* **`Tùy chọn (Nullable)`**: Trường dữ liệu có thể để trống.

---

## 🔐 MODULE 1: AUTHENTICATION & AUTHORIZATION (Xác thực & Phân quyền)

### 1. Bảng `users` (Danh tính đăng nhập Pure Credentials - Separation of PII)
📌 **Chức năng của bảng:** Lưu trữ danh tính xác thực thuần túy (`username`, `password_hash`) cho tất cả các tài khoản trong hệ thống. Theo chuẩn bảo mật PII Separation & 3NF, bảng này **KHÔNG LƯU TRỮ** thông tin định danh cá nhân/liên lạc (`email`, `phone`, `full_name`). Khi hacker chiếm được bảng `users`, chúng chỉ thu được password hash và username mà không thể biết thông tin liên lạc hay cá nhân của người dùng.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã định danh duy nhất của tài khoản. VD: `usr-01`, `usr-02` |
| `username` | VarChar(50) | Khóa duy nhất (Unique), Bắt buộc | Tên đăng nhập duy nhất. VD: `hung_admin`, `staff_kho_tbd`, `shipper_nam` |
| `password_hash`| Text | Bắt buộc | Chuỗi mật khẩu băm bảo mật Bcrypt. VD: `$2b$10$e8N0Y9z.K2qL.uX1vW9Z8e...` |
| `status` | Enum (`UserStatus`)| Bắt buộc (Default ACTIVE) | Trạng thái tài khoản: `ACTIVE` (Hoạt động), `LOCKED` (Khóa tạm thời), `DISABLED` (Vô hiệu hóa) |
| `role_id` | Uuid | **Khóa ngoại (FK ➔ bảng roles)** | Mã vai trò hệ thống gán cho người dùng (Trỏ `roles.id`, ON DELETE RESTRICT). VD: `rol-01` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian tạo tài khoản. VD: `2026-07-01 10:00:00+07` |

---

### 2. Bảng `roles` (Vai trò người dùng - RBAC)
📌 **Chức năng của bảng:** Định nghĩa danh mục các vai trò người dùng trong hệ thống theo mô hình phân quyền RBAC (`ADMIN` - Quản trị, `STAFF` - Nhân viên bưu cục/điều vận, `CUSTOMER` - Khách hàng, `SHIPPER` - Tài xế). Mỗi tài khoản `User` được gán chính xác một `role_id`.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã định danh vai trò. VD: `rol-01`, `rol-02` |
| `role_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã vai trò cố định hệ thống: `ADMIN` (Quản trị), `STAFF` (Nhân viên), `CUSTOMER` (Khách hàng), `SHIPPER` (Tài xế) |
| `role_name` | VarChar(100) | Bắt buộc | Tên hiển thị chi tiết vai trò. VD: `Quản trị viên hệ thống`, `Nhân viên điều vận bưu cục` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Thời điểm tạo vai trò. VD: `2026-07-01 10:00:00+07` |

---

### 3. Bảng `permissions` (Danh mục Quyền hạn chi tiết)
📌 **Chức năng của bảng:** Lưu trữ danh mục tất cả các quyền hạn thao tác chức năng chi tiết trong hệ thống (như quyền tạo đơn `ORDER_CREATE`, quyền duyệt vận đơn `SHIPMENT_APPROVE`, quyền kích hoạt AI routing `AI_ROUTE_OPTIMIZE`...).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã định danh quyền hạn. VD: `per-01`, `per-02` |
| `permission_code`| VarChar(50)| Khóa duy nhất (Unique), Bắt buộc | Mã quyền thao tác hệ thống. VD: `ORDER_CREATE`, `SHIPMENT_APPROVE`, `AI_ROUTE_OPTIMIZE` |
| `permission_name`| VarChar(100)| Bắt buộc | Tên quyền chi tiết. VD: `Kích hoạt thuật toán AI tối ưu tuyến đường` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Thời điểm tạo quyền hạn |

---

### 4. Bảng `role_permissions` (Gán Quyền cho Vai trò - Bảng trung gian N:N)
📌 **Chức năng của bảng:** Bảng trung gian thể hiện mối quan hệ N:N giữa bảng `roles` và `permissions`. Bảng này thiết lập tập hợp các quyền thao tác cụ thể mà một vai trò được phép thực hiện trong hệ thống.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `role_id` | Uuid | **Cặp khóa chính (Composite PK [role_id, permission_id])**, **FK ➔ bảng roles** | Mã vai trò được gán quyền (ON DELETE CASCADE). VD: `rol-01` |
| `permission_id` | Uuid | **Cặp khóa chính (Composite PK [role_id, permission_id])**, **FK ➔ bảng permissions** | Mã quyền hạn được gán cho vai trò (ON DELETE CASCADE). VD: `per-01` |

---

## 🏬 MODULE 2: CUSTOMERS & ADDRESSES (Khách hàng & Địa chỉ)

### 5. Bảng `customers` (Hồ sơ Khách hàng - Clean Architecture PII Profile)
📌 **Chức năng của bảng:** Lưu trữ thông tin hồ sơ cá nhân/doanh nghiệp của Khách hàng. Bảng lưu trữ trực tiếp `full_name`, `phone`, `email` giúp các tác vụ gửi thông báo/mail diễn ra cực nhanh mà không cần JOIN bảng `users`. Liên kết 1-1 với `users` qua `user_id UNIQUE`.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã hồ sơ khách hàng. VD: `cust-01`, `cust-02` |
| `user_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng users)** | Khóa ngoại 1-1 trỏ bảng `users` (Tài khoản đăng nhập, ON DELETE CASCADE). VD: `usr-04` |
| `customer_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã quản lý khách hàng. VD: `CUST-000001`, `KH-BIZ-0012` |
| `full_name` | VarChar(150) | Bắt buộc | Họ và tên khách hàng/đại diện. VD: `Nguyễn Văn A` |
| `phone` | VarChar(20) | Tùy chọn | Số điện thoại liên lạc chính. VD: `0900000004` |
| `email` | VarChar(255) | Tùy chọn (Index `idx_customer_email`)| Địa chỉ email nhận thông báo/hóa đơn. VD: `customer@velocity.vn` |
| `customer_type` | Enum (`CustomerType`)| Bắt buộc | Loại khách hàng: `INDIVIDUAL` (Cá nhân gửi lẻ), `BUSINESS` (Doanh nghiệp/Shop) |
| `company_name` | VarChar(255) | Tùy chọn | Tên công ty/Thương hiệu shop (nếu BIZ). VD: `Công ty TNHH Vinamilk` |
| `tax_code` | VarChar(30) | Tùy chọn | Mã số thuế doanh nghiệp. VD: `0300588569` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Ngày khách hàng đăng ký hệ thống |

---

### 6. Bảng `addresses` (Kho dữ liệu Địa chỉ Chuyển phát & Map API)
📌 **Chức năng của bảng:** Lưu trữ tập trung kho dữ liệu địa chỉ lấy hàng, địa chỉ giao hàng và địa chỉ kho bãi bưu cục. Bảng này lưu chi tiết số nhà/tên đường, phường xã (`ward_code`), quốc gia, tọa độ vĩ độ/kinh độ GPS (`latitude`, `longitude`) và `place_id` từ API Bản đồ (Goong Maps / Google Maps) phục vụ tính toán khoảng cách và hiển thị trên bản đồ.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã địa chỉ duy nhất. VD: `addr-01`, `addr-02` |
| `address_line_1`| VarChar(255)| Bắt buộc | Số nhà, tên đường chi tiết. VD: `Số 268 Lý Thường Kiệt` |
| `ward_code` | VarChar(20) | **Khóa ngoại (FK ➔ bảng wards)** | Mã định danh Phường/Xã (Trỏ bảng `wards.code`, ON DELETE RESTRICT, ON UPDATE CASCADE). VD: `26830` |
| `country` | VarChar(100) | Default 'Vietnam' | Quốc gia. VD: `Vietnam` |
| `place_id` | VarChar(255)| Tùy chọn | Mã định vị địa điểm từ Goong Map / Google Maps API. VD: `ChIJaX7y8Z4vdTER...` |
| `latitude` | Double | Bắt buộc (Index `idx_addresses_coords`)| Vĩ độ định vị GPS. VD: `10.7721` |
| `longitude` | Double | Bắt buộc (Index `idx_addresses_coords`)| Kinh độ định vị GPS. VD: `106.6578` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 7. Bảng `customer_addresses` (Sổ địa chỉ Khách hàng & Người liên hệ kho)
📌 **Chức năng của bảng:** Bảng sổ địa chỉ lưu danh mục các địa chỉ thường dùng của từng khách hàng (Nhà riêng, văn phòng, kho bãi). Nhằm tối ưu dung lượng CSDL & tốc độ truy vấn 1-query không cần SQL JOIN, bảng **tích hợp luôn thông tin người đại diện liên hệ tại kho** (`contact_name`, `contact_phone`) như Trưởng kho, Kế toán kho.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi sổ địa chỉ. VD: `cadr-01` |
| `customer_id` | Uuid | **Cặp khóa duy nhất [customer_id, address_id]**, **FK ➔ bảng customers** | Mã khách hàng sở hữu địa chỉ (ON DELETE CASCADE, Index `idx_cust_addr_customer`). VD: `cust-01` |
| `address_id` | Uuid | **Cặp khóa duy nhất [customer_id, address_id]**, **FK ➔ bảng addresses** | Mã địa chỉ được liên kết (ON DELETE RESTRICT). VD: `addr-01` |
| `address_type` | Enum (`CustomerAddressType`)| Bắt buộc | Loại địa chỉ: `HOME` (Nhà riêng), `OFFICE` (Văn phòng), `WAREHOUSE` (Kho hàng), `RETURN` (Trả hàng) |
| `is_default` | Boolean | Default False | Đánh dấu địa chỉ lấy/giao mặc định của khách hàng |
| `contact_name` | VarChar(150) | Tùy chọn | Họ tên người phụ trách liên hệ tại kho. VD: `Chị Mai - Trưởng Kho Q7` |
| `contact_phone`| VarChar(20) | Tùy chọn | Số điện thoại liên hệ kho trực tiếp khi Shipper đến lấy. VD: `0912345678` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Thời điểm tạo bản ghi sổ địa chỉ |

---

## 🏭 MODULE 3: FACILITY NETWORK (Mạng lưới Bưu cục & Kho bãi)

### 8. Bảng `facility_types` (Loại hình Kho bãi)
📌 **Chức năng của bảng:** Định nghĩa các loại hình cơ sở kho bãi trong mạng lưới logistics của công ty (như Trung tâm chia chọn tổng `SORTING_CENTER`, Bưu cục phát chặng cuối `LAST_MILE_HUB`, `REGIONAL_HUB`...).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã loại kho bãi. VD: `ftype-01` |
| `type_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã phân loại: `SORTING_CENTER` (Trung tâm chia chọn), `LAST_MILE_HUB` (Bưu cục phát chặng cuối) |
| `type_name` | VarChar(100) | Bắt buộc | Tên hiển thị loại kho. VD: `Bưu cục Giao nhận Chặng cuối (Last-mile Hub)` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 9. Bảng `facilities` (Mạng lưới Bưu cục / Hub logistics)
📌 **Chức năng của bảng:** Lưu trữ danh sách toàn bộ các bưu cục, trung tâm khai thác kho bãi trong hệ thống. Quản lý mã bưu cục, bưu cục cấp trên (cây phân cấp Hub mẹ - Hub con), Nhân viên quản lý bưu cục, Tỉnh thành trực thuộc (`province_code`), địa chỉ chi tiết (`address_id`), và trạng thái hoạt động.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã định danh bưu cục. VD: `fac-01`, `fac-02` |
| `facility_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã bưu cục/kho. VD: `HUB-Q10-HCM`, `HUB-CWD-HN` |
| `facility_name` | VarChar(255) | Bắt buộc | Tên đầy đủ của bưu cục. VD: `Bưu cục Giao nhận Quận 10 - TP.HCM` |
| `facility_type_id`| Uuid | **Khóa ngoại (FK ➔ bảng facility_types)** | Mã loại hình kho bãi (Trỏ `facility_types.id`, ON DELETE RESTRICT). VD: `ftype-02` |
| `parent_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Mã bưu cục cấp trên trong cây phân cấp mạng lưới (ON DELETE SET NULL, Index `idx_facilities_parent`). VD: `fac-05` |
| `manager_user_id`| Uuid | **Khóa ngoại (FK ➔ bảng users)** | Quản lý bưu cục (Trỏ User có Role Staff/Admin, ON DELETE SET NULL). VD: `usr-02` |
| `province_code` | VarChar(20) | **Khóa ngoại (FK ➔ bảng provinces)** | Tỉnh/Thành phố trực thuộc (Trỏ `provinces.code`, ON DELETE SET NULL, Index `idx_facilities_province`). VD: `79` |
| `address_id` | Uuid | **Khóa ngoại (FK ➔ bảng addresses)** | Mã địa chỉ của bưu cục/kho bãi (Trỏ `addresses.id`, ON DELETE SET NULL). VD: `addr-05` |
| `operating_status`| Enum (`FacilityStatus`)| Bắt buộc (Index `idx_facilities_status`)| Trạng thái: `ACTIVE` (Đang mở cửa), `INACTIVE`, `MAINTENANCE` (Bảo trì), `CLOSED` |
| `region_sequence` | Integer | Tùy chọn | Thứ tự phân vùng định tuyến |
| `opened_at` | Date | Bắt buộc | Ngày chính thức mở cửa hoạt động bưu cục. VD: `2025-01-01` |
| `closed_at` | Date | Tùy chọn | Ngày đóng cửa bưu cục (nếu status = CLOSED). VD: `2026-07-29` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 10. Bảng `facility_zones` (Phân khu Hàng hóa tại Bưu cục)
📌 **Chức năng của bảng:** Quản lý cấu trúc các phân khu nghiệp vụ bên trong bưu cục (Khu vực Nhập kho `RECEIVING`, Khu vực Phân loại chia chọn `SORTING`, Khu vực Chờ xuất giao `SHIPPING`, Khu vực Lưu kho `STORAGE`, Khu vực Hàng hoàn `RETURN`, Khu cách ly `QUARANTINE`). Giúp Staff theo dõi chính xác vị trí hàng hóa đang nằm ở đâu trong kho.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã phân khu kho. VD: `fzone-01` |
| `facility_id` | Uuid | **Cặp khóa duy nhất [facility_id, zone_code]**, **FK ➔ bảng facilities** | Thuộc bưu cục nào (Trỏ `facilities.id`, ON DELETE CASCADE, Index `idx_facility_zones_fac`). VD: `fac-01` |
| `zone_code` | VarChar(30) | **Cặp khóa duy nhất [facility_id, zone_code]**, Bắt buộc | Mã phân khu kho. VD: `ZONE-REC-01`, `ZONE-SORT-A`, `ZONE-SHIP-SOUTH` |
| `zone_name` | VarChar(100) | Bắt buộc | Tên phân khu kho. VD: `Khu vực Nhập kho`, `Khu phân loại tự động`, `Khu chờ xuất giao` |
| `zone_type` | Enum (`FacilityZoneType`)| Bắt buộc | Phân loại khu vực: `RECEIVING`, `SORTING`, `SHIPPING`, `STORAGE`, `RETURN`, `QUARANTINE` |
| `capacity` | Int | Tùy chọn | Sức chứa tối đa của phân khu (đơn vị: Số kiện hàng). VD: `5000` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

## 📦 MODULE 4: ORDERS & SERVICES (Đơn hàng & Gói dịch vụ)

### 11. Bảng `services` (Bảng giá & Dịch vụ Vận chuyển)
📌 **Chức năng của bảng:** Cấu hình danh mục các gói dịch vụ vận chuyển của công ty (Giao hỏa tốc `EXPRESS`, Tiêu chuẩn `STANDARD`, Tiết kiệm `SAVING`). Quản lý cước phí nền cơ bản, mốc khoảng cách/khối lượng miễn phí và đơn giá tính thêm theo Km/Kg.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã dịch vụ. VD: `srv-01`, `srv-02` |
| `service_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã dịch vụ: `EXPRESS` (Hỏa tốc 2H), `STANDARD` (Tiêu chuẩn 24H), `SAVING` (Tiết kiệm) |
| `service_name` | VarChar(100) | Bắt buộc | Tên dịch vụ cước. VD: `Giao hàng Hỏa tốc 2H` |
| `base_price` | Decimal(12,2)| Default 0 | Cước phí nền cơ bản. VD: `15000.00` VNĐ, `25000.00` VNĐ |
| `free_distance_km`| Float | Default 2.0 | Khoảng cách miễn phí tối thiểu (Km). VD: `2.0` Km |
| `price_per_km` | Decimal(12,2)| Default 0 | Cước phụ trội tính thêm theo Km. VD: `5000.00` VNĐ/Km |
| `free_weight_kg` | Float | Default 1.0 | Khối lượng miễn phí tối thiểu (Kg). VD: `1.0` Kg |
| `price_per_kg` | Decimal(12,2)| Default 0 | Cước phụ trội tính thêm theo Kg. VD: `2500.00` VNĐ/Kg |
| `estimated_delivery_hours` | Integer | Bắt buộc (Default 24) | Thời gian giao hàng tiêu chuẩn dự kiến (giờ) |
| `is_active` | Boolean | Bắt buộc (Default True) | Trạng thái kích hoạt (`true`/`false`) |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 12. Bảng `orders` (Quản lý Đơn hàng - Order Snapshot)
📌 **Chức năng của bảng:** Bảng trung tâm quản lý Đơn hàng do khách tạo. Lưu đóng băng (Snapshot) địa chỉ lấy/giao, tọa độ GPS, thông tin người gửi/nhận, lịch hẹn lấy hàng tận nhà (`scheduled_pickup_at`), hình thức gửi hàng (`pickup_type`), gói dịch vụ đã chọn và các khoản chi phí dự tính (`estimated_shipping_fee`, `estimated_cod_amount`).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã đơn hàng duy nhất. VD: `ord-01`, `ord-02` |
| `customer_id` | Uuid | **Khóa ngoại (FK ➔ bảng customers)** | Khách hàng người tạo đơn (Trỏ `customers.id`, ON DELETE RESTRICT, Index `idx_orders_customer`). VD: `cust-01` |
| `order_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã tra cứu đơn hàng công khai. VD: `ORD-20260724-8891` |
| `status` | Enum (`OrderStatus`)| Bắt buộc (Index `idx_orders_status`)| Trạng thái đơn hàng: `CREATED`, `READY_FOR_PICKUP`, `PICKUP_ASSIGNED`, `PICKING`, `PICK_FAILED`, `PICKED_UP`, `ARRIVED_ORIGIN_FACILITY`, `READY_FOR_DISPATCH`, `IN_TRANSIT`, `AT_HUB`, `OUT_FOR_DELIVERY`, `DELIVERED`, `DELIVERY_FAILED`, `RETURNING`, `RETURNED`, `COMPLETED`, `CANCELLED` |
| `service_id` | Uuid | **Khóa ngoại (FK ➔ bảng services)** | Dịch vụ vận chuyển đã chọn (Trỏ `services.id`, ON DELETE RESTRICT). VD: `srv-01` |
| `scheduled_pickup_at`| Timestamptz| Tùy chọn | Lịch hẹn khách đặt Shipper đến lấy hàng. VD: `2026-07-24 14:00:00+07` |
| `pickup_address_id`| Uuid | **Khóa ngoại (FK ➔ bảng addresses)** | Mã địa chỉ lấy hàng gốc (ON DELETE SET NULL) |
| `pickup_address_text`| Text | Bắt buộc | Địa chỉ lấy hàng chi tiết đóng băng snapshot. VD: `268 Lý Thường Kiệt, P.14, Q.10` |
| `pickup_latitude` | Double | Bắt buộc | Vĩ độ tọa độ lấy hàng. VD: `10.7721` |
| `pickup_longitude`| Double | Bắt buộc | Kinh độ tọa độ lấy hàng. VD: `106.6578` |
| `delivery_address_id`| Uuid | **Khóa ngoại (FK ➔ bảng addresses)** | Mã địa chỉ giao hàng gốc (ON DELETE SET NULL) |
| `receiver_name` | VarChar(150) | Bắt buộc | Họ tên người nhận đóng băng snapshot. VD: `Trần Thị B` |
| `receiver_phone` | VarChar(20) | Bắt buộc | Số điện thoại người nhận snapshot. VD: `0918888999` |
| `delivery_address_text`| Text | Bắt buộc | Địa chỉ giao hàng chi tiết đóng băng snapshot. VD: `123 Nguyễn Huệ, P.Bến Nghé, Q.1` |
| `delivery_latitude`| Double | Bắt buộc | Vĩ độ tọa độ giao hàng. VD: `10.7740` |
| `delivery_longitude`| Double | Bắt buộc | Kinh độ tọa độ giao hàng. VD: `106.7030` |
| `estimated_shipping_fee`| Decimal(12,2)| Default 0 | Cước phí vận chuyển tạm tính. VD: `25000.00` VNĐ |
| `estimated_insurance_fee`| Decimal(12,2)| Default 0 | Phí bảo hiểm hàng hóa tạm tính (VNĐ) |
| `estimated_cod_amount` | Decimal(12,2)| Default 0 | Tiền thu hộ COD dự kiến. VD: `500000.00` VNĐ |
| `estimated_distance` | Decimal(10,2) | Tùy chọn | Khoảng cách dự tính (km) |
| `estimated_duration` | Integer | Tùy chọn | Thời gian di chuyển dự tính (phút) |
| `estimated_delivery_date`| Timestamptz| Tùy chọn | Ngày & giờ dự kiến giao hàng thành công. VD: `2026-07-28 17:00:00+07` |
| `pickup_type` | Enum (`PickupType`)| Bắt buộc (Default PICKUP) | Hình thức gửi: `PICKUP` (Shipper đến lấy tận nơi), `DROP_OFF` (Khách tự mang ra bưu cục gửi) |
| `origin_facility_id`| Uuid| **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục nhận hàng đầu tiên (ON DELETE SET NULL). VD: `fac-01` |
| `destination_facility_id`| Uuid| **Khóa ngoại (FK ➔ bảng facilities)**| Bưu cục phát hàng cuối cùng (ON DELETE SET NULL). VD: `fac-01` |
| `created_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người khởi tạo đơn hàng (ON DELETE SET NULL). VD: `usr-01` |
| `updated_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người cập nhật đơn gần nhất (ON DELETE SET NULL) |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Thời điểm tạo đơn hàng |
| `updated_at` | Timestamptz | UpdatedAt | Mốc thời gian cập nhật trạng thái/thông tin đơn hàng gần nhất |

---

### 13. Bảng `packages` (Chi tiết Kiện hàng vật lý & Vị trí Phân khu Kho)
📌 **Chức năng của bảng:** Quản lý chi tiết từng kiện hàng vật lý nằm trong đơn hàng (mã barcode kiện hàng, khối lượng, thể tích, kích thước Dài x Rộng x Cao cm, yêu cầu bảo quản nhiệt độ, hàng dễ vỡ, mô tả tên hàng, giá trị khai giá để tính Phí bảo hiểm). Đồng thời lưu vết **Bưu cục hiện tại (`current_facility_id`)** và **Phân khu kho hiện tại (`current_zone_id`)** mà kiện hàng đang được lưu giữ.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã kiện hàng. VD: `pkg-01`, `pkg-02` |
| `order_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng orders)** | Thuộc Đơn hàng nào (Trỏ `orders.id`, ON DELETE CASCADE, Index `idx_packages_order`). VD: `ord-01` |
| `package_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã vạch/Barcode kiện hàng in tem. VD: `PKG-8891-01` |
| `description` | Text | Tùy chọn | Mô tả tên mặt hàng bên trong. VD: `Hộp quà thời trang cao cấp` |
| `declared_value` | Decimal(12,2)| Tùy chọn | Giá trị khai giá hàng hóa (Căn cứ tính Phí bảo hiểm). VD: `2000000.00` VNĐ |
| `weight` | Decimal(8,2) | Bắt buộc | Khối lượng kiện hàng thực tế (Kg). VD: `1.25` Kg |
| `length` | Decimal(6,2) | Bắt buộc | Chiều dài kiện hàng (cm). VD: `20.00` cm |
| `width` | Decimal(6,2) | Bắt buộc | Chiều rộng kiện hàng (cm). VD: `15.00` cm |
| `height` | Decimal(6,2) | Bắt buộc | Chiều cao kiện hàng (cm). VD: `10.00` cm |
| `volume` | Decimal(10,4)| Bắt buộc | Thể tích quy đổi ($m^3$). VD: `0.0030` $m^3$ |
| `is_fragile` | Boolean | Default False | Cảnh báo hàng dễ vỡ (`true` / `false`) |
| `temperature_requirement`| VarChar(50)| Tùy chọn | Yêu cầu nhiệt độ bảo quản. VD: `2-8 °C`, `Đông lạnh (-18°C)` |
| `required_vehicle_type_id`| Uuid| **Khóa ngoại (FK ➔ bảng vehicle_types)**| Yêu cầu loại xe chở kiện hàng (ON DELETE SET NULL) |
| `current_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Vị trí Bưu cục hiện tại kiện hàng đang nằm (ON DELETE SET NULL, Index `idx_packages_location`). VD: `fac-01` |
| `current_zone_id` | Uuid | **Khóa ngoại (FK ➔ bảng facility_zones)**| Vị trí Phân khu kho hiện tại (ON DELETE SET NULL, Index `idx_packages_location`). VD: `fzone-01` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |
| `updated_at` | Timestamptz | UpdatedAt | Mốc thời gian cập nhật thông tin gần nhất |

---

### 14. Bảng `order_payments` (Thanh toán Thực tế & COD)
📌 **Chức năng của bảng:** Quản lý tài chính thanh toán chính thức của đơn hàng. Lưu cước vận chuyển chốt cuối cùng, phí bảo hiểm chốt cuối cùng, số tiền thu hộ COD chốt cuối cùng, người chịu phí (`SENDER` / `RECEIVER`), hình thức thanh toán (`CASH`, `BANK_TRANSFER`, `E_WALLET`, `COD`) và trạng thái thanh toán.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã giao dịch thanh toán. VD: `op-01` |
| `order_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng orders)** | Gắn duy nhất 1-1 với đơn hàng (Trỏ `orders.id`, ON DELETE CASCADE). VD: `ord-01` |
| `final_shipping_fee`| Decimal(12,2)| Bắt buộc | Cước vận chuyển cuối cùng thực tế. VD: `25000.00` VNĐ |
| `final_insurance_fee`| Decimal(12,2)| Bắt buộc | Phí bảo hiểm chính thức (VNĐ) |
| `final_cod_amount` | Decimal(12,2)| Bắt buộc | Số tiền thu hộ COD chốt thực tế. VD: `500000.00` VNĐ |
| `fee_payer` | Enum (`FeePayer`)| Bắt buộc | Người trả cước: `SENDER` (Người gửi trả), `RECEIVER` (Người nhận trả) |
| `payment_method` | Enum (`PaymentMethod`)| Bắt buộc | Hình thức: `CASH` (Tiền mặt), `BANK_TRANSFER`, `E_WALLET`, `COD` |
| `payment_status` | Enum (`PaymentStatus`)| Default UNPAID | Trạng thái: `UNPAID` (Chưa thanh toán), `PAID` (Đã thanh toán), `REFUNDED` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |
| `updated_at` | Timestamptz | UpdatedAt | Mốc thời gian cập nhật thông tin gần nhất |

---

### 15. Bảng `order_status_history` (Nhật ký Lịch sử Thay đổi Trạng thái Đơn hàng)
📌 **Chức năng của bảng:** Ghi vết (Audit trail) toàn bộ lịch sử biến động trạng thái của đơn hàng từ khi tạo mới đến khi giao thành công hoặc hủy đơn. Ghi rõ thời điểm chuyển trạng thái và người thực hiện chuyển (`changed_by_user_id`).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi lịch sử. VD: `osh-01` |
| `order_id` | Uuid | **Khóa ngoại (FK ➔ bảng orders)** | Thuộc đơn hàng nào (Trỏ `orders.id`, ON DELETE CASCADE, Index `idx_order_hist_order`). VD: `ord-01` |
| `status` | Enum (`OrderStatus`)| Bắt buộc | Trạng thái chuyển đến. VD: `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY` |
| `changed_by_user_id`| Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người thực hiện chuyển trạng thái (User ID, ON DELETE SET NULL). VD: `usr-01` |
| `reason` | Text | Tùy chọn | Lý do chuyển trạng thái. VD: `Khách hàng khởi tạo đơn hàng mới` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

## 🚚 MODULE 5: SHIPMENT MANAGEMENT (Quản lý Vận đơn & Trung chuyển)

### 16. Bảng `shipments` (Vận đơn / Chuyến gom hàng)
📌 **Chức năng của bảng:** Quản lý các Vận đơn (Shipment) đại diện cho các chuyến gom hàng di chuyển giữa các bưu cục (chặng trung chuyển) hoặc chuyến hàng do Shipper đi giao (chặng cuối). Lưu bưu cục xuất phát (`origin_facility_id`), bưu cục đích (`destination_facility_id`) và mã lộ trình AI gắn kèm.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã vận đơn duy nhất. VD: `spm-01`, `spm-02` |
| `shipment_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã tracking vận đơn công khai. VD: `SPM-20260724-9901` |
| `status` | Enum (`ShipmentStatus`)| Bắt buộc (Index `idx_shipments_status`)| Trạng thái: `CREATED`, `ASSIGNED`, `IN_TRANSIT`, `AT_HUB`, `OUT_FOR_DELIVERY`, `DELIVERED`, `DELIVERY_FAILED`, `RETURNING`, `RETURNED`, `CANCELLED` |
| `route_id` | Uuid | **Khóa ngoại (FK ➔ bảng routes)** | Thuộc Lộ trình giao hàng nào (Trỏ `routes.id`, ON DELETE SET NULL). VD: `rt-01` |
| `origin_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Kho/Bưu cục xuất phát của vận đơn (ON DELETE SET NULL). VD: `fac-01` |
| `destination_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Kho/Bưu cục đích đến của vận đơn (ON DELETE SET NULL). VD: `fac-01` |
| `created_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Nhân viên khởi tạo vận đơn (ON DELETE SET NULL). VD: `usr-02` |
| `updated_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người cập nhật vận đơn gần nhất (ON DELETE SET NULL) |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Thời điểm tạo phiếu vận chuyển |
| `updated_at` | Timestamptz | UpdatedAt | Mốc thời gian cập nhật trạng thái phiếu gần nhất |

---

### 17. Bảng `shipment_packages` (Gom Kiện hàng vào Vận đơn - Bảng trung gian 1:1 Strict Package)
📌 **Chức năng của bảng:** Bảng trung gian gom các kiện hàng vật lý vào vận đơn chuyến xe. Ràng buộc duy nhất `package_id UNIQUE` đảm bảo tính toàn vẹn nghiệp vụ: một kiện hàng chỉ nằm trên duy nhất 1 vận đơn chuyến xe active tại một thời điểm.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi gom hàng. VD: `spkg-01` |
| `shipment_id` | Uuid | **Cặp khóa duy nhất [shipment_id, package_id]**, **FK ➔ bảng shipments** | Mã Vận đơn gom hàng (Trỏ `shipments.id`, ON DELETE CASCADE). VD: `spm-01` |
| `package_id` | Uuid | **Khóa ngoại duy nhất (FK, Unique ➔ bảng packages)** | Kiện hàng duy nhất (Trỏ `packages.id`, ON DELETE RESTRICT). VD: `pkg-01` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 18. Bảng `shipment_transfers` (Luân chuyển Hàng giữa các Bưu cục)
📌 **Chức năng của bảng:** Quản lý quy trình giao nhận luân chuyển vận đơn giữa bưu cục gửi (`from_facility_id`) và bưu cục nhận (`to_facility_id`). Theo dõi thời điểm xuất xe (`dispatched_at`), thời điểm xe cập bến kho (`arrived_at`) và nhân viên kho bấm Xác nhận nhập kho (`received_by`).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã giao dịch chuyển giao hàng. VD: `st-01` |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Vận đơn luân chuyển (Trỏ `shipments.id`, ON DELETE CASCADE, Index `idx_shp_trans_ship`). VD: `spm-01` |
| `from_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục gửi hàng đi (ON DELETE RESTRICT). VD: `fac-01` |
| `to_facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục tiếp nhận hàng (ON DELETE RESTRICT). VD: `fac-03` |
| `status` | Enum (`TransferStatus`)| Bắt buộc | Trạng thái luân chuyển: `PENDING`, `IN_TRANSIT`, `ARRIVED` (Đã nhận kho), `REJECTED` |
| `dispatched_at` | Timestamptz | Tùy chọn | Thời điểm xe xuất phát rời bưu cục gửi. VD: `2026-07-24 09:35:00+07` |
| `arrived_at` | Timestamptz | Tùy chọn | Thời điểm xe cập bến bưu cục nhận. VD: `2026-07-24 11:20:00+07` |
| `received_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Nhân viên nhận bàn giao hàng tại kho đích (ON DELETE SET NULL). VD: `usr-02` |

---

## 🏎️ MODULE 6: FLEET & DRIVER MANAGEMENT (Đội xe & Nhân sự Vận hành)

### 19. Bảng `staff` (Hồ sơ Hợp nhất Nhân viên & Tài xế - Clean Architecture PII Profile)
📌 **Chức năng của bảng:** Bảng hợp nhất lưu trữ toàn bộ hồ sơ nhân sự vận hành trong công ty (Quản trị viên, Nhân viên điều phối, Thủ kho, Tài xế giao hàng). Bảng lưu trữ trực tiếp thông tin PII liên lạc (`full_name`, `phone`, `email`, `citizen_id`) và bưu cục công tác (`assigned_facility_id`). Đối với tài xế giao hàng (`position == 'DRIVER'`), bảng bổ sung các trường thông tin bằng lái, hạng xe và trạng thái làm việc. Liên kết 1-1 với tài khoản `users` qua `user_id UNIQUE`.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã hồ sơ nhân sự duy nhất. VD: `stf-01`, `stf-02` |
| `user_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng users)** | Khóa ngoại 1-1 trỏ bảng `users` (ON DELETE CASCADE). VD: `usr-02`, `usr-03` |
| `employee_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã nhân viên/tài xế duy nhất. VD: `STF-000001`, `DRV-000001` |
| `full_name` | VarChar(150) | Bắt buộc | Họ và tên nhân sự/tài xế. VD: `Nguyễn Văn Giao`, `Trần Văn Kho` |
| `phone` | VarChar(20) | Bắt buộc (Index `idx_staff_phone`)| Số điện thoại liên lạc công việc. VD: `0900000003` |
| `email` | VarChar(255) | Tùy chọn (Index `idx_staff_email`)| Email nội bộ/liên hệ công việc. VD: `driver@velocity.vn` |
| `citizen_id` | VarChar(20) | Khóa duy nhất (Unique), Tùy chọn| Số Căn cước công dân. VD: `079098001234` |
| `position` | VarChar(100)| Bắt buộc | Chức vụ: `ADMIN`, `DISPATCHER`, `WAREHOUSE_STAFF`, `DRIVER` |
| `assigned_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục công tác (Trỏ `facilities.id`, ON DELETE SET NULL, Index `idx_staff_facility`). VD: `fac-01` |
| `driver_license_number`| VarChar(50)| Khóa duy nhất (Unique), Tùy chọn| Số bằng lái xe GPLX (Chỉ dùng cho Driver). VD: `59012938102` |
| `driver_license_class` | VarChar(10)| Tùy chọn | Hạng bằng lái xe GPLX (Chỉ dùng cho Driver). VD: `A1`, `B2`, `C`, `FC` |
| `employment_status` | Enum (`DriverEmploymentStatus`)| Tùy chọn (Default ACTIVE, Index `idx_staff_status`)| Trạng thái: `ACTIVE`, `OFFLINE`, `SUSPENDED`, `DISABLED` |
| `hire_date` | Date | Tùy chọn | Ngày chính thức tuyển dụng. VD: `2025-01-15` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian tạo hồ sơ |

---

### 20. Bảng `staff_driver_types` (Bảng trung gian N-N Loại hình Giao hàng Tài xế)
📌 **Chức năng của bảng:** Lưu danh sách các loại hình giao hàng mà 1 tài xế (`staff`) đăng ký đảm nhận (`HUB_DELIVERY`, `LINEHAUL_TRANSFER`, `ON_DEMAND`). Cho phép 1 tài xế có thể đăng ký chạy nhiều hình thức cùng lúc.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi phân công loại hình. |
| `staff_id` | Uuid | **Cặp khóa duy nhất [staff_id, driver_type]**, **FK ➔ bảng staff** | Mã tài xế thực hiện (ON DELETE CASCADE, Index `idx_staff_driver_types_staff`). |
| `driver_type` | Enum (`DriverType`)| **Cặp khóa duy nhất [staff_id, driver_type]**, Bắt buộc (Index `idx_staff_driver_types_type`)| Loại hình: `HUB_DELIVERY`, `LINEHAUL_TRANSFER`, `ON_DEMAND` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian gán/đăng ký loại hình. |

---

### 21. Bảng `vehicles` (Danh mục Phương tiện Giao hàng)
📌 **Chức năng của bảng:** Quản lý danh sách các phương tiện di chuyển trong đội xe (Xe máy, Xe tải nhẹ, Xe Van). Quản lý biển số xe, tải trọng tối đa (Kg), thể tích thùng xe ($m^3$), chiều dài thùng xe (`max_length`), cờ hỗ trợ xe lạnh (`is_refrigerated`), bưu cục đậu xe và trạng thái vận hành.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã phương tiện. VD: `veh-01`, `veh-02` |
| `vehicle_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã xe quản lý. VD: `XE-TRUCK-01`, `XE-BIKE-02` |
| `plate_number` | VarChar(20) | Khóa duy nhất (Unique), Bắt buộc | Biển số xe đăng ký. VD: `59-P1 999.88` |
| `vehicle_type_id` | Uuid | **Khóa ngoại (FK ➔ bảng vehicle_types)**| Loại xe (Trỏ `vehicle_types.id`, ON DELETE RESTRICT, Index `idx_vehicles_type`). VD: `vtype-01` |
| `assigned_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục đậu/quản lý xe (ON DELETE SET NULL). VD: `fac-01` |
| `max_weight` | Decimal(10,2)| Bắt buộc | Tải trọng tối đa (Kg). VD: `1500.00` Kg |
| `max_volume` | Decimal(10,4)| Bắt buộc | Thể tích thùng xe tối đa ($m^3$). VD: `12.5000` $m^3$ |
| `max_length` | Decimal(6,2) | Tùy chọn | Chiều dài lòng thùng xe (m). VD: `3.50` m |
| `is_refrigerated` | Boolean | Default False | Cờ xe có thùng bảo quản đông lạnh (`true` / `false`) |
| `operating_status`| Enum (`VehicleOperatingStatus`)| Bắt buộc | Trạng thái: `ACTIVE` (Sẵn sàng), `MAINTENANCE` (Đang sửa), `RETIRED` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 22. Bảng `vehicle_types` (Loại Phương tiện)
📌 **Chức năng của bảng:** Định nghĩa chủng loại phương tiện (Xe máy `MOTORBIKE`, Xe tải Van 500Kg `VAN_500KG`, Xe tải 1.5 Tấn `TRUCK_1.5TON`) làm căn cứ để thuật toán AI Routing phân bổ tuyến đường phù hợp với kích thước kiện hàng.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã loại phương tiện. VD: `vtype-01` |
| `type_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã loại xe: `MOTORBIKE`, `VAN_500KG`, `TRUCK_1.5TON` |
| `type_name` | VarChar(100) | Bắt buộc | Tên hiển thị loại xe. VD: `Xe tải nhẹ 1.5 Tấn` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 23. Bảng `driver_vehicle_assignments` (Phân công Xe cho Tài xế)
📌 **Chức năng của bảng:** Quản lý lịch sử và trạng thái phân công xe cho tài xế sử dụng theo từng ca làm việc. Đảm bảo tại một thời điểm biết chính xác tài xế nào đang điều khiển phương tiện nào.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lượt phân công xe. VD: `dva-01` |
| `driver_id` | Uuid | **Khóa ngoại (FK ➔ bảng staff)** | Tài xế được gán xe (Trỏ `staff.id`, ON DELETE CASCADE, Index `idx_dva_driver_active`). VD: `stf-01` |
| `vehicle_id` | Uuid | **Khóa ngoại (FK ➔ bảng vehicles)**| Phương tiện được gán (Trỏ `vehicles.id`, ON DELETE CASCADE, Index `idx_dva_vehicle_active`). VD: `veh-01` |
| `assigned_from` | Timestamptz | Bắt buộc | Thời điểm bắt đầu giao xe. VD: `2026-07-24 06:00:00+07` |
| `assigned_to` | Timestamptz | Tùy chọn | Thời điểm trả xe |
| `is_active` | Boolean | Default True | Đánh dấu phân công đang có hiệu lực (`true` / `false`) |

---

### 24. Bảng `driver_locations` (Tọa độ GPS Thời gian thực hiện tại của Shipper)
📌 **Chức năng của bảng:** Lưu trữ vị trí tọa độ GPS mới nhất (`latitude`, `longitude`) của từng tài xế. Bảng này được ứng dụng Mobile Shipper cập nhật vị trí hiện tại ngầm để hiển thị trên bản đồ Web Admin và hỗ trợ AI phân công đơn hàng cho Shipper đứng gần nhất.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `driver_id` | Uuid | **Khóa chính (PK)**, **FK ➔ bảng staff** | Mã tài xế (ON DELETE CASCADE, Index `idx_drv_loc_coords`). Mỗi tài xế giữ 1 bản ghi vị trí hiện tại. VD: `stf-01` |
| `latitude` | Double | Bắt buộc | Vĩ độ phát ngầm thời gian thực qua WebSocket. VD: `10.7735` |
| `longitude` | Double | Bắt buộc | Kinh độ phát ngầm thời gian thực qua WebSocket. VD: `106.6590` |
| `recorded_at` | Timestamptz | Bắt buộc | Mốc thời gian thiết bị phát tọa độ gần nhất. VD: `2026-07-24 09:40:00+07` |

---

## 🗺️ MODULE 7: ROUTING & DISPATCH ENGINE (Điều vận & Thuật toán AI)

### 25. Bảng `routes` (Tuyến đường Lộ trình tối ưu bởi AI)
📌 **Chức năng của bảng:** Lưu trữ các tuyến đường lộ trình tối ưu được sinh ra bởi thuật toán AI (K-Means + Genetic Algorithm). Quản lý tổng quãng đường dự kiến (Km), tổng thời gian dự kiến (phút), bưu cục xuất phát, bưu cục kết thúc và liên kết với tài xế/xe được gán.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lộ trình tối ưu. VD: `rt-01`, `rt-02` |
| `route_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã tuyến đường. VD: `RT-20260724-001` |
| `driver_vehicle_assignment_id`| Uuid | **Khóa ngoại (FK ➔ bảng driver_vehicle_assignments)**| Phân công Shipper+Xe (Nullable cho phép AI sinh Route trước, ON DELETE SET NULL, Index `idx_routes_dva`). VD: `dva-01` |
| `start_facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục điểm xuất phát tuyến (ON DELETE RESTRICT). VD: `fac-01` |
| `end_facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục điểm kết thúc tuyến (ON DELETE RESTRICT). VD: `fac-01` |
| `optimization_id` | Uuid | **Khóa ngoại (FK ➔ bảng route_optimizations)** | Kết nối lượt chạy tối ưu AI (ON DELETE SET NULL). VD: `ro-01` |
| `planned_distance_km` | Decimal(10,2)| Default 0 | Tổng quãng đường AI tính toán tối ưu (Km). VD: `14.85` Km |
| `planned_duration_min`| Int | Default 0 | Tổng thời gian AI ước tính hoàn thành (Phút). VD: `125` Phút |
| `total_stops` | Integer | Default 0 | Tổng số điểm dừng trên lộ trình AI |
| `status` | Enum (`RouteStatus`)| Default PLANNED (Index `idx_routes_status`)| Trạng thái tuyến: `PLANNED` (AI vừa tính xong), `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `actual_start_at` | Timestamptz | Tùy chọn | Thời điểm thực tế xe xuất phát |
| `completed_at` | Timestamptz | Tùy chọn | Thời điểm thực tế xe hoàn thành |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |
| `updated_at` | Timestamptz | UpdatedAt | Mốc thời gian cập nhật thông tin gần nhất |

---

### 26. Bảng `route_stops` (Chi tiết Các điểm dừng trên Lộ trình)
📌 **Chức năng của bảng:** Lưu trữ danh sách thứ tự các điểm dừng cần ghé thăm trên tuyến đường do AI sắp xếp (`sequence` 1, 2, 3...). Phân loại rõ điểm dừng Lấy hàng tại nhà khách `PICKUP`, điểm dừng bưu cục trung chuyển `HUB`, hay điểm dừng Giao hàng cho người nhận `DELIVERY`.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã điểm dừng. VD: `rs-01`, `rs-02` |
| `route_id` | Uuid | **Cặp khóa duy nhất [route_id, sequence]**, **FK ➔ bảng routes** | Thuộc Lộ trình nào (Trỏ `routes.id`, ON DELETE CASCADE). VD: `rt-01` |
| `sequence` | Int | **Cặp khóa duy nhất [route_id, sequence]**, Bắt buộc | Thứ tự ghé thăm tối ưu (1, 2, 3...) |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Vận đơn cần giao (Dùng cho điểm dừng Delivery Giao hàng, ON DELETE SET NULL). VD: `spm-01` |
| `order_id` | Uuid | **Khóa ngoại (FK ➔ bảng orders)** | Đơn hàng cần lấy (Dùng cho điểm dừng Pickup Lấy hàng tại nhà, ON DELETE SET NULL). VD: `ord-01` |
| `facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục ghé trung chuyển (Dùng cho điểm dừng Hub, ON DELETE SET NULL) |
| `stop_type` | Enum (`RouteStopType`)| Bắt buộc | Loại điểm dừng: `PICKUP` (Lấy hàng), `HUB` (Bưu cục), `DELIVERY` (Giao hàng) |
| `sequence` | Int | Bắt buộc | Thứ tự điểm dừng |
| `address_snapshot` | Text | Bắt buộc | Chuỗi địa chỉ điểm dừng tại thời điểm chốt lộ trình |
| `latitude` | Double | Bắt buộc | Vĩ độ định vị GPS của điểm dừng. VD: `10.7721` |
| `longitude` | Double | Bắt buộc | Kinh độ định vị GPS của điểm dừng. VD: `106.6578` |
| `status` | Enum (`RouteStopStatus`)| Default PENDING | Trạng thái dừng: `PENDING` (Chờ ghé), `ARRIVED` (Đã đến), `DEPARTED`, `SKIPPED`, `FAILED` |
| `arrived_at` | Timestamptz | Tùy chọn | Thời điểm thực tế Shipper bấm Check-in / đến nơi. VD: `2026-07-24 09:40:00+07` |
| `departed_at` | Timestamptz | Tùy chọn | Thời điểm thực tế Shipper bấm Check-out / rời đi. VD: `2026-07-24 09:45:00+07` |

---

### 27. Bảng `dispatch_tasks` (Nhiệm vụ Điều vận Phân công ca Shipper)
📌 **Chức năng của bảng:** Quản lý công việc phân công tuyến đường cho tài xế. Lưu vết Nhân viên điều vận phân công (`assigned_by`), Tài xế nhận ca (`assigned_to`), loại nhiệm vụ (`task_type`) và trạng thái ca (`PENDING`, `ACCEPTED`, `REJECTED`, `COMPLETED`, `CANCELLED`).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã nhiệm vụ điều vận. VD: `dt-01` |
| `task_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã task điều vận. VD: `TSK-20260724-88` |
| `route_id` | Uuid | **Khóa ngoại (FK ➔ bảng routes)** | Lộ trình được gán (Trỏ `routes.id`, ON DELETE RESTRICT). VD: `rt-01` |
| `assigned_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Staff/Admin thực hiện giao ca (ON DELETE RESTRICT). VD: `usr-02` |
| `assigned_to` | Uuid | **Khóa ngoại (FK ➔ bảng staff)** | Shipper được giao nhận ca (Trỏ `staff.id`, ON DELETE RESTRICT, Index `idx_disp_tasks_driver`). VD: `stf-01` |
| `task_type` | Enum (`DispatchTaskType`)| Bắt buộc | Loại nhiệm vụ: `ASSIGN_ROUTE`, `REASSIGN_ROUTE`, `EMERGENCY` |
| `priority` | SmallInt | Default 1 | Mức độ ưu tiên nhiệm vụ (1: Tiêu chuẩn, 2: Gấp) |
| `status` | Enum (`DispatchTaskStatus`)| Default PENDING (Index `idx_disp_tasks_status`)| Trạng thái ca: `PENDING` (Chờ nhận), `ACCEPTED` (Đã nhận ca), `REJECTED` (Từ chối), `COMPLETED`, `CANCELLED` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |
| `completed_at` | Timestamptz | Tùy chọn | Thời điểm thực tế xe hoàn thành nhiệm vụ |

---

### 28. Bảng `route_optimizations` (Nhật ký Thuật toán AI Routing)
📌 **Chức năng của bảng:** Nhật ký đánh giá hiệu năng thuật toán AI. Lưu vết mỗi lượt kích hoạt AI Gom Cụm, bao gồm tên thuật toán, số lượng đơn đầu vào, số lượng tuyến đầu ra và trạng thái xử lý.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lượt chạy tối ưu AI. VD: `ro-01` |
| `algorithm_name` | VarChar(50) | Bắt buộc | Thuật toán áp dụng: `K-Means + Genetic VRP` |
| `input_shipment_count`| Int | Bắt buộc | Số lượng đơn/vận đơn đầu vào cần phân tuyến. VD: `50` đơn |
| `output_route_count` | Int | Bắt buộc | Số lượng Tuyến đường tối ưu sinh ra. VD: `3` tuyến |
| `optimization_status` | Enum (`OptimizationStatus`)| Bắt buộc | Trạng thái tối ưu AI (`SUCCESS` / `FAILED`) |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 29. Bảng `route_adjustment_logs` (Nhật ký Xử lý Sự cố Điều chỉnh Thủ công Lộ trình)
📌 **Chức năng của bảng:** Bảng Audit Log ghi vết xử lý sự cố lộ trình. Khi có sự cố trên đường (Shipper hỏng xe, tai nạn), Staff/Admin thực hiện điều chỉnh thủ công (đổi tài xế mid-trip, hủy tuyến) thì toàn bộ thông tin ai điều chỉnh, tài xế cũ, tài xế mới, thời gian và lý do đều được lưu lại tại bảng này.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lượt xử lý sự cố. VD: `ral-01` |
| `route_id` | Uuid | **Khóa ngoại (FK ➔ bảng routes)** | Lộ trình bị can thiệp (Trỏ `routes.id`, ON DELETE CASCADE, Index `idx_route_adj_route`). VD: `rt-01` |
| `adjusted_by_user_id`| Uuid | **Khóa ngoại (FK ➔ bảng users)** | Staff/Admin thực hiện can thiệp thủ công (ON DELETE RESTRICT). VD: `usr-02` |
| `old_driver_id` | Uuid | Tùy chọn | Tài xế cũ bị hủy ca/thay thế. VD: `stf-01` |
| `new_driver_id` | Uuid | Tùy chọn | Tài xế mới được điều động thay thế. VD: `stf-02` |
| `adjustment_type` | VarChar(50) | Bắt buộc | Loại can thiệp: `REASSIGN_DRIVER` (Đổi tài xế), `MODIFY_STOPS`, `CANCEL_ROUTE` |
| `reason` | Text | Bắt buộc | Lý do sự cố: `Tài xế hỏng xe giữa đường tại ngã tư Hàng Xanh` |
| `adjusted_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian can thiệp điều chỉnh tuyến |

---

## 📸 MODULE 8: TRACKING, SCAN & POD (Giám sát & Bằng chứng Giao hàng)

### 30. Bảng `tracking_events` (Nhật ký Sự kiện Tracking Vận đơn Công khai)
📌 **Chức năng của bảng:** Lưu trữ dòng thời gian (Timeline) các sự kiện tracking vận đơn công khai cho Khách hàng & Người dùng tra cứu hành trình trực quan trên Web/Mobile.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã định danh sự kiện tracking. VD: `te-01` |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Thuộc Vận đơn nào (Trỏ `shipments.id`, ON DELETE CASCADE, Index `idx_track_events_shipment`). VD: `spm-01` |
| `route_stop_id` | Uuid | **Khóa ngoại (FK ➔ bảng route_stops)** | Phát sinh từ điểm dừng nào (nếu có, ON DELETE SET NULL). VD: `rs-01` |
| `event_type` | Enum (`TrackingEventType`)| Bắt buộc | Loại sự kiện: `CREATED`, `DRIVER_ASSIGNED`, `PICKED_UP`, `ARRIVED_FACILITY`, `DEPARTED_FACILITY`, `ARRIVED_HUB`, `DEPARTED_HUB`, `OUT_FOR_DELIVERY`, `DELIVERY_SUCCESS`, `DELIVERY_FAIL`, `RETURN_STARTED`, `EXCEPTION_OCCURRED`, `RETURNED`, `CANCELLED` |
| `description` | Text | Bắt buộc | Mô tả chi tiết hành trình. VD: `Đơn hàng đã được giao thành công cho người nhận` |
| `latitude` | Double | Tùy chọn | Vĩ độ GPS phát sinh sự kiện. VD: `10.7740` |
| `longitude` | Double | Tùy chọn | Kinh độ GPS phát sinh sự kiện. VD: `106.7030` |
| `created_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người dùng/Nhân viên ghi nhận sự kiện (ON DELETE SET NULL). VD: `usr-03` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian ghi nhận sự kiện vào CSDL |

---

### 31. Bảng `warehouse_scans` (Nhật ký Quét kho & Sọt hàng Tập kết)
📌 **Chức năng của bảng:** Quản lý nhật ký vết quét vạch Barcode/QR Code của bưu kiện và sọt hàng tập kết (`tote_bag_id`) tại từng phân khu bưu cục và trên phương tiện trung chuyển. Ghi nhận vết ai quét (`scanned_by`), tại bưu cục nào (`facility_id`), thuộc chuyến xe trung chuyển nào (`shipment_id`), bưu kiện lẻ (`package_id`) và sọt gom tập kết (`tote_bag_id`).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lượt quét kho. VD: `ws-01`, `ws-02` |
| `facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục/Kho thực hiện quét mã (ON DELETE SET NULL). VD: `fac-01` |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Thuộc Chuyến xe trung chuyển nào (Trỏ `shipments.id`, ON DELETE SET NULL, Index `idx_warehouse_scans_shipment`). VD: `spm-01` |
| `package_id` | Uuid | **Khóa ngoại (FK ➔ bảng packages)** | Bưu kiện được quét (Trỏ `packages.id`, ON DELETE SET NULL). VD: `pkg-01` |
| `scanned_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người dùng/Thủ kho thực hiện quét (Trỏ `users.id`, ON DELETE RESTRICT). VD: `usr-03` |
| `tote_bag_id` | Uuid | **Khóa ngoại (FK ➔ bảng tote_bags)** | Sọt gom tập kết bưu kiện (Trỏ `tote_bags.id`, ON DELETE SET NULL, Index `idx_warehouse_scans_tote`). VD: `tb-01` |
| `scanned_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian thực hiện quét kho |

---

### 32. Bảng `tote_bags` (Quản lý Sọt gom & Bao gộp Chuyển kho)
📌 **Chức năng của bảng:** Quản lý danh mục các Sọt gom / Bao gộp bưu kiện (`ToteBag`) được tạo tự động hoặc thủ công tại các phân khu kho (`zone_code`). Theo dõi trạng thái sọt (`OPEN` - Đang gom hàng, `SEALED` - Đã chốt niêm phong, `LOADED` - Đã bốc lên xe tải), thời điểm chốt niêm phong (`sealed_at`) và liên kết với các lượt quét bưu kiện.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã định danh sọt hàng. VD: `tb-01` |
| `tote_code` | VarChar(100) | Khóa duy nhất (Unique), Bắt buộc (Index `idx_tote_bags_code`)| Mã QR / Barcode sọt gom độc nhất. VD: `TOTE-FAC_HUB_HCM-ZONE-P-INBOUND-001` |
| `zone_code` | VarChar(50) | Bắt buộc (Index `idx_tote_bags_facility_zone`)| Mã phân khu tập kết sọt. VD: `ZONE-P-INBOUND`, `ZONE-P-INTER-HUB` |
| `facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Kho/Bưu cục sở hữu sọt (Trỏ `facilities.id`, ON DELETE SET NULL, Index `idx_tote_bags_facility_zone`). VD: `fac-01` |
| `status` | Enum (`ToteStatus`)| Bắt buộc (Default OPEN) | Trạng thái sọt: `OPEN` (Đang gom), `SEALED` (Đã niêm phong), `LOADED` (Đã lên xe) |
| `sealed_at` | Timestamptz | Tùy chọn | Mốc thời gian thủ kho bấm chốt niêm phong sọt |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Thời điểm khởi tạo sọt gom |
| `updated_at` | Timestamptz | UpdatedAt | Mốc thời gian cập nhật thông tin sọt gần nhất |

---

### 33. Bảng `delivery_proofs` (Bằng chứng Giao hàng - POD & COD Thực thu)
📌 **Chức năng của bảng:** Quản lý chứng từ bằng chứng giao hàng (POD). Lưu vết loại bằng chứng, kết quả giao (`SUCCESS`, `FAILED`, `PARTIAL`), lý do thất bại (`failure_reason`), đường dẫn ảnh chứng từ (`file_url`) và **Số tiền COD thực tế tài xế đã thu tại chỗ `actual_cod_collected`**.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã chứng từ giao hàng. VD: `dp-01` |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Vận đơn được giao (ON DELETE CASCADE). VD: `spm-01` |
| `route_stop_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng route_stops)**| Điểm dừng duy nhất phát sinh chứng từ này (Trỏ `route_stops.id`, ON DELETE RESTRICT). VD: `rs-01` |
| `delivery_result` | Enum (`DeliveryResult`)| Bắt buộc | Kết quả: `SUCCESS` (Thành công), `FAILED` (Thất bại), `PARTIAL` |
| `actual_cod_collected`| Decimal(12,2)| Tùy chọn | **Số tiền mặt COD thực tế Shipper đã thu tại chỗ** đối soát tài chính. VD: `500000.00` VNĐ |
| `file_url` | VarChar(500)| Tùy chọn | Đường dẫn ảnh chụp bằng chứng giao hàng. VD: `https://storage.goong.io/pod/proof_dp01.jpg` |
| `failure_reason` | Enum (`DeliveryFailureReason`)| Tùy chọn | Lý do thất bại: `RECIPIENT_UNAVAILABLE` (Khách không bắt máy), `INCORRECT_ADDRESS`, `RECIPIENT_REJECTED`, `FORCE_MAJEURE`, `OTHER` |
| `verified_latitude` | Double | Tùy chọn | Vĩ độ GPS xác minh giao hàng |
| `verified_longitude`| Double | Tùy chọn | Kinh độ GPS xác minh giao hàng |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

## ⚙️ MODULE 9: SYSTEM CONFIGURATION (Cấu hình Tham số AI & Hệ thống)

### 34. Bảng `system_settings` (Tham số Siêu cấu hình AI / GPS)
📌 **Chức năng của bảng:** Lưu trữ tất cả các tham số siêu cấu hình vận hành hệ thống và thuật toán AI (bán kính phân cụm K-Means, kích thước quần thể GA, tỷ lệ đột biến GA, chu kỳ phát GPS). Cho phép Admin điều chỉnh tham số AI linh hoạt trên giao diện Web mà không cần khởi động lại Server.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã tham số cấu hình. VD: `ss-01` |
| `setting_key` | VarChar(100) | Khóa duy nhất (Unique), Bắt buộc | Khóa cấu hình: `GPS_INTERVAL_SECONDS`, `POPULATION_SIZE`, `MUTATION_RATE` |
| `setting_value` | Text | Bắt buộc | Giá trị cấu hình: `"5"`, `"100"`, `"0.15"` |
| `value_type` | Enum (`SettingValueType`)| Bắt buộc | Kiểu dữ liệu: `STRING`, `INTEGER`, `DECIMAL`, `BOOLEAN`, `JSON` |
| `category` | Enum (`SettingCategory`)| Bắt buộc | Phân nhóm: `AI`, `ROUTING`, `GPS`, `SYSTEM`, `MOBILE`, `BUSINESS` |
| `description` | Text | Tùy chọn | Mô tả chi tiết ý nghĩa cấu hình |
| `is_editable` | Boolean | Bắt buộc (Default True) | Cờ cho phép chỉnh sửa (`true`/`false`) |
| `is_active` | Boolean | Bắt buộc (Default True) | Trạng thái kích hoạt (`true`/`false`) |
| `updated_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Admin thực hiện chỉnh sửa cấu hình gần nhất (Trỏ `users.id`, ON DELETE SET NULL). VD: `usr-01` |
| `updated_at` | Timestamptz | UpdatedAt | Mốc thời gian cập nhật thông tin gần nhất |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

## 🗺️ MODULE 10: VIETNAMESE ADMINISTRATIVE UNITS (Đơn vị Hành chính Việt Nam)

### 35. Bảng `administrative_regions` (Vùng Địa lý Hành chính)
📌 **Chức năng của bảng:** Quản lý danh mục các vùng kinh tế - địa lý hành chính Việt Nam (Đông Nam Bộ, Đồng Bằng Sông Hồng, Tây Nguyên...) phục vụ phân vùng kinh doanh và báo cáo quy hoạch.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Integer | **Khóa chính (PK)** | Mã định danh vùng địa lý. VD: `1`, `2` |
| `name` | VarChar(255) | Bắt buộc | Tên vùng địa lý tiếng Việt. VD: `Đông Nam Bộ` |
| `name_en` | VarChar(255) | Bắt buộc | Tên vùng địa lý tiếng Anh. VD: `Southeast` |
| `code_name` | VarChar(255) | Tùy chọn | Mã CodeName vùng. VD: `dong_nam_bo` |
| `code_name_en` | VarChar(255) | Tùy chọn | Mã CodeName tiếng Anh. VD: `southeast` |

---

### 36. Bảng `administrative_units` (Cấp Đơn vị Hành chính)
📌 **Chức năng của bảng:** Quản lý danh mục cấp hành chính (Thành phố trực thuộc trung ương, Tỉnh, Quận, Huyện, Phường, Xã) chuẩn hóa quốc gia.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Integer | **Khóa chính (PK)** | Mã định danh cấp đơn vị hành chính. VD: `1`, `2` |
| `full_name` | VarChar(255) | Tùy chọn | Tên tiếng Việt đầy đủ cấp hành chính. VD: `Thành phố trực thuộc trung ương` |
| `full_name_en` | VarChar(255) | Tùy chọn | Tên tiếng Anh đầy đủ cấp hành chính. VD: `Municipality` |
| `short_name` | VarChar(255) | Tùy chọn | Tên viết tắt tiếng Việt. VD: `Thành phố` |
| `short_name_en` | VarChar(255) | Tùy chọn | Tên viết tắt tiếng Anh. VD: `City` |
| `code_name` | VarChar(255) | Tùy chọn | Mã CodeName cấp hành chính |
| `code_name_en` | VarChar(255) | Tùy chọn | Mã CodeName tiếng Anh |

---

### 37. Bảng `provinces` (Tỉnh / Thành phố)
📌 **Chức năng của bảng:** Quản lý danh mục mã và tên các Tỉnh / Thành phố trực thuộc Trung ương của Việt Nam (dùng để seed dữ liệu chuẩn địa chính quốc gia).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `code` | VarChar(20) | **Khóa chính (PK)** | Mã tỉnh/thành địa chính. VD: `79` (TP.HCM), `01` (Hà Nội) |
| `name` | VarChar(255) | Bắt buộc | Tên tỉnh thành. VD: `Thành phố Hồ Chí Minh` |
| `name_en` | VarChar(255) | Tùy chọn | Tên tiếng Anh địa chính. VD: `Ho Chi Minh` |
| `full_name` | VarChar(255) | Bắt buộc | Tên đầy đủ địa chính. VD: `Thành phố Hồ Chí Minh` |
| `full_name_en` | VarChar(255) | Tùy chọn | Tên đầy đủ tiếng Anh địa chính |
| `code_name` | VarChar(255) | Tùy chọn | Mã CodeName địa chính. VD: `ho_chi_minh` |
| `administrative_unit_id` | Integer | Khóa ngoại (FK ➔ bảng administrative_units) | Cấp hành chính (ON DELETE RESTRICT, ON UPDATE CASCADE) |
| `administrative_region_id`| Integer | Khóa ngoại (FK ➔ bảng administrative_regions)| Vùng địa lý (ON DELETE SET NULL, ON UPDATE CASCADE) |

---

### 38. Bảng `wards` (Phường / Xã - Trực thuộc Tỉnh/TP)
📌 **Chức năng của bảng:** Quản lý danh mục các Phường / Xã liên kết trực tiếp với Tỉnh / Thành phố theo mô hình địa chính 2 cấp (Tỉnh/TP ➔ Phường/Xã) phục vụ việc chọn địa chỉ chuyển phát nhanh chóng trên Web và Mobile App.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `code` | VarChar(20) | **Khóa chính (PK)** | Mã phường xã địa chính. VD: `26830` |
| `name` | VarChar(255) | Bắt buộc | Tên phường xã. VD: `Phường 14` |
| `name_en` | VarChar(255) | Tùy chọn | Tên tiếng Anh địa chính |
| `full_name` | VarChar(255) | Tùy chọn | Tên đầy đủ địa chính |
| `full_name_en` | VarChar(255) | Tùy chọn | Tên đầy đủ tiếng Anh địa chính |
| `code_name` | VarChar(255) | Tùy chọn | Mã CodeName địa chính |
| `province_code` | VarChar(20) | **Khóa ngoại (FK ➔ bảng provinces)** | Thuộc Tỉnh/TP nào (Trỏ `provinces.code`, ON DELETE RESTRICT, ON UPDATE CASCADE). VD: `79` |
| `administrative_unit_id` | Integer | Khóa ngoại (FK ➔ bảng administrative_units) | Cấp hành chính (ON DELETE RESTRICT, ON UPDATE CASCADE) |

---

## 💡 KẾT LUẬN & ĐỒNG BỘ KIẾN TRÚC

Tài liệu Tự điển CSDL này tổng hợp đầy đủ **38 bảng** dữ liệu thuộc 10 Module, đồng bộ 100% với **Prisma Schema (`schema.prisma`)** và các tài liệu thiết kế kỹ thuật của Smart Logistics Platform.
