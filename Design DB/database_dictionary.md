# 📖 TỰ ĐIỂN CƠ SỞ DỮ LIỆU CHUẨN HÓA (DATABASE DICTIONARY) - SMART LOGISTICS PLATFORM

Tài liệu này tổng hợp toàn bộ 41 bảng cơ sở dữ liệu được thiết kế theo chuẩn **Clean Architecture & Domain Driven Design**, phân chia theo 10 Phân hệ (Module) phục vụ hệ thống Smart Logistics Platform (SLP). 

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
| `username` | VarChar(50) | Khóa duy nhất (Unique), Bắt buộc | Tên đăng nhập duy nhất. VD: `hung_admin`, `staff_kho_tbd`, `shipper_nam`, `kh_vinamilk` |
| `password_hash`| Text | Bắt buộc | Chuỗi mật khẩu băm bảo mật Bcrypt. VD: `$2b$10$e8N0Y9z.K2qL.uX1vW9Z8e...` |
| `status` | Enum | Bắt buộc (Default Active) | Trạng thái tài khoản: `ACTIVE` (Hoạt động), `LOCKED` (Khóa), `DISABLED` (Vô hiệu hóa), `PENDING_VERIFICATION` |
| `role_id` | Uuid | **Khóa ngoại (FK ➔ bảng roles)** | Mã vai trò hệ thống gán cho người dùng (Trỏ `roles.id`). VD: `rol-01` |
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
| `description` | Text | Tùy chọn | Mô tả phạm vi tác động của quyền trong hệ thống |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Thời điểm tạo quyền hạn |

---

### 4. Bảng `role_permissions` (Gán Quyền cho Vai trò - Bảng trung gian N:N)
📌 **Chức năng của bảng:** Bảng trung gian thể hiện mối quan hệ N:N giữa bảng `roles` và `permissions`. Bảng này thiết lập tập hợp các quyền thao tác cụ thể mà một vai trò được phép thực hiện trong hệ thống.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `role_id` | Uuid | **Cặp khóa chính (Composite PK [role_id, permission_id])**, **FK ➔ bảng roles** | Mã vai trò được gán quyền. VD: `rol-01` (Gán cho vai trò Admin) |
| `permission_id` | Uuid | **Cặp khóa chính (Composite PK [role_id, permission_id])**, **FK ➔ bảng permissions** | Mã quyền hạn được gán cho vai trò. VD: `per-01` (Gán quyền ORDER_CREATE) |

---

## 🏬 MODULE 2: CUSTOMERS & ADDRESSES (Khách hàng & Địa chỉ)

### 5. Bảng `customers` (Hồ sơ Khách hàng - Clean Architecture PII Profile)
📌 **Chức năng của bảng:** Lưu trữ thông tin hồ sơ cá nhân/doanh nghiệp của Khách hàng. Bảng lưu trữ trực tiếp `full_name`, `phone`, `email` giúp các tác vụ gửi thông báo/mail diễn ra cực nhanh mà không cần JOIN bảng `users`. Liên kết 1-1 với `users` qua `user_id UNIQUE`.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã hồ sơ khách hàng. VD: `cust-01`, `cust-02` |
| `user_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng users)** | Khóa ngoại 1-1 trỏ bảng `users` (Tài khoản đăng nhập). VD: `usr-04` |
| `customer_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã quản lý khách hàng. VD: `CUST-000001`, `KH-BIZ-0012` |
| `full_name` | VarChar(150) | Bắt buộc | Họ và tên khách hàng/đại diện. VD: `Nguyễn Văn A` |
| `phone` | VarChar(20) | Bắt buộc | Số điện thoại liên lạc chính. VD: `0900000004` |
| `email` | VarChar(255) | Tùy chọn | Địa chỉ email nhận thông báo/hóa đơn. VD: `customer@velocity.vn` |
| `customer_type` | Enum | Bắt buộc | Loại khách hàng: `INDIVIDUAL` (Cá nhân gửi lẻ), `BUSINESS` (Doanh nghiệp/Shop) |
| `company_name` | VarChar(255) | Tùy chọn | Tên công ty/Thương hiệu shop (nếu BIZ). VD: `Công ty TNHH Vinamilk` |
| `tax_code` | VarChar(30) | Tùy chọn | Mã số thuế doanh nghiệp. VD: `0300588569` |
| `status` | Enum | Bắt buộc (Default Active) | Trạng thái hồ sơ: `ACTIVE` (Hoạt động), `INACTIVE`, `BLOCKED` (Chặn tạo đơn), `DISABLED` (Vô hiệu hóa/Ẩn) |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Ngày khách hàng đăng ký hệ thống |

---

### 6. Bảng `addresses` (Kho dữ liệu Địa chỉ Chuyển phát & Map API)
📌 **Chức năng của bảng:** Lưu trữ tập trung kho dữ liệu địa chỉ lấy hàng, địa chỉ giao hàng và địa chỉ kho bãi bưu cục. Bảng này lưu chi tiết số nhà/tên đường, phường xã, tỉnh thành, tọa độ vĩ độ/kinh độ GPS (`latitude`, `longitude`) và `place_id` từ API Bản đồ (Goong Maps / Google Maps) phục vụ tính toán khoảng cách và hiển thị trên bản đồ.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã địa chỉ duy nhất. VD: `addr-01`, `addr-02` |
| `address_line_1`| VarChar(255)| Bắt buộc | Số nhà, tên đường chi tiết. VD: `Số 268 Lý Thường Kiệt` |
| `ward` | VarChar(100) | Bắt buộc | Phường / Xã. VD: `Phường 14` |
| `ward_code` | VarChar(20) | **Khóa ngoại (FK ➔ bảng wards)** | Mã định danh Phường/Xã (Trỏ bảng `wards`). VD: `26830` |
| `province` | VarChar(100) | Bắt buộc | Tỉnh / Thành phố trực thuộc TW. VD: `Thành phố Hồ Chí Minh` |
| `country` | VarChar(100) | Default 'Vietnam' | Quốc gia. VD: `Vietnam` |
| `place_id` | VarChar(255)| Tùy chọn | Mã định vị địa điểm từ Goong Map / Google Maps API. VD: `ChIJaX7y8Z4vdTER...` |
| `latitude` | Double | Bắt buộc | Vĩ độ định vị GPS. VD: `10.7721` |
| `longitude` | Double | Bắt buộc | Kinh độ định vị GPS. VD: `106.6578` |
| `formatted_address`| Text | Bắt buộc | Địa chỉ hoàn chỉnh dạng chuỗi đầy đủ. VD: `268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 7. Bảng `customer_addresses` (Sổ địa chỉ Khách hàng & Người liên hệ kho)
📌 **Chức năng của bảng:** Bảng sổ địa chỉ lưu danh mục các địa chỉ thường dùng của từng khách hàng (Nhà riêng, văn phòng, kho bãi). Nhằm tối ưu dung lượng CSDL & tốc độ truy vấn 1-query không cần SQL JOIN, bảng **tích hợp luôn thông tin người đại diện liên hệ tại kho** (`contact_name`, `contact_phone`) như Trưởng kho, Kế toán kho.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi sổ địa chỉ. VD: `cadr-01` |
| `customer_id` | Uuid | **Cặp khóa duy nhất [customer_id, address_id]**, **FK ➔ bảng customers** | Mã khách hàng sở hữu địa chỉ. VD: `cust-01` |
| `address_id` | Uuid | **Cặp khóa duy nhất [customer_id, address_id]**, **FK ➔ bảng addresses** | Mã địa chỉ được liên kết. VD: `addr-01` |
| `address_type` | Enum | Bắt buộc | Loại địa chỉ: `HOME`, `WAREHOUSE` |
| `is_default` | Boolean | Default False | Đánh dấu địa chỉ lấy/giao mặc định (`true` / `false`) |
| `contact_name` | VarChar(150) | Tùy chọn | Họ tên người phụ trách liên hệ tại kho. VD: `Chị Mai - Trưởng Kho Q7` |
| `contact_phone`| VarChar(20) | Tùy chọn | Số điện thoại liên hệ kho trực tiếp khi Shipper đến lấy. VD: `0912345678` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Thời điểm tạo bản ghi sổ địa chỉ |

---

## 🏭 MODULE 3: FACILITY NETWORK (Mạng lưới Bưu cục & Kho bãi)

### 9. Bảng `facility_types` (Loại hình Kho bãi)
📌 **Chức năng của bảng:** Định nghĩa các loại hình cơ sở kho bãi trong mạng lưới logistics của công ty (như Trung tâm chia chọn tổng `SORTING_CENTER`, Bưu cục phát chặng cuối `LAST_MILE_HUB`).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã loại kho bãi. VD: `ftype-01` |
| `type_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã phân loại: `SORTING_CENTER` (Trung tâm chia chọn), `LAST_MILE_HUB` (Bưu cục phát chặng cuối) |
| `type_name` | VarChar(100) | Bắt buộc | Tên hiển thị loại kho. VD: `Bưu cục Giao nhận Chặng cuối (Last-mile Hub)` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 10. Bảng `facilities` (Mạng lưới Bưu cục / Hub logistics)
📌 **Chức năng của bảng:** Lưu trữ danh sách toàn bộ các bưu cục, trung tâm khai thác kho bãi trong hệ thống. Quản lý mã bưu cục, bưu cục cấp trên (cây phân cấp Hub mẹ - Hub con), Nhân viên quản lý bưu cục và lưu trực tiếp tọa độ GPS (`latitude`, `longitude`) giúp thuật toán AI Routing truy vấn vị trí kho khởi chạy siêu tốc.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã định danh bưu cục. VD: `fac-01`, `fac-02` |
| `facility_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã bưu cục/kho. VD: `HUB-Q10-HCM`, `HUB-CWD-HN` |
| `facility_name` | VarChar(255) | Bắt buộc | Tên đầy đủ của bưu cục. VD: `Bưu cục Giao nhận Quận 10 - TP.HCM` |
| `facility_type_id`| Uuid | **Khóa ngoại (FK ➔ bảng facility_types)** | Mã loại hình kho bãi (Trỏ `facility_types.id`). VD: `ftype-02` |
| `parent_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Mã bưu cục cấp trên trong cây phân cấp mạng lưới (Ví dụ Hub mẹ). VD: `fac-05` |
| `manager_user_id`| Uuid | **Khóa ngoại (FK ➔ bảng users)** | Quản lý bưu cục (Trỏ User có Role Staff/Admin). VD: `usr-02` |
| `address_id` | Uuid | **Khóa ngoại (FK ➔ bảng addresses)** | Mã địa chỉ của bưu cục/kho bãi (Trỏ `addresses.id`). VD: `addr-05` |
| `latitude` | Double | Bắt buộc | Vĩ độ định vị GPS Hub (Truy vấn siêu tốc cho AI Routing). VD: `10.7725` |
| `longitude` | Double | Bắt buộc | Kinh độ định vị GPS Hub (Truy vấn siêu tốc cho AI Routing). VD: `106.6580` |
| `operating_status`| Enum | Bắt buộc (Default Active) | Trạng thái: `ACTIVE`, `INACTIVE` |
| `opened_at` | Date | Bắt buộc | Ngày chính thức mở cửa hoạt động bưu cục. VD: `2025-01-01` |
| `closed_at` | Date | Tùy chọn | Ngày đóng cửa bưu cục (nếu status = CLOSED). VD: `2026-07-29` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 12. Bảng `facility_zones` (Phân khu Hàng hóa tại Bưu cục)
📌 **Chức năng của bảng:** Quản lý cấu trúc các phân khu nghiệp vụ bên trong bưu cục (Khu vực Nhập kho `RECEIVING`, Khu vực Phân loại chia chọn `SORTING`, Khu vực Chờ xuất giao `SHIPPING`, Khu vực Lưu kho `STORAGE`, Khu vực Hàng hoàn `RETURN`). Giúp Staff theo dõi chính xác vị trí hàng hóa đang nằm ở đâu trong kho.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã phân khu kho. VD: `fzone-01` |
| `facility_id` | Uuid | **Cặp khóa duy nhất [facility_id, zone_code]**, **FK ➔ bảng facilities** | Thuộc bưu cục nào (Trỏ `facilities.id`). VD: `fac-01` |
| `zone_code` | VarChar(30) | **Cặp khóa duy nhất [facility_id, zone_code]**, Bắt buộc | Mã phân khu kho. VD: `ZONE-REC-01`, `ZONE-SORT-A`, `ZONE-SHIP-SOUTH` |
| `zone_name` | VarChar(100) | Bắt buộc | Tên phân khu kho. VD: `Khu vực Nhập kho`, `Khu phân loại tự động`, `Khu chờ xuất giao` |
| `zone_type` | Enum | Bắt buộc | Phân loại khu vực: `SORTING`, `STORAGE` |
| `capacity` | Int | Tùy chọn | Sức chứa tối đa của phân khu (đơn vị: Số kiện hàng). VD: `5000` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

## 📦 MODULE 4: ORDERS & SERVICES (Đơn hàng & Gói dịch vụ)

### 13. Bảng `services` (Bảng giá & Dịch vụ Vận chuyển)
📌 **Chức năng của bảng:** Cấu hình danh mục các gói dịch vụ vận chuyển của công ty (Giao hỏa tốc `EXPRESS`, Tiêu chuẩn `STANDARD`, Tiết kiệm `SAVING`). Quản lý cước phí nền cơ bản, mốc khoảng cách/khối lượng miễn phí và đơn giá tính thêm theo Km/Kg.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã dịch vụ. VD: `srv-01`, `srv-02` |
| `service_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã dịch vụ: `EXPRESS`, `STANDARD` |
| `base_price` | Decimal(12,2)| Default 0 | Cước phí nền cơ bản. VD: `15000.00` VNĐ, `25000.00` VNĐ |
| `free_distance_km`| Float | Default 2.0 | Khoảng cách miễn phí tối thiểu (Km). VD: `2.0` Km |
| `price_per_km` | Decimal(12,2)| Default 0 | Cước phụ trội tính thêm theo Km. VD: `5000.00` VNĐ/Km |
| `free_weight_kg` | Float | Default 1.0 | Khối lượng miễn phí tối thiểu (Kg). VD: `1.0` Kg |
| `price_per_kg` | Decimal(12,2)| Default 0 | Cước phụ trội tính thêm theo Kg. VD: `2500.00` VNĐ/Kg |
| `service_name` | VarChar(100) | Bắt buộc | Tên dịch vụ cước. VD: `Giao hàng Hỏa tốc 2H` |
| `estimated_delivery_hours` | Integer | Bắt buộc (Default 24) | Thời gian giao hàng tiêu chuẩn dự kiến (giờ) |
| `is_active` | Boolean | Bắt buộc (Default True) | Trạng thái kích hoạt (`true`/`false`) |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 14. Bảng `orders` (Quản lý Đơn hàng - Order Snapshot)
📌 **Chức năng của bảng:** Bảng trung tâm quản lý Đơn hàng do khách tạo. Lưu đóng đóng băng (Snapshot) địa chỉ lấy/giao, tọa độ GPS, thông tin người gửi/nhận, lịch hẹn lấy hàng tận nhà, hình thức gửi hàng (`pickup_type`), gói dịch vụ đã chọn và các khoản chi phí dự tính (`estimated_shipping_fee`, `estimated_cod_amount`).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã đơn hàng duy nhất. VD: `ord-01`, `ord-02` |
| `order_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã tra cứu đơn hàng công khai. VD: `ORD-20260724-8891` |
| `customer_id` | Uuid | **Khóa ngoại (FK ➔ bảng customers)** | Khách hàng người tạo đơn (Trỏ `customers.id`). VD: `cust-01` |
| `service_id` | Uuid | **Khóa ngoại (FK ➔ bảng services)** | Dịch vụ vận chuyển đã chọn (Trỏ `services.id`). VD: `srv-01` |
| `pickup_address_id`| Uuid | **Khóa ngoại (FK ➔ bảng addresses)** | Mã địa chỉ lấy hàng gốc |
| `delivery_address_id`| Uuid | **Khóa ngoại (FK ➔ bảng addresses)** | Mã địa chỉ giao hàng gốc |
| `origin_facility_id`| Uuid| **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục nhận hàng đầu tiên. VD: `fac-01` |
| `destination_facility_id`| Uuid| **Khóa ngoại (FK ➔ bảng facilities)**| Bưu cục phát hàng cuối cùng. VD: `fac-01` |
| `created_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người khởi tạo đơn hàng. VD: `usr-01` |
| `updated_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người cập nhật đơn gần nhất |
| `status` | Enum | Bắt buộc | Trạng thái đơn hàng (`CREATED`, `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`...) |
| `scheduled_pickup_at`| Timestamptz| Tùy chọn | Lịch hẹn khách đặt Shipper đến lấy hàng. VD: `2026-07-24 14:00:00+07` |
| `sender_name` | VarChar(150) | Bắt buộc | Họ tên người gửi đóng băng snapshot. VD: `Phạm Tuấn Hưng` |
| `sender_phone` | VarChar(20) | Bắt buộc | Số điện thoại người gửi snapshot. VD: `0987654321` |
| `pickup_address_text`| Text | Bắt buộc | Địa chỉ lấy hàng chi tiết đóng băng snapshot. VD: `268 Lý Thường Kiệt, P.14, Q.10` |
| `pickup_latitude` | Double | Bắt buộc | Vĩ độ tọa độ lấy hàng. VD: `10.7721` |
| `pickup_longitude`| Double | Bắt buộc | Kinh độ tọa độ lấy hàng. VD: `106.6578` |
| `receiver_name` | VarChar(150) | Bắt buộc | Họ tên người nhận đóng băng snapshot. VD: `Trần Thị B` |
| `receiver_phone` | VarChar(20) | Bắt buộc | Số điện thoại người nhận snapshot. VD: `0918888999` |
| `delivery_address_text`| Text | Bắt buộc | Địa chỉ giao hàng chi tiết đóng băng snapshot. VD: `123 Nguyễn Huệ, P.Bến Nghé, Q.1` |
| `delivery_latitude`| Double | Bắt buộc | Vĩ độ tọa độ giao hàng. VD: `10.7740` |
| `delivery_longitude`| Double | Bắt buộc | Kinh độ tọa độ giao hàng. VD: `106.7030` |
| `estimated_shipping_fee`| Decimal(12,2)| Default 0 | Cước phí vận chuyển tạm tính. VD: `25000.00` VNĐ |
| `estimated_cod_amount` | Decimal(12,2)| Default 0 | Tiền thu hộ COD dự kiến. VD: `500000.00` VNĐ |
| `estimated_total_amount`| Decimal(12,2)| Default 0 | Tổng chi phí tạm tính. VD: `525000.00` VNĐ |
| `pickup_type` | Enum | Bắt buộc (Default PICKUP) | Hình thức gửi hàng: `PICKUP` (Shipper đến lấy tận nơi), `DROP_OFF` (Khách tự mang ra bưu cục gửi) |
| `estimated_delivery_date`| Timestamptz| Tùy chọn | Ngày & giờ dự kiến giao hàng thành công. VD: `2026-07-28 17:00:00+07` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Thời điểm tạo đơn hàng |
| `updated_at` | Timestamptz | UpdatedAt | Mốc thời gian cập nhật trạng thái/thông tin đơn hàng gần nhất |
| `estimated_insurance_fee` | Decimal(12,2) | Default 0 | Phí bảo hiểm hàng hóa tạm tính (VNĐ) |
| `estimated_distance` | Decimal(10,2) | Tùy chọn | Khoảng cách dự tính (km) |
| `estimated_duration` | Integer | Tùy chọn | Thời gian di chuyển dự tính (phút) |
| `pricing_version` | Integer | Bắt buộc (Default 1) | Phiên bản bảng giá áp dụng |

---

### 15. Bảng `packages` (Chi tiết Kiện hàng vật lý & Vị trí Phân khu Kho)
📌 **Chức năng của bảng:** Quản lý chi tiết từng kiện hàng vật lý nằm trong đơn hàng (mã barcode kiện hàng, khối lượng, thể tích, kích thước Dài x Rộng x Cao cm, yêu cầu bảo quản nhiệt độ, hàng dễ vỡ, mô tả tên hàng, giá trị khai giá để tính Phí bảo hiểm). Đồng thời lưu vết **Bưu cục hiện tại (`current_facility_id`)** và **Phân khu kho hiện tại (`current_zone_id`)** mà kiện hàng đang được lưu giữ.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã kiện hàng. VD: `pkg-01`, `pkg-02` |
| `order_id` | Uuid | **Khóa ngoại (FK ➔ bảng orders)** | Thuộc Đơn hàng nào (Trỏ `orders.id`). VD: `ord-01` |
| `package_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã vạch/Barcode kiện hàng in tem. VD: `PKG-8891-01` |
| `required_vehicle_type_id`| Uuid| **Khóa ngoại (FK ➔ bảng vehicle_types)**| Yêu cầu loại xe chở kiện hàng (VD: Xe đông lạnh, Xe tải lớn) |
| `current_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Vị trí Bưu cục hiện tại kiện hàng đang nằm. VD: `fac-01` |
| `current_zone_id` | Uuid | **Khóa ngoại (FK ➔ bảng facility_zones)**| Vị trí Phân khu kho hiện tại (Khu nhận, Khu phân loại, Khu chờ giao). VD: `fzone-01` |
| `description` | Text | Tùy chọn | Mô tả tên mặt hàng bên trong. VD: `Hộp quà thời trang cao cấp` |
| `declared_value` | Decimal(12,2)| Tùy chọn | Giá trị khai giá hàng hóa (Căn cứ tính Phí bảo hiểm). VD: `2000000.00` VNĐ |
| `weight` | Decimal(8,2) | Bắt buộc | Khối lượng kiện hàng thực tế (Kg). VD: `1.25` Kg |
| `length` | Decimal(6,2) | Bắt buộc | Chiều dài kiện hàng (cm). VD: `20.00` cm |
| `width` | Decimal(6,2) | Bắt buộc | Chiều rộng kiện hàng (cm). VD: `15.00` cm |
| `height` | Decimal(6,2) | Bắt buộc | Chiều cao kiện hàng (cm). VD: `10.00` cm |
| `volume` | Decimal(10,4)| Bắt buộc | Thể tích quy đổi (m³). VD: `0.0030` m³ |
| `is_fragile` | Boolean | Default False | Cảnh báo hàng dễ vỡ (`true` / `false`) |
| `temperature_requirement`| VarChar(50)| Tùy chọn | Yêu cầu nhiệt độ bảo quản. VD: `2-8 °C`, `Đông lạnh (-18°C)` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |
| `updated_at` | Timestamptz | UpdatedAt | Mốc thời gian cập nhật thông tin gần nhất |

---

### 16. Bảng `order_payments` (Thanh toán Thực tế & COD)
📌 **Chức năng của bảng:** Quản lý tài chính thanh toán chính thức của đơn hàng. Lưu cước vận chuyển chốt cuối cùng, số tiền thu hộ COD chốt cuối cùng, người chịu phí (`SENDER` / `RECEIVER`), hình thức thanh toán (`CASH`, `BANK_TRANSFER`, `E_WALLET`, `COD`) và trạng thái thanh toán.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã giao dịch thanh toán. VD: `op-01` |
| `order_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng orders)** | Gắn duy nhất 1-1 với đơn hàng (Trỏ `orders.id`). VD: `ord-01` |
| `final_shipping_fee`| Decimal(12,2)| Bắt buộc | Cước vận chuyển cuối cùng thực tế. VD: `25000.00` VNĐ |
| `final_cod_amount` | Decimal(12,2)| Bắt buộc | Số tiền thu hộ COD chốt thực tế. VD: `500000.00` VNĐ |
| `fee_payer` | Enum | Bắt buộc | Người trả cước: `SENDER` (Người gửi trả), `RECEIVER` (Người nhận trả) |
| `payment_method` | Enum | Bắt buộc | Hình thức: `CASH` (Tiền mặt), `BANK_TRANSFER`, `E_WALLET`, `COD` |
| `payment_status` | Enum | Default Unpaid | Trạng thái thanh toán: `UNPAID` (Chưa thanh toán), `PAID` (Đã thanh toán), `REFUNDED` |
| `final_insurance_fee` | Decimal(12,2) | Bắt buộc | Phí bảo hiểm chính thức (VNĐ) |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |
| `updated_at` | Timestamptz | UpdatedAt | Mốc thời gian cập nhật thông tin gần nhất |

---

### 17. Bảng `order_status_history` (Nhật ký Lịch sử Thay đổi Trạng thái Đơn hàng)
📌 **Chức năng của bảng:** Ghi vết (Audit trail) toàn bộ lịch sử biến động trạng thái của đơn hàng từ khi tạo mới đến khi giao thành công hoặc hủy đơn. Ghi rõ thời điểm chuyển trạng thái, người thực hiện chuyển và nguồn tác động (`SYSTEM`, `CUSTOMER`, `DRIVER`, `ADMIN`, `API`).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi lịch sử. VD: `osh-01` |
| `order_id` | Uuid | **Khóa ngoại (FK ➔ bảng orders)** | Thuộc đơn hàng nào (Trỏ `orders.id`). VD: `ord-01` |
| `changed_by_user_id`| Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người thực hiện chuyển trạng thái (User ID). VD: `usr-01` |
| `status` | Enum | Bắt buộc | Trạng thái chuyển đến. VD: `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY` |
| `change_source` | Enum | Bắt buộc | Nguồn tác động: `SYSTEM`, `CUSTOMER`, `DRIVER`, `ADMIN`, `API` |
| `reason` | Text | Tùy chọn | Lý do chuyển trạng thái. VD: `Khách hàng khởi tạo đơn hàng mới` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

## 🚚 MODULE 5: SHIPMENT MANAGEMENT (Quản lý Vận đơn & Trung chuyển)

### 18. Bảng `shipments` (Vận đơn / Chuyến gom hàng)
📌 **Chức năng của bảng:** Quản lý các Vận đơn (Shipment) đại diện cho các chuyến gom hàng di chuyển giữa các bưu cục (chặng trung chuyển) hoặc chuyến hàng do Shipper đi giao (chặng cuối). Lưu bưu cục xuất phát (`origin_facility_id`), bưu cục đích (`destination_facility_id`) và mã lộ trình AI gắn kèm.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã vận đơn duy nhất. VD: `spm-01`, `spm-02` |
| `shipment_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã tracking vận đơn công khai. VD: `SPM-20260724-9901` |
| `route_id` | Uuid | **Khóa ngoại (FK ➔ bảng routes)** | Thuộc Lộ trình giao hàng nào (Trỏ `routes.id`). VD: `rt-01` |
| `origin_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Kho/Bưu cục xuất phát của vận đơn. VD: `fac-01` |
| `destination_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Kho/Bưu cục đích đến của vận đơn. VD: `fac-01` |
| `created_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Nhân viên khởi tạo vận đơn. VD: `usr-02` |
| `updated_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người cập nhật vận đơn gần nhất |
| `status` | Enum | Bắt buộc | Trạng thái vận đơn: `CREATED`, `ASSIGNED`, `IN_TRANSIT`, `AT_HUB`, `OUT_FOR_DELIVERY`, `DELIVERED`, `DELIVERY_FAILED`, `RETURNING`, `RETURNED`, `CANCELLED` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Thời điểm tạo phiếu vận chuyển |
| `updated_at` | Timestamptz | UpdatedAt | Mốc thời gian cập nhật trạng thái phiếu gần nhất |

---

### 19. Bảng `shipment_packages` (Gom Kiện hàng vào Vận đơn - Bảng trung gian 1:1 Strict Package)
📌 **Chức năng của bảng:** Bảng trung gian gom các kiện hàng vật lý vào vận đơn chuyến xe. Ràng buộc duy nhất `package_id UNIQUE` đảm bảo tính toàn vẹn nghiệp vụ: một kiện hàng chỉ nằm trên duy nhất 1 vận đơn chuyến xe active tại một thời điểm.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi gom hàng. VD: `spkg-01` |
| `shipment_id` | Uuid | **Cặp khóa duy nhất [shipment_id, package_id]**, **FK ➔ bảng shipments** | Mã Vận đơn gom hàng (Trỏ `shipments.id`). VD: `spm-01` |
| `package_id` | Uuid | **Khóa ngoại duy nhất (FK, Unique ➔ bảng packages)** | Kiện hàng duy nhất (Ràng buộc Unique đảm bảo 1 Kiện không nằm 2 Vận đơn cùng lúc). VD: `pkg-01` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 20. Bảng `shipment_events` (Sự kiện Nhật ký Vận đơn)
📌 **Chức năng của bảng:** Ghi vết hành trình chi tiết của vận đơn khi di chuyển qua các mốc quan trọng (Xuất kho departure, Đến bưu cục trung gian arrival, Shipper nhận hàng out for delivery, Giao hàng thành công delivery success).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã sự kiện vận đơn. VD: `se-01` |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Thuộc vận đơn nào (Trỏ `shipments.id`). VD: `spm-01` |
| `facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục phát sinh sự kiện. VD: `fac-01` |
| `created_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người ghi nhận sự kiện (User ID). VD: `usr-03` |
| `event_type` | Enum | Bắt buộc | Loại sự kiện: `DRIVER_ASSIGNED`, `DEPARTED_FACILITY`, `ARRIVED_FACILITY`, `DELIVERY_SUCCESS` |
| `event_time` | Timestamptz | Not Null | Thời điểm xảy ra sự kiện. VD: `2026-07-24 09:35:00+07` |
| `latitude` | Double | Tùy chọn | Tọa độ Vĩ độ GPS. VD: `10.7721` |
| `longitude` | Double | Tùy chọn | Tọa độ Kinh độ GPS. VD: `106.6578` |

---

### 21. Bảng `shipment_transfers` (Luân chuyển Hàng giữa các Bưu cục)
📌 **Chức năng của bảng:** Quản lý quy trình giao nhận luân chuyển vận đơn giữa bưu cục gửi (`from_facility_id`) và bưu cục nhận (`to_facility_id`). Theo dõi thời điểm xuất xe (`dispatched_at`), thời điểm xe cập bến kho (`arrived_at`) và nhân viên kho bấm Xác nhận nhập kho (`received_by`).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | PK | Mã giao dịch chuyển giao hàng. VD: `st-01` |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Vận đơn luân chuyển (Trỏ `shipments.id`). VD: `spm-01` |
| `from_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục gửi hàng đi. VD: `fac-01` |
| `to_facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục tiếp nhận hàng. VD: `fac-03` |
| `received_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Nhân viên nhận bàn giao hàng tại kho đích. VD: `usr-02` |
| `status` | Enum | Bắt buộc | Trạng thái luân chuyển: `PENDING`, `IN_TRANSIT`, `ARRIVED` (Đã nhận kho), `REJECTED` |
| `dispatched_at` | Timestamptz | Tùy chọn | Thời điểm xe xuất phát rời bưu cục gửi. VD: `2026-07-24 09:35:00+07` |
| `arrived_at` | Timestamptz | Tùy chọn | Thời điểm xe cập bến bưu cục nhận. VD: `2026-07-24 11:20:00+07` |

---

## 🏎️ MODULE 6: FLEET & DRIVER MANAGEMENT (Đội xe & Nhân sự Vận hành)

### 22. Bảng `staff` (Hồ sơ Hợp nhất Nhân viên & Tài xế - Clean Architecture PII Profile)
📌 **Chức năng của bảng:** Bảng hợp nhất lưu trữ toàn bộ hồ sơ nhân sự vận hành trong công ty (Quản trị viên, Nhân viên điều phối, Thủ kho, Tài xế giao hàng). Bảng lưu trữ trực tiếp thông tin PII liên lạc (`full_name`, `phone`, `email`, `citizen_id`) và bưu cục công tác (`assigned_facility_id`). Đối với tài xế giao hàng (`position == 'DRIVER'`), bảng bổ sung các trường thông tin bằng lái, hạng xe, loại tài xế và trạng thái ca làm việc. Liên kết 1-1 với tài khoản `users` qua `user_id UNIQUE`.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã hồ sơ nhân sự duy nhất. VD: `stf-01`, `stf-02` |
| `user_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng users)** | Khóa ngoại 1-1 trỏ bảng `users` (Tài khoản đăng nhập). VD: `usr-02`, `usr-03` |
| `employee_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã nhân viên/tài xế duy nhất. VD: `STF-000001`, `DRV-000001` |
| `full_name` | VarChar(150) | Bắt buộc | Họ và tên nhân sự/tài xế. VD: `Nguyễn Văn Giao`, `Trần Văn Kho` |
| `phone` | VarChar(20) | Bắt buộc | Số điện thoại liên lạc công việc. VD: `0900000003` |
| `email` | VarChar(255) | Tùy chọn | Email nội bộ/liên hệ công việc. VD: `driver@velocity.vn` |
| `citizen_id` | VarChar(20) | Khóa duy nhất (Unique), Tùy chọn| Số Căn cước công dân. VD: `079098001234` |
| `position` | VarChar(100)| Bắt buộc | Chức vụ: `ADMIN`, `DRIVER`... |
| `assigned_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục công tác/trực thuộc quản lý. VD: `fac-01` |
| `driver_license_number`| VarChar(50)| Khóa duy nhất (Unique), Tùy chọn| Số bằng lái xe GPLX (Chỉ dùng cho Driver). VD: `59012938102` |
| `driver_license_class` | VarChar(10)| Tùy chọn | Hạng bằng lái xe GPLX (Chỉ dùng cho Driver). VD: `A1`, `B2`, `C`, `FC` |
| `driver_type` | Enum | Tùy chọn | Loại tài xế: `HUB_DELIVERY`, `ON_DEMAND` |
| `employment_status` | Enum | Tùy chọn (Default Active) | Trạng thái công tác: `ACTIVE` (Đang làm), `ON_LEAVE` (Nghỉ phép), `TERMINATED`, `DISABLED` (Vô hiệu hóa/Ẩn) |
| `hire_date` | Date | Tùy chọn | Ngày chính thức tuyển dụng. VD: `2025-01-15` |
| `preferred_latitude` | Double | Tùy chọn | Vĩ độ khu vực ưu tiên nhận đơn giao |
| `preferred_longitude`| Double | Tùy chọn | Kinh độ khu vực ưu tiên nhận đơn giao |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian tạo hồ sơ |

---

### 23. Bảng `vehicles` (Danh mục Phương tiện Giao hàng)
📌 **Chức năng của bảng:** Quản lý danh sách các phương tiện di chuyển trong đội xe (Xe máy, Xe tải nhẹ, Xe Van). Quản lý biển số xe, tải trọng tối đa (Kg), thể tích thùng xe (m³), chiều dài thùng xe (`max_length`), cờ hỗ trợ xe lạnh (`refrigeration_supported`), mã định danh thiết bị GPS (`gps_device_id`), bưu cục đậu xe và trạng thái vận hành.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã phương tiện. VD: `veh-01`, `veh-02` |
| `vehicle_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã xe quản lý. VD: `XE-TRUCK-01`, `XE-BIKE-02` |
| `license_plate` | VarChar(20) | Khóa duy nhất (Unique), Bắt buộc | Biển số xe đăng ký. VD: `59-P1 999.88` |
| `vehicle_type_id` | Uuid | **Khóa ngoại (FK ➔ bảng vehicle_types)**| Loại xe (Xe tải, Xe máy... Trỏ `vehicle_types.id`). VD: `vtype-01` |
| `home_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục đậu/quản lý xe. VD: `fac-01` |
| `max_weight` | Decimal(10,2)| Bắt buộc | Tải trọng tối đa (Kg). VD: `1500.00` Kg |
| `max_volume` | Decimal(10,4)| Bắt buộc | Thể tích thùng xe tối đa (m³). VD: `12.5000` m³ |
| `max_length` | Decimal(6,2) | Tùy chọn | Chiều dài lòng thùng xe (m). VD: `3.50` m |
| `refrigeration_supported` | Boolean | Default False | Cờ hỗ trợ vận chuyển thùng hàng đông lạnh (`true` / `false`) |
| `gps_device_id` | VarChar(100) | Tùy chọn | Mã định danh thiết bị GPS phần cứng gắn trên xe. VD: `GPS-DEV-88` |
| `operating_status`| Enum | Bắt buộc | Trạng thái: `ACTIVE`, `MAINTENANCE` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 24. Bảng `vehicle_types` (Loại Phương tiện)
📌 **Chức năng của bảng:** Định nghĩa chủng loại phương tiện (Xe máy `MOTORBIKE`, Xe tải Van 500Kg `VAN_500KG`, Xe tải 1.5 Tấn `TRUCK_1.5TON`) làm căn cứ để thuật toán AI Routing phân bổ tuyến đường phù hợp với kích thước kiện hàng.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã loại phương tiện. VD: `vtype-01` |
| `type_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã loại xe: `MOTORBIKE`, `VAN_500KG`, `TRUCK_1.5TON` |
| `type_name` | VarChar(100) | Bắt buộc | Tên hiển thị loại xe. VD: `Xe tải nhẹ 1.5 Tấn` |
| `max_default_weight` | Decimal(10,2) | Bắt buộc | Tải trọng tiêu chuẩn xe (kg) |
| `description` | Text | Tùy chọn | Mô tả chi tiết |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 25. Bảng `driver_vehicle_assignments` (Phân công Xe cho Tài xế)
📌 **Chức năng của bảng:** Quản lý lịch sử và trạng thái phân công xe cho tài xế sử dụng theo từng ca làm việc. Đảm bảo tại một thời điểm biết chính xác tài xế nào đang điều khiển phương tiện nào.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lượt phân công xe. VD: `dva-01` |
| `driver_id` | Uuid | **Khóa ngoại (FK ➔ bảng staff)** | Tài xế được gán xe (Trỏ `staff.id`). VD: `stf-01` |
| `vehicle_id` | Uuid | **Khóa ngoại (FK ➔ bảng vehicles)**| Phương tiện được gán (Trỏ `vehicles.id`). VD: `veh-01` |
| `assigned_from` | Timestamptz | Bắt buộc | Thời điểm bắt đầu giao xe. VD: `2026-07-24 06:00:00+07` |
| `assigned_to` | Timestamptz | Tùy chọn | Thời điểm trả xe |
| `is_active` | Boolean | Default True | Đánh dấu phân công đang có hiệu lực (`true` / `false`) |

---

### 26. Bảng `driver_locations` (Tọa độ GPS Thời gian thực hiện tại của Shipper)
📌 **Chức năng của bảng:** Lưu trữ vị trí tọa độ GPS mới nhất (`latitude`, `longitude`), góc hướng di chuyển (`heading`) và vận tốc thực tế (`speed`) của từng tài xế. Bảng này được ứng dụng Mobile Shipper cập nhật liên tục ngầm (3-5 giây/lượt) để hiển thị vị trí Shipper thời gian thực trên bản đồ Web Admin.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `driver_id` | Uuid | **Khóa chính (PK)**, **FK ➔ bảng staff** | Mã tài xế (Mỗi tài xế giữ 1 bản ghi vị trí hiện tại). VD: `stf-01` |
| `latitude` | Double | Bắt buộc | Vĩ độ phát ngầm thời gian thực qua WebSocket. VD: `10.7735` |
| `longitude` | Double | Bắt buộc | Kinh độ phát ngầm thời gian thực qua WebSocket. VD: `106.6590` |
| `heading` | Float | Tùy chọn | Góc hướng di chuyển của xe (độ). VD: `180.0`° |
| `speed` | Float | Tùy chọn | Vận tốc di chuyển thực tế (m/s). VD: `25.5` m/s |
| `accuracy` | Float | Tùy chọn | Độ chính xác bán kính định vị GPS (m). VD: `3.0` m |
| `recorded_at` | Timestamptz | Bắt buộc | Mốc thời gian thiết bị phát tọa độ gần nhất. VD: `2026-07-24 09:40:00+07` |

---

## 🗺️ MODULE 7: ROUTING & DISPATCH ENGINE (Điều vận & Thuật toán AI)

### 28. Bảng `routes` (Tuyến đường Lộ trình tối ưu bởi AI)
📌 **Chức năng của bảng:** Lưu trữ các tuyến đường lộ trình tối ưu được sinh ra bởi thuật toán AI (K-Means + Genetic Algorithm). Quản lý tổng quãng đường dự kiến (Km), tổng thời gian dự kiến (phút), bưu cục xuất phát, bưu cục kết thúc và liên kết với tài xế/xe được gán.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lộ trình tối ưu. VD: `rt-01`, `rt-02` |
| `route_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã tuyến đường. VD: `RT-20260724-001` |
| `driver_vehicle_assignment_id`| Uuid | **Khóa ngoại (FK ➔ bảng driver_vehicle_assignments)**| Phân công Shipper+Xe (Nullable cho phép AI sinh Route trước). VD: `dva-01` |
| `driver_id` | Uuid | **Khóa ngoại (FK ➔ bảng drivers)** | Tài xế được gán chính. VD: `drv-01` |
| `vehicle_id` | Uuid | **Khóa ngoại (FK ➔ bảng vehicles)** | Phương tiện xe được gán chính. VD: `veh-01` |
| `start_facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục điểm xuất phát tuyến. VD: `fac-01` |
| `end_facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục điểm kết thúc tuyến. VD: `fac-01` |
| `optimization_id` | Uuid | **Khóa ngoại (FK ➔ bảng route_optimizations)** | Kết nối lượt chạy tối ưu AI. VD: `ro-01` |
| `planned_distance_km` | Decimal(10,2)| Default 0 | Tổng quãng đường AI tính toán tối ưu (Km). VD: `14.85` Km |
| `planned_duration_min`| Int | Default 0 | Tổng thời gian AI ước tính hoàn thành (Phút). VD: `125` Phút |
| `status` | Enum | Default Planned | Trạng thái tuyến: `PLANNED` (AI vừa tính xong), `ASSIGNED`, `IN_PROGRESS`, `COMPLETED` |
| `actual_distance_km` | Decimal(10,2) | Tùy chọn | Khoảng cách di chuyển thực tế (km) |
| `actual_duration_min` | Integer | Tùy chọn | Thời gian di chuyển thực tế (phút) |
| `total_stops` | Integer | Default 0 | Tổng số điểm dừng trên lộ trình AI |
| `planned_start_at` | Timestamptz | Bắt buộc | Lịch trình xuất phát dự kiến |
| `actual_start_at` | Timestamptz | Tùy chọn | Thời điểm thực tế xe xuất phát |
| `completed_at` | Timestamptz | Tùy chọn | Thời điểm thực tế xe hoàn thành |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |
| `updated_at` | Timestamptz | UpdatedAt | Mốc thời gian cập nhật thông tin gần nhất |

---

### 29. Bảng `route_stops` (Chi tiết Các điểm dừng trên Lộ trình)
📌 **Chức năng của bảng:** Lưu trữ danh sách thứ tự các điểm dừng cần ghé thăm trên tuyến đường do AI sắp xếp (`sequence` 1, 2, 3...). Phân loại rõ điểm dừng Lấy hàng tại nhà khách `PICKUP`, điểm dừng bưu cục trung chuyển `HUB`, hay điểm dừng Giao hàng cho người nhận `DELIVERY`.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã điểm dừng. VD: `rs-01`, `rs-02` |
| `route_id` | Uuid | **Cặp khóa duy nhất [route_id, sequence]**, **FK ➔ bảng routes** | Thuộc Lộ trình nào (Trỏ `routes.id`). VD: `rt-01` |
| `sequence` | Int | **Cặp khóa duy nhất [route_id, sequence]**, Bắt buộc | Thứ tự ghé thăm tối ưu (1, 2, 3...) |
| `order_id` | Uuid | **Khóa ngoại (FK ➔ bảng orders)** | Đơn hàng cần lấy (Dùng cho điểm dừng Pickup Lấy hàng tại nhà). VD: `ord-01` |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Vận đơn cần giao (Dùng cho điểm dừng Delivery Giao hàng). VD: `spm-01` |
| `facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục ghé trung chuyển (Dùng cho điểm dừng Hub) |
| `stop_type` | Enum | Bắt buộc | Loại điểm dừng: `PICKUP` (Lấy hàng), `HUB` (Bưu cục), `DELIVERY` (Giao hàng) |
| `latitude` / `longitude`| Double | Bắt buộc | Tọa độ GPS của điểm dừng. VD: `10.7721` / `106.6578` |
| `status` | Enum | Default Pending | Trạng thái dừng: `PENDING` (Chờ ghé), `ARRIVED` (Đã đến), `DEPARTED`, `SKIPPED`, `FAILED` |
| `address_snapshot` | Text | Bắt buộc | Địa chỉ điểm dừng đóng băng snapshot |
| `latitude` | Double | Tùy chọn | Tọa độ Vĩ độ GPS. VD: `10.7721` |
| `longitude` | Double | Tùy chọn | Tọa độ Kinh độ GPS. VD: `106.6578` |
| `planned_arrival_at` | Timestamptz | Tùy chọn | Thời gian dự kiến đến stop |
| `actual_arrival_at` | Timestamptz | Tùy chọn | Thời gian thực tế đến stop |
| `planned_departure_at` | Timestamptz | Tùy chọn | Thời gian dự kiến rời stop |
| `actual_departure_at` | Timestamptz | Tùy chọn | Thời gian thực tế rời stop |

---

### 30. Bảng `dispatch_tasks` (Nhiệm vụ Điều vận Phân công ca Shipper)
📌 **Chức năng của bảng:** Quản lý công việc phân công tuyến đường cho tài xế. Lưu vết Nhân viên điều vận phân công (`assigned_by`), Tài xế nhận ca (`assigned_to`), trạng thái ca (`PENDING`, `ACCEPTED`, `REJECTED`) và ghi nhận **lý do từ chối ca `rejection_reason`** nếu Shipper bấm Từ chối.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã nhiệm vụ điều vận. VD: `dt-01` |
| `task_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã task điều vận. VD: `TSK-20260724-88` |
| `route_id` | Uuid | **Khóa ngoại (FK ➔ bảng routes)** | Lộ trình được gán (Trỏ `routes.id`). VD: `rt-01` |
| `assigned_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Staff/Admin thực hiện giao ca. VD: `usr-02` |
| `assigned_to` | Uuid | **Khóa ngoại (FK ➔ bảng drivers)** | Shipper được giao nhận ca. VD: `drv-01` |
| `status` | Enum | Default Pending | Trạng thái ca: `PENDING` (Chờ nhận), `ACCEPTED` (Đã nhận ca), `REJECTED` (Từ chối) |
| `rejection_reason` | Text | Tùy chọn | Lý do Shipper từ chối nhận ca. VD: `Xe bị thủng lốp trên đường đi ca` |
| `task_type` | Enum | Bắt buộc | Loại nhiệm vụ điều phối |
| `priority` | Integer | Default 1 | Mức ưu tiên nhiệm vụ (1: Thường, 5: Gấp) |
| `note` | Text | Tùy chọn | Ghi chú điều phối / Check-in |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |
| `completed_at` | Timestamptz | Tùy chọn | Thời điểm thực tế xe hoàn thành |

---

### 31. Bảng `route_location_logs` (Nhật ký GPS Tọa độ Vệt đường chạy)
📌 **Chức năng của bảng:** Ghi vết chi tiết toàn bộ chuỗi tọa độ vệt đường chạy GPS thực tế của tài xế khi thực hiện lộ trình. Phục vụ việc xem lại hành trình di chuyển (Replay Route) và so sánh tuyến đường thực tế di chuyển với tuyến đường AI gợi ý.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi GPS vệt đường. VD: `rll-01` |
| `route_id` | Uuid | **Khóa ngoại (FK ➔ bảng routes)** | Thuộc Lộ trình đang chạy. VD: `rt-01` |
| `latitude` / `longitude`| Double | Bắt buộc | Tọa độ GPS ghi nhận thực tế trên đường. VD: `10.7728` / `106.6582` |
| `speed_mps` | Decimal(5,2) | Tùy chọn | Vận tốc di chuyển tính bằng m/s. VD: `8.50` m/s |
| `heading_degrees` | Decimal(5,2) | Tùy chọn | Góc hướng di chuyển độ. VD: `90.00`° |
| `recorded_at` | Timestamptz | Default Now | Thời điểm thiết bị lưu vết tọa độ. VD: `2026-07-24 08:15:00+07` |
| `latitude` | Double | Tùy chọn | Tọa độ Vĩ độ GPS. VD: `10.7721` |
| `longitude` | Double | Tùy chọn | Tọa độ Kinh độ GPS. VD: `106.6578` |
| `accuracy_meters` | Decimal(5,2) | Tùy chọn | Độ chính xác GPS (m) |

---

### 32. Bảng `route_optimizations` (Nhật ký Thuật toán AI Routing)
📌 **Chức năng của bảng:** Nhật ký đánh giá hiệu năng thuật toán AI. Lưu vết mỗi lượt kích hoạt AI, số lượng đơn đầu vào, số lượng tuyến đầu ra, tổng quãng đường tối ưu, thời gian AI thực thi (ms), điểm số thích nghi GA (`fitness_score`) và **Snapshot toàn bộ cấu hình AI đã dùng `parameters_json`** (bán kính K-Means, population size, mutation rate).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lượt chạy tối ưu AI. VD: `ro-01` |
| `algorithm_name` | VarChar(50) | Bắt buộc | Thuật toán áp dụng: `K-Means + Genetic Algorithm (GA)` |
| `parameters_json` | Json | Tùy chọn | **Snapshot cấu hình AI đã dùng**: `{"kmeans_radius_km": 5, "ga_pop_size": 100, "max_gen": 500, "mutation_rate": 0.05}` |
| `input_shipment_count`| Int | Bắt buộc | Số lượng đơn/vận đơn đầu vào cần phân tuyến. VD: `45` đơn |
| `output_route_count` | Int | Bắt buộc | Số lượng Tuyến đường tối ưu sinh ra. VD: `3` tuyến |
| `execution_time_ms` | Int | Bắt buộc | Thời gian thuật toán chạy xong (Milisecond). VD: `850` ms |
| `fitness_score` | Decimal(8,4) | Tùy chọn | Điểm số thích nghi tối ưu (Fitness score GA). VD: `0.9850` |
| `algorithm_version` | VarChar(20) | Tùy chọn | Phiên bản thuật toán AI |
| `total_distance_km` | Decimal(10,2) | Bắt buộc | Tổng khoảng cách tuyến (km) |
| `estimated_duration_min` | Integer | Bắt buộc | Tổng thời gian tuyến (phút) |
| `optimization_status` | Enum | Bắt buộc | Trạng thái tối ưu AI |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 33. Bảng `route_adjustment_logs` (Nhật ký Xử lý Sự cố Điều chỉnh Thủ công Lộ trình)
📌 **Chức năng của bảng:** Bảng Audit Log ghi vết xử lý sự cố lộ trình. Khi có sự cố trên đường (Shipper hỏng xe, tai nạn, hết thời gian ca), Staff/Admin thực hiện điều chỉnh thủ công (đổi tài xế mid-trip, hủy tuyến, chèn điểm dừng) thì toàn bộ thông tin ai điều chỉnh, thời gian và lý do đều được lưu lại tại bảng này.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lượt xử lý sự cố. VD: `ral-01` |
| `route_id` | Uuid | **Khóa ngoại (FK ➔ bảng routes)** | Lộ trình bị can thiệp (Trỏ `routes.id`). VD: `rt-01` |
| `adjusted_by_user_id`| Uuid | **Khóa ngoại (FK ➔ bảng users)** | Staff/Admin thực hiện can thiệp thủ công. VD: `usr-02` |
| `old_driver_id` | Uuid | **Khóa ngoại (FK ➔ bảng drivers)** | Tài xế cũ bị hủy ca/thay thế. VD: `drv-01` |
| `new_driver_id` | Uuid | **Khóa ngoại (FK ➔ bảng drivers)** | Tài xế mới được điều động thay thế. VD: `drv-02` |
| `adjustment_type` | VarChar(50) | Bắt buộc | Loại can thiệp: `REASSIGN_DRIVER` (Đổi tài xế), `MODIFY_STOPS`, `CANCEL_ROUTE` |
| `reason` | Text | Bắt buộc | Lý do sự cố: `Tài xế hỏng xe giữa đường tại ngã tư Hàng Xanh` |
| `adjusted_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian can thiệp điều chỉnh tuyến |

---

## 📸 MODULE 8: TRACKING, SCAN & POD (Giám sát & Bằng chứng Giao hàng)

### 34. Bảng `delivery_proofs` (Bằng chứng Giao hàng - POD & COD Thực thu)
📌 **Chức năng của bảng:** Quản lý chứng từ bằng chứng giao hàng (POD). Lưu vết loại bằng chứng (`PHOTO` chụp ảnh, `SIGNATURE` ký tên, `OTP`), kết quả giao (`SUCCESS`, `FAILED`), lý do thất bại và **Số tiền COD thực tế tài xế đã thu tại chỗ `actual_cod_collected`**. Bảng này cho phép lưu nhiều chứng từ giao lại khi các lượt đầu bị thất bại.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã chứng từ giao hàng. VD: `dp-01` |
| `route_stop_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng route_stops)**| Điểm dừng duy nhất phát sinh chứng từ này (Trỏ `route_stops.id`). VD: `rs-01` |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Vận đơn được giao (Không Unique để hỗ trợ lưu nhiều chứng từ giao lại khi thất bại). VD: `spm-01` |
| `proof_type` | Enum | Bắt buộc | Dạng bằng chứng: `PHOTO` (Chụp ảnh), `SIGNATURE` (Ký tên), `OTP` |
| `delivery_result` | Enum | Bắt buộc | Kết quả: `SUCCESS` (Thành công), `FAILED` (Thất bại), `PARTIAL` |
| `actual_cod_collected`| Decimal(12,2)| Tùy chọn | **Số tiền mặt COD thực tế Shipper đã thu tại chỗ** đối soát tài chính. VD: `500000.00` VNĐ |
| `failure_reason` | Enum | Tùy chọn | Lý do thất bại: `RECIPIENT_UNAVAILABLE` (Khách không bắt máy), `INCORRECT_ADDRESS` |
| `receiver_name` | VarChar(150) | Tùy chọn | Họ tên người nhận bàn giao POD |
| `receiver_phone` | VarChar(20) | Tùy chọn | Số điện thoại người nhận bàn giao POD |
| `verified_latitude` | Double | Tùy chọn | Vĩ độ GPS xác minh giao hàng |
| `verified_longitude` | Double | Tùy chọn | Kinh độ GPS xác minh giao hàng |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

### 35. Bảng `barcode_scans` (Nhật ký Quét mã vạch kiểm hàng)
📌 **Chức năng của bảng:** Quản lý nhật ký quét mã vạch Barcode/QR Code của kiện hàng tại từng công đoạn trong kho và trên đường di chuyển (Nhập kho `INBOUND`, Phân loại chia chọn `SORTING`, Xuất kho `OUTBOUND`, Giao hàng `DELIVERY`). Lưu vết ai quét, thời gian quét và vị trí bưu cục quét mã.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lượt quét barcode. VD: `bs-01` |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Vận đơn được quét mã. VD: `spm-01` |
| `package_id` | Uuid | **Khóa ngoại (FK ➔ bảng packages)** | Kiện hàng được quét mã. VD: `pkg-01` |
| `route_stop_id` | Uuid | **Khóa ngoại (FK ➔ bảng route_stops)** | Điểm dừng phát sinh quét mã. VD: `rs-01` |
| `facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Kho/Bưu cục phát sinh quét mã. VD: `fac-01` |
| `scanned_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người thực hiện quét mã (User ID). VD: `usr-03` |
| `barcode_value` | VarChar(100) | Bắt buộc | Giá trị chuỗi mã vạch vừa quét. VD: `PKG-8891-01` |
| `scan_type` | Enum | Bắt buộc | Tác vụ quét: `INBOUND` (Nhập kho), `OUTBOUND` (Xuất kho), `SORTING`, `DELIVERY` |
| `latitude` | Double | Tùy chọn | Tọa độ Vĩ độ GPS. VD: `10.7721` |
| `longitude` | Double | Tùy chọn | Tọa độ Kinh độ GPS. VD: `106.6578` |
| `scanned_at` | Timestamptz | Bắt buộc (Default Now) | Thời điểm quét barcode |

---

### 36. Bảng `driver_check_ins` (Nhật ký Check-in Điểm dừng của Shipper)
📌 **Chức năng của bảng:** Ghi nhận chính xác mốc thời gian và vị trí tọa độ GPS khi Shipper bấm nút "Đã đến điểm dừng" (Check-in) và "Đã rời điểm dừng" (Check-out) trên ứng dụng Mobile. Phục vụ việc kiểm soát thời gian dừng đỗ thực tế tại nhà khách hàng.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi check-in. VD: `dci-01` |
| `route_stop_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng route_stops)**| Gắn duy nhất với điểm dừng. VD: `rs-01` |
| `driver_id` | Uuid | **Khóa ngoại (FK ➔ bảng drivers)** | Shipper thực hiện check-in (Trỏ `drivers.id`). VD: `drv-01` |
| `check_in_at` | Timestamptz | Default Now | Mốc thời gian bấm Check-in trên App. VD: `2026-07-24 09:40:00+07` |
| `check_out_at` | Timestamptz | Tùy chọn | Mốc thời gian bấm Check-out xong điểm dừng. VD: `2026-07-24 09:45:00+07` |
| `latitude` | Double | Bắt buộc | Vĩ độ định vị GPS thiết bị tại thời điểm Check-in. VD: `10.7735` |
| `longitude` | Double | Bắt buộc | Kinh độ định vị GPS thiết bị tại thời điểm Check-in. VD: `106.6590` |
| `note` | Text | Tùy chọn | Ghi chú điều phối / Check-in |

---

### 37. Bảng `tracking_attachments` (Tệp đính kèm Chứng từ POD - Ảnh/Chữ ký)
📌 **Chức năng của bảng:** Quản lý danh sách các tệp hình ảnh thực tế (ảnh chụp kiện hàng tại cửa nhà khách, hình ảnh chữ ký điện tử của người nhận) liên kết với chứng từ giao hàng `delivery_proofs`. Lưu trữ đường dẫn `object_key` trên hệ thống Cloud/Amazon S3.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã file đính kèm. VD: `ta-01` |
| `delivery_proof_id`| Uuid | **Khóa ngoại (FK ➔ bảng delivery_proofs)**| Thuộc bằng chứng giao hàng nào (Trỏ `delivery_proofs.id`). VD: `dp-01` |
| `file_type` | Enum | Bắt buộc | Loại file: `PHOTO`, `SIGNATURE` |
| `object_key` | VarChar(500)| Bắt buộc | Đường dẫn lưu trữ Cloud/S3. VD: `pod/2026/07/proof_dp01.jpg` |
| `storage_provider` | VarChar(30) | Bắt buộc (Default S3) | Nhà cung cấp Cloud Storage (`S3`/`MinIO`) |
| `mime_type` | VarChar(100) | Bắt buộc | Kiểu định dạng tệp (`image/jpeg`) |
| `file_size_bytes` | BigInt | Tùy chọn | Dung lượng tệp tính bằng Bytes |
| `uploaded_at` | Timestamptz | Bắt buộc (Default Now) | Thời điểm tải tệp đính kèm lên |

---

### 38. Bảng `tracking_events` (Nhật ký Sự kiện Tracking Vận đơn Công khai)
📌 **Chức năng của bảng:** Lưu trữ dòng thời gian (Timeline) các sự kiện tracking vận đơn công khai cho Khách hàng & Người dùng tra cứu hành trình trực quan trên Web/Mobile (`PICKED_UP` - Đã lấy hàng, `ARRIVED_HUB` - Đến bưu cục, `DEPARTED_HUB` - Rời bưu cục, `OUT_FOR_DELIVERY` - Đang giao, `DELIVERED` - Giao thành công, `FAILED` - Giao thất bại, `RETURNED` - Hoàn hàng, `CANCELLED` - Đã hủy).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã định danh sự kiện tracking. VD: `te-01` |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Thuộc Vận đơn nào (Trỏ `shipments.id`). VD: `spm-01` |
| `route_stop_id` | Uuid | **Khóa ngoại (FK ➔ bảng route_stops)** | Phát sinh từ điểm dừng nào (nếu có). VD: `rs-01` |
| `event_type` | Enum | Bắt buộc | Loại sự kiện: `DELIVERED`, `CANCELLED`... |
| `event_source` | Enum | Default 'SYSTEM' | Nguồn tạo: `SYSTEM`, `DRIVER_APP` |
| `description` | Text | Bắt buộc | Mô tả chi tiết hành trình. VD: `Đơn hàng đã được giao thành công cho người nhận` |
| `latitude` / `longitude` | Double | Tùy chọn | Tọa độ GPS phát sinh sự kiện. VD: `10.7740` / `106.7030` |
| `created_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người dùng/Nhân viên ghi nhận sự kiện. VD: `usr-03` |
| `occurred_at` | Timestamptz | Bắt buộc | Thời điểm thực tế xảy ra sự kiện. VD: `2026-07-24 09:45:00+07` |
| `created_at` | Timestamptz | Default Now | Thời điểm ghi nhận vào CSDL |
| `latitude` | Double | Tùy chọn | Tọa độ Vĩ độ GPS. VD: `10.7721` |
| `longitude` | Double | Tùy chọn | Tọa độ Kinh độ GPS. VD: `106.6578` |

---

## ⚙️ MODULE 9: SYSTEM CONFIGURATION (Cấu hình Tham số AI & Hệ thống)

### 39. Bảng `system_settings` (Tham số Siêu cấu hình AI / GPS)
📌 **Chức năng của bảng:** Lưu trữ tất cả các tham số siêu cấu hình vận hành hệ thống và thuật toán AI (bán kính phân cụm K-Means `kmeans_cluster_radius_km`, kích thước quần thể `ga_population_size`, số thế hệ tối đa `ga_max_generations`, tỷ lệ đột biến `ga_mutation_rate`, chu kỳ phát GPS `gps_sync_interval_sec`). Cho phép Admin điều chỉnh tham số AI linh hoạt trên giao diện Web mà không cần khởi động lại Server.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã tham số cấu hình. VD: `ss-01` |
| `setting_key` | VarChar(100) | Khóa duy nhất (Unique), Bắt buộc | Cụm từ khóa cấu hình. VD: `ga_population_size` |
| `setting_value` | Text | Bắt buộc | Giá trị cấu hình lưu giữ. VD: `"100"` |
| `value_type` | Enum | Bắt buộc | Kiểu dữ liệu: `STRING`, `INTEGER` |
| `category` | Enum | Bắt buộc | Phân nhóm: `AI`, `ROUTING` |
| `updated_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Admin thực hiện chỉnh sửa cấu hình gần nhất (Trỏ `users.id`). VD: `usr-01` |
| `description` | Text | Tùy chọn | Mô tả chi tiết |
| `is_editable` | Boolean | Bắt buộc (Default True) | Cờ cho phép chỉnh sửa (`true`/`false`) |
| `is_active` | Boolean | Bắt buộc (Default True) | Trạng thái kích hoạt (`true`/`false`) |
| `updated_at` | Timestamptz | UpdatedAt | Mốc thời gian cập nhật thông tin gần nhất |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Mốc thời gian khởi tạo bản ghi |

---

## 🗺️ MODULE 10: VIETNAMESE ADMINISTRATIVE UNITS (Đơn vị Hành chính Việt Nam)

### 40. Bảng `administrative_regions` (Vùng Địa lý Hành chính)
📌 **Chức năng của bảng:** Quản lý danh mục các vùng kinh tế - địa lý hành chính Việt Nam (Đông Nam Bộ, Đồng Bằng Sông Hồng, Tây Nguyên...) phục vụ phân vùng kinh doanh và báo cáo quy hoạch.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Integer | **Khóa chính (PK)** | Mã định danh vùng địa lý |
| `name` | VarChar(255) | Bắt buộc | Tên vùng địa lý tiếng Việt. VD: `Đông Nam Bộ` |
| `name_en` | VarChar(255) | Bắt buộc | Tên vùng địa lý tiếng Anh. VD: `Southeast` |
| `code_name` | VarChar(255) | Tùy chọn | Mã CodeName vùng. VD: `dong_nam_bo` |
| `code_name_en` | VarChar(255) | Tùy chọn | Mã CodeName tiếng Anh. VD: `southeast` |

---

### 41. Bảng `administrative_units` (Cấp Đơn vị Hành chính)
📌 **Chức năng của bảng:** Quản lý danh mục cấp hành chính (Thành phố trực thuộc trung ương, Tỉnh, Quận, Huyện, Phường, Xã) chuẩn hóa quốc gia.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Integer | **Khóa chính (PK)** | Mã định danh cấp đơn vị hành chính |
| `full_name` | VarChar(255) | Tùy chọn | Tên tiếng Việt đầy đủ cấp hành chính. VD: `Thành phố` |
| `full_name_en` | VarChar(255) | Tùy chọn | Tên tiếng Anh đầy đủ cấp hành chính. VD: `City` |
| `short_name` | VarChar(255) | Tùy chọn | Tên viết tắt tiếng Việt |
| `short_name_en` | VarChar(255) | Tùy chọn | Tên viết tắt tiếng Anh |
| `code_name` | VarChar(255) | Tùy chọn | Mã CodeName cấp hành chính |
| `code_name_en` | VarChar(255) | Tùy chọn | Mã CodeName tiếng Anh |

---

### 42. Bảng `provinces` (Tỉnh / Thành phố)
📌 **Chức năng của bảng:** Quản lý danh mục mã và tên các Tỉnh / Thành phố trực thuộc Trung ương của Việt Nam (dùng để seed dữ liệu chuẩn địa chính quốc gia).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `code` | VarChar(20) | **Khóa chính (PK)** | Mã tỉnh/thành địa chính. VD: `79` (TP.HCM), `01` (Hà Nội) |
| `name` | VarChar(255) | Bắt buộc | Tên tỉnh thành. VD: `Thành phố Hồ Chí Minh` |
| `full_name` | VarChar(255) | Bắt buộc | Tên đầy đủ địa chính. VD: `Thành phố Hồ Chí Minh` |
| `name_en` | VarChar(255) | Tùy chọn | Tên tiếng Anh địa chính |
| `full_name_en` | VarChar(255) | Tùy chọn | Tên đầy đủ tiếng Anh địa chính |
| `code_name` | VarChar(255) | Tùy chọn | Mã CodeName địa chính |
| `administrative_unit_id` | Integer | Khóa ngoại (FK ➔ bảng administrative_units) | Đơn vị hành chính cấp tỉnh/huyện |

---

### 43. Bảng `wards` (Phường / Xã - Trực thuộc Tỉnh/TP)
📌 **Chức năng của bảng:** Quản lý danh mục các Phường / Xã liên kết trực tiếp với Tỉnh / Thành phố theo mô hình địa chính 2 cấp (Tỉnh/TP ➔ Phường/Xã) phục vụ việc chọn địa chỉ chuyển phát nhanh chóng trên Web và Mobile App.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `code` | VarChar(20) | **Khóa chính (PK)** | Mã phường xã địa chính. VD: `26830` |
| `name` | VarChar(255) | Bắt buộc | Tên phường xã. VD: `Phường 14` |
| `province_code` | VarChar(20) | **Khóa ngoại (FK ➔ bảng provinces)** | Thuộc Tỉnh/TP nào (Trỏ `provinces.code`). VD: `79` |
| `name_en` | VarChar(255) | Tùy chọn | Tên tiếng Anh địa chính |
| `full_name` | VarChar(255) | Tùy chọn | Tên đầy đủ địa chính |
| `full_name_en` | VarChar(255) | Tùy chọn | Tên đầy đủ tiếng Anh địa chính |
| `code_name` | VarChar(255) | Tùy chọn | Mã CodeName địa chính |
| `administrative_unit_id` | Integer | Khóa ngoại (FK ➔ bảng administrative_units) | Đơn vị hành chính cấp tỉnh/huyện |

---

## 💡 KẾT LUẬN

Tài liệu Tự điển CSDL này hiện tại đã có đầy đủ mục **📌 Chức năng của bảng** trên tất cả các bảng dữ liệu, được bổ sung chi tiết về **Khóa chính (PK)**, **Khóa ngoại (FK)**, **Cặp khóa chính (Composite PK)**, **Khóa ngoại 1-1** và đồng bộ 100% với mã nguồn Prisma Schema (`schema.prisma`) và Báo cáo Thẩm định Kiến trúc. 

Bạn có thể sử dụng file tài liệu này để giải trình mượt mà mục đích của từng bảng trước Giảng viên và Hội đồng phản biện!
