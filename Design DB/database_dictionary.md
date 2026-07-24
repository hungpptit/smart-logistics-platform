# 📖 TỰ ĐIỂN CƠ SỞ DỮ LIỆU CHUẨN HÓA (DATABASE DICTIONARY) - SMART LOGISTICS PLATFORM

Tài liệu này tổng hợp toàn bộ các bảng cơ sở dữ liệu được thiết kế theo chuẩn **Clean Architecture & Domain Driven Design**, phân chia theo 10 Phân hệ (Module) phục vụ hệ thống Smart Logistics Platform (SLP). 

Trên mỗi bảng đều được bổ sung mục **📌 Chức năng của bảng** giải thích chi tiết mục đích nghiệp vụ và đóng vai trò gì trong hệ thống, cùng các ghi chú rõ ràng về **Khóa chính (PK)**, **Khóa ngoại (FK)**, **Cặp khóa chính phức hợp (Composite PK)**, **Khóa duy nhất (Unique)** và **Ví dụ thực tế chuẩn hóa** giúp bạn dễ dàng thuyết trình, bảo vệ đồ án trước Giảng viên và Hội đồng phản biện.

---

## 📌 CHÚ THÍCH CÁC KÝ HIỆU RÀNG BUỘC VÀ KHÓA (KEY NOTATION)

* **`Khóa chính (PK)`**: Primary Key - Khóa chính định danh duy nhất của bảng.
* **`Khóa ngoại (FK ➔ bảng X)`**: Foreign Key - Khóa ngoại tham chiếu đến bảng X.
* **`Khóa ngoại 1-1 (FK, Unique ➔ bảng X)`**: Foreign Key Unique - Khóa ngoại liên kết bắt buộc 1-1 với bảng X (Chuẩn Clean Architecture).
* **`Cặp khóa chính (Composite PK)`**: Khóa chính phức hợp kết hợp từ 2 cột trở lên (Ví dụ: Bảng trung gian N:N).
* **`Khóa duy nhất (Unique)`**: Ràng buộc không được trùng lặp dữ liệu.
* **`Bắt buộc (Not Null)`**: Trường dữ liệu bắt buộc phải nhập.
* **`Tùy chọn (Nullable)`**: Trường dữ liệu có thể để trống.

---

## 🔐 MODULE 1: AUTHENTICATION & AUTHORIZATION (Xác thực & Phân quyền)

### 1. Bảng `users` (Tài khoản người dùng - Single Source of Truth)
📌 **Chức năng của bảng:** Lưu trữ tài khoản định danh trung tâm (Single Source of Truth) cho tất cả 4 nhóm Actor trong hệ thống (Admin, Staff, Customer, Shipper). Bảng này quản lý thông tin đăng nhập (`username`, `password_hash`), định danh liên lạc (`email`, `phone`, `full_name`), ảnh đại diện, trạng thái khóa/mở tài khoản và liên kết phân quyền vai trò duy nhất.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã định danh duy nhất của người dùng. VD: `c0a80101-8b43-4f9e-a892-111111111111` |
| `username` | VarChar(50) | Khóa duy nhất (Unique), Bắt buộc | Tên đăng nhập tài khoản. VD: `hung_admin`, `staff_kho_tbd`, `shipper_nam`, `kh_vinamilk` |
| `email` | VarChar(255) | Khóa duy nhất (Unique), Bắt buộc | Email tài khoản nhận thông báo/reset mật khẩu. VD: `hung.pham@smartlog.com` |
| `password_hash`| Text | Bắt buộc | Mật khẩu băm bỏi bcrypt bảo mật. VD: `$2b$10$e8N0Y9z.K2qL.uX1vW9Z8e...` |
| `full_name` | VarChar(150) | Tùy chọn | Họ và tên hiển thị chuẩn (Single Source of Truth). VD: `Phạm Tuấn Hưng`, `Nguyễn Văn Bình` |
| `phone` | VarChar(20) | Tùy chọn | Số điện thoại liên lạc chính thức. VD: `0987654321` |
| `avatar_url` | Text | Tùy chọn | Đường dẫn ảnh đại diện. VD: `https://storage.smartlog.com/avatars/user_101.jpg` |
| `status` | Enum | Bắt buộc (Default Active) | Trạng thái tài khoản: `ACTIVE` (Hoạt động), `LOCKED` (Bị khóa), `DISABLED` (Vô hiệu hóa) |
| `role_id` | Uuid | **Khóa ngoại (FK ➔ bảng roles)** | Khóa ngoại trỏ sang bảng `roles` quy định vai trò duy nhất của User |
| `last_login_at`| Timestamptz | Tùy chọn | Thời điểm đăng nhập gần nhất. VD: `2026-07-24 08:30:00+07` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Thời điểm khởi tạo tài khoản. VD: `2026-07-01 10:00:00+07` |
| `updated_at` | Timestamptz | UpdatedAt | Thời điểm cập nhật thông tin gần nhất |
| `deleted_at` | Timestamptz | Tùy chọn | Mốc thời gian xóa mềm (Soft Delete) |

---

### 2. Bảng `roles` (Vai trò người dùng - RBAC)
📌 **Chức năng của bảng:** Định nghĩa danh mục các vai trò người dùng trong hệ thống theo mô hình phân quyền RBAC (`ADMIN` - Quản trị, `STAFF` - Nhân viên điều vận/bưu cục, `CUSTOMER` - Khách hàng, `SHIPPER` - Tài xế giao hàng). Mỗi tài khoản `User` được gán chính xác một `role_id`.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã vai trò hệ thống. VD: `r1111111-2222-3333-4444-555555555555` |
| `role_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã vai trò cố định: `ADMIN` (Quản trị), `STAFF` (Nhân viên), `CUSTOMER` (Khách hàng), `SHIPPER` (Tài xế) |
| `role_name` | VarChar(100) | Bắt buộc | Tên hiển thị của vai trò. VD: `Quản trị viên hệ thống`, `Nhân viên điều vận bưu cục` |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Thời điểm tạo vai trò |

---

### 3. Bảng `permissions` (Danh mục Quyền hạn chi tiết)
📌 **Chức năng của bảng:** Lưu trữ danh mục tất cả các quyền hạn thao tác chức năng chi tiết trong hệ thống (như quyền tạo đơn hàng `ORDER_CREATE`, quyền duyệt vận đơn `SHIPMENT_APPROVE`, quyền kích hoạt thuật toán AI routing `AI_ROUTE_OPTIMIZE`...).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã quyền hạn. VD: `p1111111-2222-3333-4444-555555555555` |
| `permission_code`| VarChar(50)| Khóa duy nhất (Unique), Bắt buộc | Mã quyền hệ thống. VD: `ORDER_CREATE`, `SHIPMENT_APPROVE`, `AI_ROUTE_OPTIMIZE` |
| `permission_name`| VarChar(100)| Bắt buộc | Tên quyền chi tiết. VD: `Kích hoạt thuật toán AI tối ưu tuyến đường` |
| `description` | Text | Tùy chọn | Mô tả phạm vi tác động của quyền |

---

### 4. Bảng `role_permissions` (Gán Quyền cho Vai trò - Bảng trung gian N:N)
📌 **Chức năng của bảng:** Bảng trung gian thể hiện mối quan hệ N:N giữa bảng `roles` và `permissions`. Bảng này thiết lập tập hợp các quyền thao tác cụ thể mà một vai trò được phép thực hiện trong hệ thống.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `role_id` | Uuid | **Cặp khóa chính (Composite PK [role_id, permission_id])**, **FK ➔ bảng roles** | Mã vai trò được gán quyền |
| `permission_id` | Uuid | **Cặp khóa chính (Composite PK [role_id, permission_id])**, **FK ➔ bảng permissions** | Mã quyền hạn được gán cho vai trò |

---

## 🏬 MODULE 2: CUSTOMERS & ADDRESSES (Khách hàng & Địa chỉ)

### 5. Bảng `customers` (Hồ sơ Khách hàng - Clean Architecture 1-1 với `users`)
📌 **Chức năng của bảng:** Lưu trữ thông tin hồ sơ nghiệp vụ của Khách hàng (khách hàng cá nhân gửi lẻ hoặc doanh nghiệp/shop thương mại điện tử). Bảng này lưu mã khách hàng, loại khách hàng, tên công ty, mã số thuế và trạng thái tài khoản. Liên kết bắt buộc 1-1 với tài khoản `users` qua `user_id UNIQUE`.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã hồ sơ khách hàng. VD: `c2222222-3333-4444-5555-666666666666` |
| `user_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng users)** | Khóa ngoại BẮT BUỘC 1-1 trỏ bảng `users` (Tài khoản đăng nhập trên App/Web) |
| `customer_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã quản lý khách hàng. VD: `KH-IND-0089`, `KH-BIZ-012` |
| `customer_type` | Enum | Bắt buộc | Loại khách hàng: `INDIVIDUAL` (Cá nhân gửi lẻ), `BUSINESS` (Doanh nghiệp/Shop lớn) |
| `company_name` | VarChar(255) | Tùy chọn | Tên công ty/Thương hiệu shop (nếu là BIZ). VD: `Công ty TNHH Vinamilk Việt Nam` |
| `tax_code` | VarChar(30) | Tùy chọn | Mã số thuế doanh nghiệp. VD: `0300588569` |
| `status` | Enum | Bắt buộc (Default Active) | Trạng thái hồ sơ: `ACTIVE` (Đang giao dịch), `INACTIVE`, `BLOCKED` (Chặn tạo đơn) |
| `created_at` | Timestamptz | Bắt buộc (Default Now) | Ngày khách hàng đăng ký hệ thống |

---

### 6. Bảng `addresses` (Kho dữ liệu Địa chỉ Chuyển phát & Map API)
📌 **Chức năng của bảng:** Lưu trữ tập trung kho dữ liệu địa chỉ lấy hàng, địa chỉ giao hàng và địa chỉ kho bãi bưu cục. Bảng này lưu chi tiết số nhà/tên đường, phường xã, tỉnh thành, tọa độ vĩ độ/kinh độ GPS (`latitude`, `longitude`) và `place_id` từ API Bản đồ (Goong Maps / Google Maps) phục vụ tính toán khoảng cách và hiển thị trên bản đồ.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã địa chỉ duy nhất. VD: `a3333333-4444-5555-6666-777777777777` |
| `address_line_1`| VarChar(255)| Bắt buộc | Số nhà, tên đường chi tiết. VD: `Số 268 Lý Thường Kiệt` |
| `ward` | VarChar(100) | Bắt buộc | Phường / Xã. VD: `Phường 14` |
| `ward_code` | VarChar(20) | **Khóa ngoại (FK ➔ bảng wards)** | Mã định danh Phường/Xã (Trỏ bảng `wards`) |
| `province` | VarChar(100) | Bắt buộc | Tỉnh / Thành phố trực thuộc TW. VD: `Thành phố Hồ Chí Minh` |
| `country` | VarChar(100) | Default 'Vietnam' | Quốc gia |
| `place_id` | VarChar(255)| Tùy chọn | Mã định vị địa điểm từ Goong Map / Google Maps API. VD: `ChIJaX7y8Z4vdTER...` |
| `latitude` | Double | Bắt buộc | Vĩ độ định vị GPS. VD: `10.7721` |
| `longitude` | Double | Bắt buộc | Kinh độ định vị GPS. VD: `106.6578` |
| `formatted_address`| Text | Bắt buộc | Địa chỉ hoàn chỉnh dạng chuỗi. VD: `268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM` |

---

### 7. Bảng `customer_addresses` (Sổ địa chỉ Khách hàng - Bảng trung gian N:N)
📌 **Chức năng của bảng:** Bảng sổ địa chỉ lưu danh mục các địa chỉ thường dùng của từng khách hàng (Địa chỉ nhà riêng, văn phòng, kho hàng, địa chỉ nhận hàng hoàn). Quản lý cờ `is_default` để tự động điền địa chỉ mặc định khi tạo đơn mới.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi sổ địa chỉ |
| `customer_id` | Uuid | **Cặp khóa duy nhất [customer_id, address_id]**, **FK ➔ bảng customers** | Mã khách hàng sở hữu địa chỉ |
| `address_id` | Uuid | **Cặp khóa duy nhất [customer_id, address_id]**, **FK ➔ bảng addresses** | Mã địa chỉ được liên kết |
| `address_type` | Enum | Bắt buộc | Loại địa chỉ: `HOME` (Nhà riêng), `OFFICE` (Văn phòng), `WAREHOUSE` (Kho hàng), `RETURN` |
| `is_default` | Boolean | Default False | Đánh dấu làm địa chỉ lấy/giao mặc định |

---

### 8. Bảng `customer_contacts` (Danh bạ Người liên hệ của Khách hàng)
📌 **Chức năng của bảng:** Lưu trữ danh bạ đại diện những người liên hệ thực tế tại kho bãi hoặc văn phòng của Khách hàng (như Trưởng kho, Kế toán giao nhận). Dùng để ghi nhận thông tin người gửi/người liên hệ trực tiếp khi Shipper đến lấy hàng.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã người liên hệ |
| `customer_id` | Uuid | **Khóa ngoại (FK ➔ bảng customers)** | Thuộc về khách hàng nào |
| `full_name` | VarChar(150) | Bắt buộc | Họ tên người liên hệ tại kho/văn phòng. VD: `Chị Mai - Trưởng Kho Hàng` |
| `phone` | VarChar(20) | Bắt buộc | Số điện thoại liên hệ trực tiếp. VD: `0912345678` |
| `email` | VarChar(255) | Tùy chọn | Email người nhận thông báo giao nhận |
| `is_primary` | Boolean | Default False | Đánh dấu người liên hệ đại diện chính |

---

## 🏭 MODULE 3: FACILITY NETWORK (Mạng lưới Bưu cục & Kho bãi)

### 9. Bảng `facility_types` (Loại hình Kho bãi)
📌 **Chức năng của bảng:** Định nghĩa các loại hình cơ sở kho bãi trong mạng lưới logistics của công ty (như Trung tâm chia chọn tổng `SORTING_CENTER`, Bưu cục phát chặng cuối `LAST_MILE_HUB`).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã loại kho bãi |
| `type_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã phân loại: `SORTING_CENTER` (Trung tâm chia chọn), `LAST_MILE_HUB` (Bưu cục phát chặng cuối) |
| `type_name` | VarChar(100) | Bắt buộc | Tên hiển thị loại kho. VD: `Bưu cục Giao nhận Chặng cuối (Last-mile Hub)` |

---

### 10. Bảng `facilities` (Mạng lưới Bưu cục / Hub logistics)
📌 **Chức năng của bảng:** Lưu trữ danh sách toàn bộ các bưu cục, trung tâm khai thác kho bãi trong hệ thống. Quản lý mã bưu cục, bưu cục cấp trên (cây phân cấp Hub mẹ - Hub con), Nhân viên quản lý bưu cục và lưu trực tiếp tọa độ GPS (`latitude`, `longitude`) giúp thuật toán AI Routing truy vấn vị trí kho khởi chạy siêu tốc.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã định danh bưu cục. VD: `f4444444-5555-6666-7777-888888888888` |
| `facility_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã bưu cục/kho. VD: `HUB-Q10-HCM`, `HUB-CWD-HN` |
| `facility_name` | VarChar(255) | Bắt buộc | Tên đầy đủ của bưu cục. VD: `Bưu cục Giao nhận Quận 10 - TP.HCM` |
| `facility_type_id`| Uuid | **Khóa ngoại (FK ➔ bảng facility_types)** | Loại hình kho bãi |
| `parent_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Kho cấp trên trong cây phân cấp mạng lưới |
| `manager_user_id`| Uuid | **Khóa ngoại (FK ➔ bảng users)** | Quản lý bưu cục (Trỏ User có Role Staff/Admin) |
| `latitude` | Double | Bắt buộc | Vĩ độ Hub (Truy vấn trực tiếp siêu tốc cho thuật toán AI Routing) |
| `longitude` | Double | Bắt buộc | Kinh độ Hub (Truy vấn trực tiếp siêu tốc cho thuật toán AI Routing) |
| `operating_status`| Enum | Bắt buộc (Default Active) | Trạng thái: `ACTIVE` (Đang mở cửa), `MAINTENANCE` (Bảo trì), `CLOSED` |

---

### 11. Bảng `facility_addresses` (Địa chỉ Bưu cục - Bảng trung gian N:N)
📌 **Chức năng của bảng:** Bảng trung gian liên kết bưu cục với thông tin địa chỉ trong bảng `addresses`, hỗ trợ phân loại địa chỉ bưu cục (Trụ sở chính `MAIN`, Địa chỉ xuất hóa đơn `BILLING`, Địa chỉ nhận hàng hoàn `RETURN`).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi địa chỉ kho |
| `facility_id` | Uuid | **Cặp khóa duy nhất [facility_id, address_id]**, **FK ➔ bảng facilities** | Mã bưu cục sở hữu địa chỉ |
| `address_id` | Uuid | **Cặp khóa duy nhất [facility_id, address_id]**, **FK ➔ bảng addresses** | Mã địa chỉ được liên kết |
| `address_type` | Enum | Bắt buộc | Loại địa chỉ kho: `MAIN` (Trụ sở chính), `BILLING`, `RETURN`, `PICKUP` |

---

### 12. Bảng `facility_zones` (Phân khu Hàng hóa tại Bưu cục)
📌 **Chức năng của bảng:** Quản lý cấu trúc các phân khu nghiệp vụ bên trong bưu cục (Khu vực Nhập kho `RECEIVING`, Khu vực Phân loại chia chọn `SORTING`, Khu vực Chờ xuất giao `SHIPPING`, Khu vực Lưu kho `STORAGE`, Khu vực Hàng hoàn `RETURN`). Giúp Staff theo dõi chính xác vị trí hàng hóa đang nằm ở đâu trong kho.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã phân khu kho |
| `facility_id` | Uuid | **Cặp khóa duy nhất [facility_id, zone_code]**, **FK ➔ bảng facilities** | Thuộc bưu cục nào |
| `zone_code` | VarChar(30) | **Cặp khóa duy nhất [facility_id, zone_code]**, Bắt buộc | Mã phân khu. VD: `ZONE-REC-01`, `ZONE-SORT-A`, `ZONE-SHIP-SOUTH` |
| `zone_name` | VarChar(100) | Bắt buộc | Tên phân khu kho. VD: `Khu vực Nhập kho`, `Khu phân loại tự động`, `Khu chờ giao` |
| `zone_type` | Enum | Bắt buộc | Enum phân khu: `RECEIVING` (Khu nhận), `SORTING` (Khu phân loại), `SHIPPING` (Khu chờ giao) |
| `capacity` | Int | Tùy chọn | Sức chứa tối đa (Số kiện hàng). VD: `5000` |

---

## 📦 MODULE 4: ORDERS & SERVICES (Đơn hàng & Gói dịch vụ)

### 13. Bảng `services` (Bảng giá & Dịch vụ Vận chuyển)
📌 **Chức năng của bảng:** Cấu hình danh mục các gói dịch vụ vận chuyển của công ty (Giao hỏa tốc `EXPRESS`, Tiêu chuẩn `STANDARD`, Tiết kiệm `SAVING`). Quản lý cước phí nền cơ bản, mốc khoảng cách/khối lượng miễn phí và đơn giá tính thêm theo Km/Kg.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã dịch vụ |
| `service_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã dịch vụ: `EXPRESS` (Hỏa tốc 2H), `STANDARD` (Tiêu chuẩn 24H), `SAVING` (Tiết kiệm) |
| `base_price` | Decimal(12,2)| Default 0 | Cước phí nền cơ bản. VD: `15000.00` VNĐ |
| `free_distance_km`| Float | Default 2.0 | Khoảng cách miễn phí tối thiểu (Km). VD: `2.0` |
| `price_per_km` | Decimal(12,2)| Default 0 | Cước vượt mốc theo Km. VD: `5000.00` VNĐ/Km |
| `free_weight_kg` | Float | Default 1.0 | Khối lượng miễn phí tối thiểu (Kg). VD: `1.0` |
| `price_per_kg` | Decimal(12,2)| Default 0 | Cước phụ trội theo Kg. VD: `2500.00` VNĐ/Kg |

---

### 14. Bảng `orders` (Quản lý Đơn hàng - Order Snapshot)
📌 **Chức năng của bảng:** Bảng trung tâm quản lý Đơn hàng do khách tạo. Lưu đóng đóng băng (Snapshot) địa chỉ lấy/giao, tọa độ GPS, thông tin người gửi/nhận, lịch hẹn lấy hàng tận nhà, gói dịch vụ đã chọn và các khoản chi phí dự tính (`estimated_shipping_fee`, `estimated_cod_amount`).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã đơn hàng duy nhất. VD: `o5555555-6666-7777-8888-999999999999` |
| `order_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã tra cứu đơn hàng công khai. VD: `ORD-20260724-8891` |
| `customer_id` | Uuid | **Khóa ngoại (FK ➔ bảng customers)** | Khách hàng người tạo đơn |
| `service_id` | Uuid | **Khóa ngoại (FK ➔ bảng services)** | Dịch vụ vận chuyển đã chọn |
| `pickup_address_id`| Uuid | **Khóa ngoại (FK ➔ bảng addresses)** | Địa chỉ lấy hàng chính |
| `delivery_address_id`| Uuid | **Khóa ngoại (FK ➔ bảng addresses)** | Địa chỉ giao hàng chính |
| `sender_contact_id`| Uuid | **Khóa ngoại (FK ➔ bảng customer_contacts)**| Danh bạ người gửi |
| `receiver_contact_id`| Uuid| **Khóa ngoại (FK ➔ bảng customer_contacts)**| Danh bạ người nhận |
| `origin_facility_id`| Uuid| **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục nhận hàng đầu tiên |
| `destination_facility_id`| Uuid| **Khóa ngoại (FK ➔ bảng facilities)**| Bưu cục phát hàng cuối cùng |
| `created_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người khởi tạo đơn hàng |
| `updated_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người cập nhật đơn gần nhất |
| `status` | Enum | Bắt buộc | Trạng thái đơn hàng (`CREATED`, `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, `DELIVERED`...) |
| `scheduled_pickup_at`| Timestamptz| Tùy chọn | Lịch hẹn khách đặt Shipper đến lấy hàng. VD: `2026-07-24 14:00:00+07` |
| `sender_name` | VarChar(150) | Bắt buộc | Họ tên người gửi đóng băng snapshot |
| `sender_phone` | VarChar(20) | Bắt buộc | Số điện thoại người gửi snapshot |
| `pickup_address_text`| Text | Bắt buộc | Địa chỉ lấy hàng chi tiết đóng băng snapshot |
| `pickup_latitude` | Double | Bắt buộc | Vĩ độ tọa độ lấy hàng |
| `pickup_longitude`| Double | Bắt buộc | Kinh độ tọa độ lấy hàng |
| `receiver_name` | VarChar(150) | Bắt buộc | Họ tên người nhận đóng băng snapshot |
| `receiver_phone` | VarChar(20) | Bắt buộc | Số điện thoại người nhận snapshot |
| `delivery_address_text`| Text | Bắt buộc | Địa chỉ giao hàng chi tiết đóng băng snapshot |
| `delivery_latitude`| Double | Bắt buộc | Vĩ độ tọa độ giao hàng |
| `delivery_longitude`| Double | Bắt buộc | Kinh độ tọa độ giao hàng |
| `estimated_shipping_fee`| Decimal(12,2)| Default 0 | Cước phí vận chuyển tạm tính |
| `estimated_cod_amount` | Decimal(12,2)| Default 0 | Tiền thu hộ COD dự kiến |
| `estimated_total_amount`| Decimal(12,2)| Default 0 | Tổng chi phí tạm tính |

---

### 15. Bảng `packages` (Chi tiết Kiện hàng vật lý & Vị trí Phân khu Kho)
📌 **Chức năng của bảng:** Quản lý chi tiết từng kiện hàng vật lý nằm trong đơn hàng (mã barcode kiện hàng, khối lượng, thể tích, hàng dễ vỡ, mô tả tên hàng, giá trị khai giá để tính Phí bảo hiểm). Đồng thời lưu vết **Bưu cục hiện tại (`current_facility_id`)** và **Phân khu kho hiện tại (`current_zone_id`)** mà kiện hàng đang được lưu giữ.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã kiện hàng. VD: `pkg-8888-9999-0000` |
| `order_id` | Uuid | **Khóa ngoại (FK ➔ bảng orders)** | Thuộc Đơn hàng nào |
| `package_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã vạch/Barcode kiện hàng. VD: `PKG-8891-01` |
| `required_vehicle_type_id`| Uuid| **Khóa ngoại (FK ➔ bảng vehicle_types)**| Yêu cầu loại xe chở kiện hàng |
| `current_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Vị trí Bưu cục hiện tại kiện hàng đang nằm |
| `current_zone_id` | Uuid | **Khóa ngoại (FK ➔ bảng facility_zones)**| Vị trí Phân khu kho hiện tại (Khu nhận, Khu phân loại, Khu xuất) |
| `description` | Text | Tùy chọn | Mô tả mặt hàng bên trong. VD: `Quần áo thời trang, Hộp quà lưu niệm` |
| `declared_value` | Decimal(12,2)| Tùy chọn | Giá trị khai giá hàng hóa (Làm căn cứ tính Phí bảo hiểm). VD: `2000000.00` VNĐ |
| `weight` | Decimal(8,2) | Bắt buộc | Khối lượng kiện hàng (Kg). VD: `1.25` Kg |
| `volume` | Decimal(10,4)| Bắt buộc | Thể tích quy đổi (m³). VD: `0.0045` m³ |
| `is_fragile` | Boolean | Default False | Cảnh báo hàng dễ vỡ |

---

### 16. Bảng `order_payments` (Thanh toán Thực tế & COD)
📌 **Chức năng của bảng:** Quản lý tài chính thanh toán chính thức của đơn hàng. Lưu cước vận chuyển chốt cuối cùng, số tiền thu hộ COD chốt cuối cùng, người chịu phí (`SENDER` / `RECEIVER`), hình thức thanh toán (`CASH`, `BANK_TRANSFER`, `E_WALLET`, `COD`) và trạng thái thanh toán.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã giao dịch thanh toán |
| `order_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng orders)** | Gắn duy nhất 1-1 với `orders` |
| `final_shipping_fee`| Decimal(12,2)| Bắt buộc | Cước vận chuyển cuối cùng thực tế |
| `final_cod_amount` | Decimal(12,2)| Bắt buộc | Tiền thu hộ COD chốt thực tế |
| `fee_payer` | Enum | Bắt buộc | Người trả cước: `SENDER` (Người gửi trả), `RECEIVER` (Người nhận trả) |
| `payment_method` | Enum | Bắt buộc | Hình thức: `CASH` (Tiền mặt), `BANK_TRANSFER`, `E_WALLET`, `COD` |
| `payment_status` | Enum | Default Unpaid | Trạng thái: `UNPAID` (Chưa thanh toán), `PAID` (Đã thanh toán), `REFUNDED` |

---

### 17. Bảng `order_status_history` (Nhật ký Lịch sử Thay đổi Trạng thái Đơn hàng)
📌 **Chức năng của bảng:** Ghi vết (Audit trail) toàn bộ lịch sử biến động trạng thái của đơn hàng từ khi tạo mới đến khi giao thành công hoặc hủy đơn. Ghi rõ thời điểm chuyển trạng thái, người thực hiện chuyển và nguồn tác động (`SYSTEM`, `CUSTOMER`, `DRIVER`, `ADMIN`, `API`).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi lịch sử |
| `order_id` | Uuid | **Khóa ngoại (FK ➔ bảng orders)** | Thuộc đơn hàng nào |
| `changed_by_user_id`| Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người thực hiện chuyển trạng thái (User ID) |
| `status` | Enum | Bắt buộc | Trạng thái chuyển đến. VD: `OUT_FOR_DELIVERY` |
| `change_source` | Enum | Bắt buộc | Nguồn tác động: `SYSTEM`, `CUSTOMER`, `DRIVER`, `ADMIN`, `API` |
| `reason` | Text | Tùy chọn | Lý do chuyển trạng thái |

---

## 🚚 MODULE 5: SHIPMENT MANAGEMENT (Quản lý Vận đơn & Trung chuyển)

### 18. Bảng `shipments` (Vận đơn / Chuyến gom hàng)
📌 **Chức năng của bảng:** Quản lý các Vận đơn (Shipment) đại diện cho các chuyến gom hàng di chuyển giữa các bưu cục (chặng trung chuyển) hoặc chuyến hàng do Shipper đi giao (chặng cuối). Lưu bưu cục xuất phát (`origin_facility_id`), bưu cục đích (`destination_facility_id`) và mã lộ trình AI gắn kèm.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã vận đơn duy nhất |
| `shipment_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã tracking vận đơn công khai. VD: `SPM-20260724-9900` |
| `route_id` | Uuid | **Khóa ngoại (FK ➔ bảng routes)** | Thuộc Lộ trình giao hàng nào |
| `origin_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục xuất phát của vận đơn |
| `destination_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục đích đến của vận đơn |
| `created_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Nhân viên khởi tạo vận đơn |
| `updated_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người cập nhật vận đơn gần nhất |
| `status` | Enum | Bắt buộc | Trạng thái vận đơn (`CREATED`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`...) |

---

### 19. Bảng `shipment_packages` (Gom Kiện hàng vào Vận đơn - Bảng trung gian 1:1 Strict Package)
📌 **Chức năng của bảng:** Bảng trung gian gom các kiện hàng vật lý vào vận đơn chuyến xe. Ràng buộc duy nhất `package_id UNIQUE` đảm bảo tính toàn vẹn nghiệp vụ: một kiện hàng chỉ nằm trên duy nhất 1 vận đơn chuyến xe active tại một thời điểm.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi gom hàng |
| `shipment_id` | Uuid | **Cặp khóa duy nhất [shipment_id, package_id]**, **FK ➔ bảng shipments** | Mã Vận đơn gom hàng |
| `package_id` | Uuid | **Khóa ngoại duy nhất (FK, Unique ➔ bảng packages)** | Kiện hàng duy nhất (Ràng buộc Unique đảm bảo 1 Kiện không nằm 2 Vận đơn cùng lúc) |

---

### 20. Bảng `shipment_events` (Sự kiện Nhật ký Vận đơn)
📌 **Chức năng của bảng:** Ghi vết hành trình chi tiết của vận đơn khi di chuyển qua các mốc quan trọng (Xuất kho departure, Đến bưu cục trung gian arrival, Shipper nhận hàng out for delivery, Giao hàng thành công delivery success).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã sự kiện vận đơn |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Thuộc vận đơn nào |
| `facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục phát sinh sự kiện |
| `created_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người ghi nhận sự kiện |
| `event_type` | Enum | Bắt buộc | Loại sự kiện: `DRIVER_ASSIGNED`, `DEPARTED_FACILITY`, `ARRIVED_FACILITY`, `DELIVERY_SUCCESS` |
| `event_time` | Timestamptz | Not Null | Thời điểm xảy ra sự kiện |

---

### 21. Bảng `shipment_transfers` (Luân chuyển Hàng giữa các Bưu cục)
📌 **Chức năng của bảng:** Quản lý quy trình giao nhận luân chuyển vận đơn giữa bưu cục gửi (`from_facility_id`) và bưu cục nhận (`to_facility_id`). Theo dõi thời điểm xuất xe, thời điểm xe cập bến kho và nhân viên kho bấm Xác nhận nhập kho.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | PK | Mã giao dịch chuyển giao hàng |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Vận đơn luân chuyển |
| `from_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục gửi hàng đi |
| `to_facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục tiếp nhận hàng |
| `received_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Nhân viên nhận bàn giao hàng |
| `status` | Enum | Bắt buộc | Trạng thái: `PENDING`, `IN_TRANSIT`, `ARRIVED` (Đã nhận kho), `REJECTED` |

---

## 🏎️ MODULE 6: FLEET & DRIVER MANAGEMENT (Đội xe & Tài xế)

### 22. Bảng `drivers` (Hồ sơ Tài xế / Shipper - Clean Architecture 1-1 với `users`)
📌 **Chức năng của bảng:** Lưu trữ hồ sơ nghiệp vụ của Tài xế / Shipper (Mã tài xế, CCCD, số bằng lái, hạng bằng lái, bưu cục quản lý trực thuộc, loại tài xế giao chặng cuối `HUB_DELIVERY` hay giao tức thì `ON_DEMAND`). Liên kết bắt buộc 1-1 với tài khoản `users` qua `user_id UNIQUE`.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã hồ sơ tài xế. VD: `drv-7777-8888-9999` |
| `user_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng users)** | Khóa ngoại BẮT BUỘC 1-1 trỏ bảng `users` (Tài khoản App mobile Shipper) |
| `employee_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã nhân viên giao hàng. VD: `SHIPPER-Q10-09` |
| `citizen_id` | VarChar(20) | Khóa duy nhất (Unique), Tùy chọn| Số Căn cước công dân (CCCD). VD: `079098001234` |
| `driver_license_number`| VarChar(50)| Bắt buộc | Số bằng lái xe. VD: `59012938102` |
| `driver_license_class` | VarChar(10)| Bắt buộc | Hạng bằng lái. VD: `A1`, `B2`, `C` |
| `hire_date` | Date | Bắt buộc | Ngày chính thức ký hợp đồng tuyển dụng. VD: `2025-01-15` |
| `employment_status` | Enum | Bắt buộc | Trạng thái ca làm việc: `ACTIVE` (Đang làm), `OFFLINE` (Nghỉ ca), `SUSPENDED` |
| `home_facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục trực thuộc quản lý chính |
| `driver_type` | Enum | Default HubDelivery | Loại tài xế: `HUB_DELIVERY` (Giao chặng cuối bưu cục), `ON_DEMAND` (Giao tức thì) |

---

### 23. Bảng `staff_profiles` (Hồ sơ Nhân viên Bưu cục / Điều vận - Clean Architecture 1-1 với `users`)
📌 **Chức năng của bảng:** Lưu trữ hồ sơ nghiệp vụ của Nhân viên Bưu cục / Nhân viên Điều vận kho (Mã nhân viên `employee_code`, CCCD, chức vụ `position`, bưu cục công tác `assigned_facility_id`). Liên kết bắt buộc 1-1 với tài khoản `users` qua `user_id UNIQUE`.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã hồ sơ nhân viên |
| `user_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng users)** | Khóa ngoại BẮT BUỘC 1-1 trỏ bảng `users` (Tài khoản Web Admin/Staff) |
| `employee_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã nhân viên. VD: `STAFF-LOG-05` |
| `citizen_id` | VarChar(20) | Khóa duy nhất (Unique), Tùy chọn| Căn cước công dân |
| `position` | VarChar(100)| Tùy chọn | Chức vụ. VD: `Trưởng Bưu Cục`, `Nhân viên Phân loại Hàng`, `Nhân viên Điều vận AI` |
| `assigned_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục công tác chính |

---

### 24. Bảng `vehicles` (Danh mục Phương tiện Giao hàng)
📌 **Chức năng của bảng:** Quản lý danh sách các phương tiện di chuyển trong đội xe (Xe máy, Xe tải nhẹ, Xe Van). Quản lý biển số xe, tải trọng tối đa (Kg), thể tích thùng xe (m³), bưu cục đậu xe và trạng thái vận hành (`ACTIVE`, `MAINTENANCE`, `RETIRED`).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã phương tiện |
| `vehicle_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã xe. VD: `XE-TRUCK-01`, `XE-BIKE-09` |
| `license_plate` | VarChar(20) | Khóa duy nhất (Unique), Bắt buộc | Biển số xe. VD: `59-P1 999.88` |
| `vehicle_type_id` | Uuid | **Khóa ngoại (FK ➔ bảng vehicle_types)**| Loại xe (Xe tải, Xe máy...) |
| `home_facility_id`| Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục đậu/quản lý xe |
| `max_weight` | Decimal(10,2)| Bắt buộc | Tải trọng tối đa (Kg). VD: `1500.00` Kg |
| `max_volume` | Decimal(10,4)| Bắt buộc | Thể tích thùng xe tối đa (m³). VD: `12.5000` m³ |
| `operating_status`| Enum | Bắt buộc | Trạng thái: `ACTIVE` (Sẵn sàng), `MAINTENANCE` (Đang sửa), `RETIRED` |

---

### 25. Bảng `vehicle_types` (Loại Phương tiện)
📌 **Chức năng của bảng:** Định nghĩa chủng loại phương tiện (Xe máy `MOTORBIKE`, Xe tải Van 500Kg `VAN_500KG`, Xe tải 1.5 Tấn `TRUCK_1.5TON`) làm căn cứ để thuật toán AI Routing phân bổ tuyến đường phù hợp với kích thước kiện hàng.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã loại phương tiện |
| `type_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã loại xe: `MOTORBIKE`, `VAN_500KG`, `TRUCK_1.5TON` |
| `type_name` | VarChar(100) | Bắt buộc | Tên hiển thị. VD: `Xe tải nhẹ 1.5 Tấn` |

---

### 26. Bảng `driver_vehicle_assignments` (Phân công Xe cho Tài xế)
📌 **Chức năng của bảng:** Quản lý lịch sử và trạng thái phân công xe cho tài xế sử dụng theo từng ca làm việc. Đảm bảo tại một thời điểm biết chính xác tài xế nào đang điều khiển phương tiện nào.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lượt phân công xe |
| `driver_id` | Uuid | **Khóa ngoại (FK ➔ bảng drivers)** | Tài xế được gán xe |
| `vehicle_id` | Uuid | **Khóa ngoại (FK ➔ bảng vehicles)**| Phương tiện được gán |
| `assigned_from` | Timestamptz | Bắt buộc | Thời điểm bắt đầu giao xe |
| `assigned_to` | Timestamptz | Tùy chọn | Thời điểm trả xe |
| `is_active` | Boolean | Default True | Đánh dấu phân công đang có hiệu lực |

---

### 27. Bảng `driver_locations` (Tọa độ GPS Thời gian thực hiện tại của Shipper)
📌 **Chức năng của bảng:** Lưu trữ vị trí tọa độ GPS mới nhất (`latitude`, `longitude`), góc hướng di chuyển và vận tốc thực tế của từng tài xế. Bảng này được ứng dụng Mobile Shipper cập nhật liên tục ngầm (3-5 giây/lượt) để hiển thị vị trí Shipper thời gian thực trên bản đồ Web Admin.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `driver_id` | Uuid | **Khóa chính (PK)**, **FK ➔ bảng drivers** | Mã tài xế (Mỗi tài xế giữ 1 bản ghi vị trí hiện tại) |
| `latitude` | Double | Bắt buộc | Vĩ độ phát ngầm thời gian thực qua WebSocket. VD: `10.7735` |
| `longitude` | Double | Bắt buộc | Kinh độ phát ngầm thời gian thực qua WebSocket. VD: `106.6590` |
| `recorded_at` | Timestamptz | Bắt buộc | Mốc thời gian thiết bị phát tọa độ gần nhất |

---

## 🗺️ MODULE 7: ROUTING & DISPATCH ENGINE (Điều vận & Thuật toán AI)

### 28. Bảng `routes` (Tuyến đường Lộ trình tối ưu bởi AI)
📌 **Chức năng của bảng:** Lưu trữ các tuyến đường lộ trình tối ưu được sinh ra bởi thuật toán AI (K-Means + Genetic Algorithm). Quản lý tổng quãng đường dự kiến (Km), tổng thời gian dự kiến (phút), bưu cục xuất phát, bưu cục kết thúc và liên kết với tài xế/xe được gán.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lộ trình tối ưu |
| `route_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã tuyến đường. VD: `RT-20260724-001` |
| `driver_vehicle_assignment_id`| Uuid | **Khóa ngoại (FK ➔ bảng driver_vehicle_assignments)**| Phân công Shipper+Xe (Nullable cho phép AI sinh Route trước) |
| `driver_id` | Uuid | **Khóa ngoại (FK ➔ bảng drivers)** | Tài xế được gán chính |
| `vehicle_id` | Uuid | **Khóa ngoại (FK ➔ bảng vehicles)** | Phương tiện xe được gán chính |
| `start_facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục điểm xuất phát tuyến |
| `end_facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục điểm kết thúc tuyến |
| `optimization_id` | Uuid | **Khóa ngoại (FK ➔ bảng route_optimizations)** | Kết nối lượt chạy tối ưu AI |
| `planned_distance_km` | Decimal(10,2)| Default 0 | Tổng quãng đường AI tính toán tối ưu (Km). VD: `14.85` Km |
| `planned_duration_min`| Int | Default 0 | Tổng thời gian AI ước tính hoàn thành (Phút). VD: `125` Phút |
| `status` | Enum | Default Planned | Trạng thái tuyến: `PLANNED` (AI vừa tính xong), `ASSIGNED`, `IN_PROGRESS`, `COMPLETED` |

---

### 29. Bảng `route_stops` (Chi tiết Các điểm dừng trên Lộ trình)
📌 **Chức năng của bảng:** Lưu trữ danh sách thứ tự các điểm dừng cần ghé thăm trên tuyến đường do AI sắp xếp (`sequence` 1, 2, 3...). Phân loại rõ điểm dừng Lấy hàng tại nhà khách `PICKUP`, điểm dừng bưu cục trung chuyển `HUB`, hay điểm dừng Giao hàng cho người nhận `DELIVERY`.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã điểm dừng |
| `route_id` | Uuid | **Cặp khóa duy nhất [route_id, sequence]**, **FK ➔ bảng routes** | Thuộc Lộ trình nào |
| `sequence` | Int | **Cặp khóa duy nhất [route_id, sequence]**, Bắt buộc | Thứ tự thứ tự ghé thăm tối ưu (1, 2, 3...) |
| `order_id` | Uuid | **Khóa ngoại (FK ➔ bảng orders)** | Đơn hàng cần lấy (Dùng cho điểm dừng Pickup Lấy hàng tại nhà) |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Vận đơn cần giao (Dùng cho điểm dừng Delivery Giao hàng) |
| `facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Bưu cục ghé trung chuyển (Dùng cho điểm dừng Hub) |
| `stop_type` | Enum | Bắt buộc | Loại điểm dừng: `PICKUP` (Lấy hàng), `HUB` (Bưu cục), `DELIVERY` (Giao hàng) |
| `latitude` / `longitude`| Double | Bắt buộc | Tọa độ GPS của điểm dừng |
| `status` | Enum | Default Pending | Trạng thái dừng: `PENDING` (Chờ ghé), `ARRIVED` (Đã đến), `DEPARTED`, `SKIPPED`, `FAILED` |

---

### 30. Bảng `dispatch_tasks` (Nhiệm vụ Điều vận Phân công ca Shipper)
📌 **Chức năng của bảng:** Quản lý công việc phân công tuyến đường cho tài xế. Lưu vết Nhân viên điều vận phân công (`assigned_by`), Tài xế nhận ca (`assigned_to`), trạng thái ca (`PENDING`, `ACCEPTED`, `REJECTED`) và ghi nhận **lý do từ chối ca `rejection_reason`** nếu Shipper bấm Từ chối.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã nhiệm vụ điều vận |
| `task_code` | VarChar(30) | Khóa duy nhất (Unique), Bắt buộc | Mã task điều vận. VD: `TSK-20260724-88` |
| `route_id` | Uuid | **Khóa ngoại (FK ➔ bảng routes)** | Lộ trình được gán |
| `assigned_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Staff/Admin thực hiện giao ca |
| `assigned_to` | Uuid | **Khóa ngoại (FK ➔ bảng drivers)** | Shipper được giao nhận ca |
| `status` | Enum | Default Pending | Trạng thái ca: `PENDING` (Chờ nhận), `ACCEPTED` (Đã nhận ca), `REJECTED` (Từ chối) |
| `rejection_reason` | Text | Tùy chọn | Lý do Shipper từ chối nhận ca (Ốm, hỏng xe...) |

---

### 31. Bảng `route_location_logs` (Nhật ký GPS Tọa độ Vệt đường chạy)
📌 **Chức năng của bảng:** Ghi vết chi tiết toàn bộ chuỗi tọa độ vệt đường chạy GPS thực tế của tài xế khi thực hiện lộ trình. Phục vụ việc xem lại hành trình di chuyển (Replay Route) và so sánh tuyến đường thực tế di chuyển với tuyến đường AI gợi ý.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi GPS vệt đường |
| `route_id` | Uuid | **Khóa ngoại (FK ➔ bảng routes)** | Thuộc Lộ trình đang chạy |
| `latitude` / `longitude`| Double | Bắt buộc | Tọa độ GPS ghi nhận thực tế trên đường |
| `recorded_at` | Timestamptz | Default Now | Thời điểm thiết bị lưu vết tọa độ |

---

### 32. Bảng `route_optimizations` (Nhật ký Thuật toán AI Routing)
📌 **Chức năng của bảng:** Nhật ký đánh giá hiệu năng thuật toán AI. Lưu vết mỗi lượt kích hoạt AI, số lượng đơn đầu vào, số lượng tuyến đầu ra, tổng quãng đường tối ưu, thời gian AI thực thi (ms), điểm số thích nghi GA (`fitness_score`) và **Snapshot toàn bộ cấu hình AI đã dùng `parameters_json`** (bán kính K-Means, population size, mutation rate).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lượt chạy tối ưu AI |
| `algorithm_name` | VarChar(50) | Bắt buộc | Thuật toán áp dụng: `K-Means + Genetic Algorithm (GA)` |
| `parameters_json` | Json | Tùy chọn | **Snapshot cấu hình AI đã dùng**: `{"kmeans_radius_km": 5, "ga_pop_size": 100, "max_gen": 500, "mutation_rate": 0.05}` |
| `input_shipment_count`| Int | Bắt buộc | Số lượng đơn/vận đơn đầu vào cần phân tuyến |
| `output_route_count` | Int | Bắt buộc | Số lượng Tuyến đường tối ưu sinh ra |
| `execution_time_ms` | Int | Bắt buộc | Thời gian thuật toán chạy xong (Milisecond). VD: `850` ms |
| `fitness_score` | Decimal(8,4) | Tùy chọn | Điểm số thích nghi tối ưu (Fitness score GA) |

---

### 33. Bảng `route_adjustment_logs` (Nhật ký Xử lý Sự cố Điều chỉnh Thủ công Lộ trình)
📌 **Chức năng của bảng:** Bảng Audit Log ghi vết xử lý sự cố lộ trình. Khi có sự cố trên đường (Shipper hỏng xe, tai nạn, hết thời gian ca), Staff/Admin thực hiện điều chỉnh thủ công (đổi tài xế mid-trip, hủy tuyến, chèn điểm dừng) thì toàn bộ thông tin ai điều chỉnh, thời gian và lý do đều được lưu lại tại bảng này.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lượt xử lý sự cố |
| `route_id` | Uuid | **Khóa ngoại (FK ➔ bảng routes)** | Lộ trình bị can thiệp |
| `adjusted_by_user_id`| Uuid | **Khóa ngoại (FK ➔ bảng users)** | Staff/Admin thực hiện can thiệp thủ công |
| `old_driver_id` | Uuid | **Khóa ngoại (FK ➔ bảng drivers)** | Tài xế cũ bị hủy ca/thay thế |
| `new_driver_id` | Uuid | **Khóa ngoại (FK ➔ bảng drivers)** | Tài xế mới được điều động thay thế |
| `adjustment_type` | VarChar(50) | Bắt buộc | Loại can thiệp: `REASSIGN_DRIVER` (Đổi tài xế), `MODIFY_STOPS`, `CANCEL_ROUTE` |
| `reason` | Text | Bắt buộc | Lý do sự cố: `Tài xế hỏng xe giữa đường tại ngã tư Hàng Xanh` |

---

## 📸 MODULE 8: TRACKING, SCAN & POD (Giám sát & Bằng chứng Giao hàng)

### 34. Bảng `delivery_proofs` (Bằng chứng Giao hàng - POD & COD Thực thu)
📌 **Chức năng của bảng:** Quản lý chứng từ bằng chứng giao hàng (POD). Lưu vết loại bằng chứng (`PHOTO` chụp ảnh, `SIGNATURE` ký tên, `OTP`), kết quả giao (`SUCCESS`, `FAILED`), lý do thất bại và **Số tiền COD thực tế tài xế đã thu tại chỗ `actual_cod_collected`**. Bảng này cho phép lưu nhiều chứng từ giao lại khi các lượt đầu bị thất bại.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã chứng từ giao hàng |
| `route_stop_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng route_stops)**| Điểm dừng duy nhất phát sinh chứng từ này |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Vận đơn được giao (Không Unique để hỗ trợ lưu nhiều chứng từ giao lại khi thất bại) |
| `proof_type` | Enum | Bắt buộc | Dạng bằng chứng: `PHOTO` (Chụp ảnh), `SIGNATURE` (Ký tên), `OTP` |
| `delivery_result` | Enum | Bắt buộc | Kết quả: `SUCCESS` (Thành công), `FAILED` (Thất bại), `PARTIAL` |
| `actual_cod_collected`| Decimal(12,2)| Tùy chọn | **Số tiền mặt COD thực tế Shipper đã thu tại chỗ** đối soát tài chính |
| `failure_reason` | Enum | Tùy chọn | Lý do thất bại: `RECIPIENT_UNAVAILABLE` (Khách không bắt máy), `INCORRECT_ADDRESS` |

---

### 35. Bảng `barcode_scans` (Nhật ký Quét mã vạch kiểm hàng)
📌 **Chức năng của bảng:** Quản lý nhật ký quét mã vạch Barcode/QR Code của kiện hàng tại từng công đoạn trong kho và trên đường di chuyển (Nhập kho `INBOUND`, Phân loại chia chọn `SORTING`, Xuất kho `OUTBOUND`, Giao hàng `DELIVERY`). Lưu vết ai quét, thời gian quét và vị trí bưu cục quét mã.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã lượt quét barcode |
| `shipment_id` | Uuid | **Khóa ngoại (FK ➔ bảng shipments)** | Vận đơn được quét mã |
| `package_id` | Uuid | **Khóa ngoại (FK ➔ bảng packages)** | Kiện hàng được quét mã |
| `route_stop_id` | Uuid | **Khóa ngoại (FK ➔ bảng route_stops)** | Điểm dừng phát sinh quét mã |
| `facility_id` | Uuid | **Khóa ngoại (FK ➔ bảng facilities)** | Kho/Bưu cục phát sinh quét mã |
| `scanned_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Người thực hiện quét mã |
| `barcode_value` | VarChar(100) | Bắt buộc | Giá trị chuỗi mã vạch vừa quét. VD: `PKG-8891-01` |
| `scan_type` | Enum | Bắt buộc | Tác vụ quét: `INBOUND` (Nhập kho), `OUTBOUND` (Xuất kho), `SORTING`, `DELIVERY` |

---

### 36. Bảng `driver_check_ins` (Nhật ký Check-in Điểm dừng của Shipper)
📌 **Chức năng của bảng:** Ghi nhận chính xác mốc thời gian và vị trí tọa độ GPS khi Shipper bấm nút "Đã đến điểm dừng" (Check-in) và "Đã rời điểm dừng" (Check-out) trên ứng dụng Mobile. Phục vụ việc kiểm soát thời gian dừng đỗ thực tế tại nhà khách hàng.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã bản ghi check-in |
| `route_stop_id` | Uuid | **Khóa ngoại 1-1 (FK, Unique ➔ bảng route_stops)**| Gắn duy nhất với điểm dừng |
| `driver_id` | Uuid | **Khóa ngoại (FK ➔ bảng drivers)** | Shipper thực hiện check-in |
| `check_in_at` | Timestamptz | Default Now | Mốc thời gian bấm Check-in trên App |
| `check_out_at` | Timestamptz | Tùy chọn | Mốc thời gian bấm Check-out xong điểm dừng |

---

### 37. Bảng `tracking_attachments` (Tệp đính kèm Chứng từ POD - Ảnh/Chữ ký)
📌 **Chức năng của bảng:** Quản lý danh sách các tệp hình ảnh thực tế (ảnh chụp kiện hàng tại cửa nhà khách, hình ảnh chữ ký điện tử của người nhận) liên kết với chứng từ giao hàng `delivery_proofs`. Lưu trữ đường dẫn `object_key` trên hệ thống Cloud/Amazon S3.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã file đính kèm |
| `delivery_proof_id`| Uuid | **Khóa ngoại (FK ➔ bảng delivery_proofs)**| Thuộc bằng chứng giao hàng nào |
| `file_type` | Enum | Bắt buộc | Loại file: `PHOTO` (Ảnh chụp), `SIGNATURE` (Chữ ký điện tử) |
| `object_key` | VarChar(500)| Bắt buộc | Đường dẫn lưu trữ Cloud/S3. VD: `pod/2026/07/proof_99.jpg` |

---

## ⚙️ MODULE 9: SYSTEM CONFIGURATION (Cấu hình Tham số AI & Hệ thống)

### 38. Bảng `system_settings` (Tham số Siêu cấu hình AI / GPS)
📌 **Chức năng của bảng:** Lưu trữ tất cả các tham số siêu cấu hình vận hành hệ thống và thuật toán AI (bán kính phân cụm K-Means `kmeans_cluster_radius_km`, kích thước quần thể `ga_population_size`, số thế hệ tối đa `ga_max_generations`, tỷ lệ đột biến `ga_mutation_rate`, chu kỳ phát GPS `gps_sync_interval_sec`). Cho phép Admin điều chỉnh tham số AI linh hoạt trên giao diện Web mà không cần khởi động lại Server.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `id` | Uuid | **Khóa chính (PK)** | Mã tham số |
| `setting_key` | VarChar(100) | Khóa duy nhất (Unique), Bắt buộc | Khóa cấu hình: `kmeans_cluster_radius_km`, `ga_population_size`, `ga_max_generations`, `ga_mutation_rate`, `gps_sync_interval_sec` |
| `setting_value` | Text | Bắt buộc | Giá trị cấu hình: `"5.0"`, `"100"`, `"500"`, `"0.05"`, `"3"` |
| `value_type` | Enum | Bắt buộc | Kiểu dữ liệu: `INTEGER`, `DECIMAL`, `STRING`, `BOOLEAN`, `JSON` |
| `category` | Enum | Bắt buộc | Phân nhóm: `AI`, `ROUTING`, `GPS`, `SYSTEM` |
| `updated_by` | Uuid | **Khóa ngoại (FK ➔ bảng users)** | Admin thực hiện chỉnh sửa cấu hình gần nhất |

---

## 🗺️ MODULE 10: VIETNAMESE ADMINISTRATIVE UNITS (Đơn vị Hành chính Việt Nam)

### 39. Bảng `provinces` (Tỉnh / Thành phố)
📌 **Chức năng của bảng:** Quản lý danh mục mã và tên các Tỉnh / Thành phố trực thuộc Trung ương của Việt Nam (dùng để seed dữ liệu chuẩn địa chính quốc gia).

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `code` | VarChar(20) | **Khóa chính (PK)** | Mã tỉnh/thành. VD: `79` (TP.HCM), `01` (Hà Nội) |
| `name` | VarChar(255) | Bắt buộc | Tên tỉnh thành. VD: `Thành phố Hồ Chí Minh` |
| `full_name` | VarChar(255) | Bắt buộc | Tên đầy đủ địa chính. VD: `Thành phố Hồ Chí Minh` |

---

### 40. Bảng `wards` (Phường / Xã - Trực thuộc Tỉnh/TP)
📌 **Chức năng của bảng:** Quản lý danh mục các Phường / Xã liên kết trực tiếp với Tỉnh / Thành phố theo mô hình địa chính 2 cấp (Tỉnh/TP ➔ Phường/Xã) phục vụ việc chọn địa chỉ chuyển phát nhanh chóng trên Web và Mobile App.

| Tên trường | Kiểu dữ liệu | Loại Khóa & Ràng buộc | Ý nghĩa & Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `code` | VarChar(20) | **Khóa chính (PK)** | Mã phường xã. VD: `26830` |
| `name` | VarChar(255) | Bắt buộc | Tên phường xã. VD: `Phường 14` |
| `province_code` | VarChar(20) | **Khóa ngoại (FK ➔ bảng provinces)** | Thuộc Tỉnh/TP nào (Mô hình địa chính 2 cấp Tỉnh ➔ Phường/Xã) |

---

## 💡 KẾT LUẬN

Tài liệu Tự điển CSDL này hiện tại đã có đầy đủ mục **📌 Chức năng của bảng** trên tất cả 40 bảng dữ liệu, được bổ sung chi tiết về **Khóa chính (PK)**, **Khóa ngoại (FK)**, **Cặp khóa chính (Composite PK)**, **Khóa ngoại 1-1** và đồng bộ 100% với mã nguồn Prisma Schema (`schema.prisma`) và Báo cáo Thẩm định Kiến trúc. 

Bạn có thể sử dụng file tài liệu này để giải trình mượt mà mục đích của từng bảng trước Giảng viên và Hội đồng phản biện!
