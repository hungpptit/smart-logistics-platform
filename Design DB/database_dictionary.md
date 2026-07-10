# 📖 TỰ ĐIỂN CƠ SỞ DỮ LIỆU (DATABASE DICTIONARY) - PHASE 1

Tài liệu này tổng hợp toàn bộ 39 bảng dữ liệu chia theo 9 Module phục vụ cho hệ thống Smart Logistics Platform. Định dạng được trình bày theo dạng bảng gồm: Tên trường, Kiểu dữ liệu, Ý nghĩa kèm ví dụ thực tế giúp bạn dễ dàng thuyết trình trước giáo viên.

---

## 🔐 MODULE 1: AUTHENTICATION & AUTHORIZATION (Xác thực & Phân quyền)

### 1. Bảng `users` (Tài khoản người dùng)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã định danh duy nhất của người dùng. VD: `550e8400-e29b-41d4-a716-446655440000` |
| `username` | VarChar(50) | Tên đăng nhập (Duy nhất). VD: `hung_admin`, `driver_binh`, `khach_vinamilk` |
| `email` | VarChar(255) | Email tài khoản (Duy nhất). VD: `hung.nguyen@smartlog.com` |
| `password_hash`| Text | Mật khẩu đã được mã hóa Bcrypt bảo mật. VD: `$2b$10$R9hKBt...` |
| `phone` | VarChar(20) | Số điện thoại liên hệ. VD: `0987654321` |
| `avatar_url` | Text | Đường dẫn ảnh đại diện. VD: `https://smartlog.com/avatars/u_882.jpg` |
| `status` | Enum (UserStatus)| Trạng thái hoạt động tài khoản: `ACTIVE` (đang chạy), `LOCKED` (khóa tạm thời), `DISABLED` (vô hiệu hóa) |
| `last_login_at`| Timestamptz | Lần cuối cùng tài khoản đăng nhập thành công. VD: `2026-07-02 18:00:00+07` |
| `created_at` | Timestamptz | Thời điểm tạo tài khoản. VD: `2026-06-30 08:30:00+07` |
| `updated_at` | Timestamptz | Thời điểm cập nhật thông tin tài khoản gần nhất. |
| `deleted_at` | Timestamptz | Thời điểm xóa mềm (nếu có - dùng để ẩn tài khoản mà không xóa hẳn khỏi DB). |

---

### 2. Bảng `roles` (Vai trò)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã định danh duy nhất của vai trò. VD: `a1b2c3d4-e5f6...` |
| `role_code` | VarChar(30) | Mã vai trò viết liền viết hoa. VD: `ADMIN`, `DRIVER`, `CUSTOMER`, `DISPATCHER` |
| `role_name` | VarChar(100) | Tên hiển thị của vai trò. VD: "Quản trị viên", "Tài xế giao nhận", "Nhân viên điều phối" |
| `description` | Text | Mô tả chức năng của vai trò. VD: "Tài xế được quyền dùng app mobile xem lộ trình giao nhận hàng." |
| `created_at` | Timestamptz | Thời gian tạo vai trò trong hệ thống. |

---

### 3. Bảng `permissions` (Quyền hạn chi tiết)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã định danh duy nhất của quyền. |
| `permission_code`| VarChar(50) | Mã quyền viết liền ngăn cách bằng dấu hai chấm. VD: `order:create` (tạo đơn), `shipment:update` (cập nhật chuyến xe), `facility:delete` (xóa kho) |
| `permission_name`| VarChar(100) | Tên hiển thị của quyền. VD: "Tạo đơn hàng", "Cập nhật chuyến xe" |
| `module` | VarChar(50) | Quyền này thuộc nhóm chức năng nào. VD: `orders`, `shipments`, `facilities` |
| `description` | Text | Mô tả chi tiết về thao tác quyền này cho phép thực hiện. |
| `created_at` | Timestamptz | Thời gian tạo quyền. |

---

### 4. Bảng `user_roles` (Liên kết Tài khoản - Vai trò)
*Bảng trung gian để thiết lập quan hệ Nhiều - Nhiều giữa tài khoản và vai trò.*
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `user_id` | Uuid (FK) (Composite PK) | Khóa ngoại nối sang `users(id)` để xác định tài khoản nào được phân quyền. |
| `role_id` | Uuid (FK) (Composite PK) | Khóa ngoại nối sang `roles(id)` để xác định vai trò nào được gán cho tài khoản. |
| `assigned_at` | Timestamptz | Thời điểm cấp vai trò này cho tài khoản. VD: `2026-07-01 10:15:00+07` |
| `assigned_by` | Uuid (FK) | Người thực hiện cấp quyền này (chỉ đến `users(id)` của Admin). |

* **Giải thích liên kết:** 
  * `user_id` liên kết với `users(id)`: Xác định người dùng nào được cấp quyền.
  * `role_id` liên kết với `roles(id)`: Xác định vai trò nào được gán cho người dùng đó.
  * `assigned_by` liên kết với `users(id)`: Lưu trữ người quản trị đã phê duyệt cấp quyền này.

---

### 5. Bảng `role_permissions` (Liên kết Vai trò - Quyền hạn)
*Bảng trung gian thiết lập quan hệ Nhiều - Nhiều giữa vai trò và các quyền chi tiết.*
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `role_id` | Uuid (FK) (Composite PK) | Khóa ngoại nối đến bảng `roles(id)` |
| `permission_id`| Uuid (FK) (Composite PK) | Khóa ngoại nối đến bảng `permissions(id)` |

* **Giải thích liên kết:**
  * `role_id` liên kết với `roles(id)`: Chỉ định vai trò nào chứa quyền này.
  * `permission_id` liên kết với `permissions(id)`: Chỉ định hành động chi tiết nào vai trò đó được phép làm.

---

### 6. Bảng `staff_profiles` (Hồ sơ nhân sự vận hành)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã định danh duy nhất của hồ sơ nhân viên. |
| `user_id` | Uuid (FK, Unique) | Khóa ngoại liên kết với tài khoản người dùng `users(id)`. |
| `citizen_id` | VarChar(20) | Số CCCD nhân viên (Duy nhất, Nullable). VD: `079123456789` |
| `assigned_facility_id` | Uuid (FK) | Khóa ngoại liên kết với bưu cục/kho được phân công `facilities(id)`. |
| `created_at` | Timestamptz | Thời điểm tạo hồ sơ. |
| `updated_at` | Timestamptz | Thời điểm cập nhật hồ sơ gần nhất. |
| `deleted_at` | Timestamptz | Thời điểm xóa mềm. |

* **Giải thích liên kết:**
  * `user_id` liên kết `users(id)`: Một tài khoản chỉ liên kết duy nhất với một hồ sơ nhân viên.
  * `assigned_facility_id` liên kết `facilities(id)`: Xác định nhân viên này trực thuộc kho hàng/bưu cục nào.

---

## 👥 MODULE 2: CUSTOMERS & ADDRESSES (Khách hàng & Sổ địa chỉ)

### 7. Bảng `customers` (Thông tin khách hàng)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã định danh duy nhất của khách hàng. |
| `user_id` | Uuid (FK, Unique)| Khóa ngoại liên kết với tài khoản hệ thống. Cho phép khách hàng đăng nhập web để theo dõi đơn hàng của chính mình. |
| `customer_code`| VarChar(30) | Mã khách hàng duy nhất. VD: `KH-VNM-001` (Khách hàng Vinamilk), `KH-CN-0982` (Khách hàng cá nhân) |
| `customer_type`| Enum (CustomerType)| Loại khách hàng: `INDIVIDUAL` (Cá nhân tự gửi hàng lẻ), `BUSINESS` (Doanh nghiệp ký hợp đồng logistics) |
| `company_name` | VarChar(255) | Tên đầy đủ của công ty (nếu là doanh nghiệp). VD: "Công ty Cổ phần Sữa Việt Nam Vinamilk" |
| `tax_code` | VarChar(30) | Mã số thuế doanh nghiệp phục vụ xuất hóa đơn GTGT. VD: `0102030405` |
| `status` | Enum (CustomerStatus)| Trạng thái khách hàng: `ACTIVE` (hoạt động bình thường), `INACTIVE` (ngừng hoạt động), `BLOCKED` (bị khóa do nợ cước) |
| `note` | Text | Ghi chú về khách hàng (Ví dụ: "Khách VIP, chiết khấu 10%") |
| `created_at` | Timestamptz | Thời điểm tạo thông tin khách hàng. |
| `updated_at` | Timestamptz | Thời điểm cập nhật cuối cùng. |
| `deleted_at` | Timestamptz | Thời điểm xóa mềm. |

* **Giải thích liên kết:**
  * `user_id` liên kết với `users(id)` (1-1): Khách hàng đăng ký tài khoản hệ thống sẽ được nối trực tiếp với thông tin tài khoản đăng nhập của họ.

---

### 8. Bảng `addresses` (Thông tin địa lý / Địa chỉ)
*Bảng tập trung chứa toàn bộ địa chỉ trong hệ thống (văn phòng, kho bãi, người nhận, người gửi).*
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã định danh địa chỉ. |
| `address_line_1`| VarChar(255) | Địa chỉ chi tiết (Số nhà, tên đường). VD: "Số 1 Đại Cồ Việt", "Tòa nhà Keangnam" |
| `address_line_2`| VarChar(255) | Thông tin bổ sung địa chỉ (Tòa nhà, tầng, phòng). VD: "Tòa A, Căn hộ 1205" |
| `ward` | VarChar(100) | Tên Phường / Xã. VD: "Phường Bách Khoa", "Xã Tiền Phong" |
| `province` | VarChar(100) | Tên Tỉnh / Thành phố. VD: "Hà Nội", "Tỉnh Vĩnh Phúc" |
| `country` | VarChar(100) | Quốc gia. VD: "Vietnam", "Japan" |
| `postal_code` | VarChar(20) | Mã bưu chính khu vực. VD: `100000` (Hà Nội) |
| `latitude` | DoublePrecision | Vĩ độ GPS dùng để xác định tọa độ chính xác trên bản đồ. VD: `21.0076` |
| `longitude` | DoublePrecision | Kinh độ GPS dùng để xác định tọa độ chính xác trên bản đồ. VD: `105.8430` |
| `formatted_address`| Text | Địa chỉ dạng chuỗi hoàn chỉnh. VD: "Số 1 Đại Cồ Việt, Phường Bách Khoa, Hà Nội, Vietnam" |
| `place_id` | VarChar(255) | Mã địa điểm trên Google Maps / Goong Map để truy xuất nhanh. VD: `ChIJo-7_Qn2sNTER...` |
| `created_at` | Timestamptz | Thời điểm tạo. |
| `updated_at` | Timestamptz | Thời điểm cập nhật. |

---

### 9. Bảng `customer_addresses` (Sổ địa chỉ của khách hàng)
*Bảng liên kết Nhiều - Nhiều giữa khách hàng và các địa chỉ của họ.*
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã định danh liên kết. |
| `customer_id` | Uuid (FK) | Khóa ngoại nối sang `customers(id)` |
| `address_id` | Uuid (FK) | Khóa ngoại nối sang `addresses(id)` |
| `address_type` | Enum (CustomerAddressType)| Loại địa chỉ: `HOME` (nhà riêng), `OFFICE` (văn phòng làm việc), `WAREHOUSE` (kho chứa hàng của khách), `RETURN` (địa chỉ nhận lại hàng hoàn) |
| `is_default` | Boolean | Địa chỉ mặc định của khách để tự động điền khi tạo đơn (`true` hoặc `false`). |
| `created_at` | Timestamptz | Ngày tạo. |

* **Giải thích liên kết:**
  * `customer_id` liên kết `customers(id)`: Khách hàng nào sở hữu địa chỉ này.
  * `address_id` liên kết `addresses(id)`: Nối tới bảng địa chỉ chi tiết chứa tọa độ vĩ độ/kinh độ.

---

### 10. Bảng `customer_contacts` (Danh bạ người liên hệ)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã định danh người liên hệ. |
| `customer_id` | Uuid (FK) | Khóa ngoại nối sang `customers(id)` để xác định người này đại diện cho khách hàng nào. |
| `full_name` | VarChar(150) | Họ và tên người liên hệ. VD: "Nguyễn Văn A" |
| `phone` | VarChar(20) | Số điện thoại liên hệ. VD: `0901234567` |
| `email` | VarChar(255) | Email người liên hệ. VD: `nguyenvana@gmail.com` |
| `position` | VarChar(100) | Chức vụ trong công ty (nếu là khách doanh nghiệp). VD: "Trưởng phòng Thu mua", "Thủ kho" |
| `is_primary` | Boolean | Có phải liên hệ chính hay không (`true`/`false`) |
| `note` | Text | Ghi chú thêm. VD: "Chỉ gọi điện vào giờ hành chính" |
| `created_at` | Timestamptz | Ngày tạo. |

* **Giải thích liên kết:**
  * `customer_id` liên kết `customers(id)`: Người liên hệ này đại diện cho khách hàng nào.

---

## 🏢 MODULE 3: FACILITY NETWORK (Mạng lưới Kho bãi)

### 11. Bảng `facility_types` (Loại kho bãi)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã loại kho bãi. |
| `type_code` | VarChar(30) | Mã loại viết liền viết hoa. VD: `HUB` (Kho phân loại tổng), `POST` (Bưu cục nhỏ nhận/phát hàng), `DC` (Trung tâm phân phối) |
| `type_name` | VarChar(100) | Tên hiển thị loại kho. VD: "Kho trung chuyển", "Bưu cục nhận hàng" |
| `description` | Text | Mô tả nhiệm vụ của loại kho bãi này. |
| `created_at` | Timestamptz | Ngày tạo. |

---

### 12. Bảng `facilities` (Mạng lưới Kho bãi/Bưu cục)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã kho bãi cụ thể. |
| `facility_code`| VarChar(30) | Mã định danh kho bãi duy nhất. VD: `HAN_HUB` (Tổng kho Hà Nội), `SGN_POST_Q1` (Bưu cục Quận 1) |
| `facility_name`| VarChar(255) | Tên đầy đủ kho. VD: "Kho trung chuyển Bắc Ninh", "Bưu cục Cầu Giấy" |
| `facility_type_id`| Uuid (FK) | Khóa ngoại loại kho bãi, nối tới `facility_types(id)`. |
| `parent_facility_id`| Uuid (FK) | Khóa ngoại tự tham chiếu tới kho cấp trên để vẽ sơ đồ hình cây. VD: Bưu cục Cầu Giấy trực thuộc quản lý của Tổng kho Hà Nội. |
| `operating_status`| Enum (FacilityStatus)| Trạng thái hoạt động kho: `ACTIVE` (đang mở cửa), `INACTIVE` (ngừng hoạt động), `MAINTENANCE` (bảo trì hệ thống băng tải), `CLOSED` (đã đóng cửa) |
| `opened_at` | Date | Ngày bắt đầu mở cửa vận hành. VD: `2026-01-01` |
| `closed_at` | Date | Ngày đóng cửa (nếu dừng hoạt động). |
| `note` | Text | Ghi chú thêm về kho bãi. |
| `created_at` | Timestamptz | Ngày tạo. |
| `updated_at` | Timestamptz | Ngày cập nhật. |
| `deleted_at` | Timestamptz | Ngày xóa mềm. |

* **Giải thích liên kết:**
  * `facility_type_id` liên kết `facility_types(id)`: Để định nghĩa kho này là tổng kho, kho phân loại cấp tỉnh, hay bưu cục địa phương.
  * `parent_facility_id` liên kết `facilities(id)` (Quan hệ cha-con): Giúp thiết lập mô hình cây phân cấp mạng lưới kho (Bưu cục cấp dưới trực thuộc Tổng kho cấp trên).

---

### 13. Bảng `facility_addresses` (Địa chỉ của kho bãi)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã định danh liên kết. |
| `facility_id` | Uuid (FK) | Khóa ngoại nối tới `facilities(id)` |
| `address_id` | Uuid (FK) | Khóa ngoại nối tới `addresses(id)` để lấy tọa độ kinh độ/vĩ độ định vị kho. |
| `address_type` | Enum (FacilityAddressType)| Loại địa chỉ kho: `MAIN` (Trụ sở kho chính), `PICKUP` (Nơi xe tải vào bốc hàng), `RETURN` (Nơi tập kết hàng hoàn trả) |
| `is_primary` | Boolean | Địa chỉ chính của kho (`true`/`false`). |
| `created_at` | Timestamptz | Ngày gán địa chỉ. |

* **Giải thích liên kết:**
  * `facility_id` liên kết `facilities(id)`: Kho bãi nào sở hữu địa chỉ này.
  * `address_id` liên kết `addresses(id)`: Nối tới bảng địa chỉ chứa thông tin kinh độ/vĩ độ GPS để tính lộ trình.

---

### 14. Bảng `facility_zones` (Phân khu trong kho bãi)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã phân khu. |
| `facility_id` | Uuid (FK) | Khóa ngoại nối tới kho chứa phân khu đó (`facilities(id)`). |
| `zone_code` | VarChar(30) | Mã khu vực viết liền. VD: `ZONE_A`, `SORT_LINE_1`, `COLD_STORAGE` |
| `zone_name` | VarChar(100) | Tên phân khu. VD: "Khu vực phân loại hàng nhẹ", "Khu đông lạnh hàng đặc biệt" |
| `zone_type` | Enum (FacilityZoneType)| Loại phân khu: `RECEIVING` (khu nhận hàng), `SORTING` (khu phân loại), `STORAGE` (khu lưu kho), `DISPATCH` (khu xuất hàng ra xe), `RETURN` (khu chứa hàng hoàn), `QUARANTINE` (khu cách ly hàng hỏng) |
| `capacity` | Int | Sức chứa tối đa của phân khu (tính theo số pallet hoặc số thùng). VD: `500` |
| `created_at` | Timestamptz | Ngày tạo. |
| `updated_at` | Timestamptz | Ngày cập nhật. |

* **Giải thích liên kết:**
  * `facility_id` liên kết `facilities(id)`: Xác định phân khu này nằm trong kho cụ thể nào.

---

## 📦 MODULE 4: ORDERS & SERVICES (Dịch vụ & Quản lý Đơn hàng)

### 15. Bảng `services` (Bảng giá & Dịch vụ Vận chuyển)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã dịch vụ. |
| `service_code` | VarChar(30) | Mã dịch vụ viết hoa. VD: `EXPRESS` (Hỏa tốc), `STANDARD` (Tiêu chuẩn), `COLD_CHAIN` (Giao hàng lạnh) |
| `service_name` | VarChar(100) | Tên dịch vụ. VD: "Giao hàng Hỏa tốc 2h", "Giao hàng lạnh đặc chủng" |
| `base_price` | Decimal(12,2) | Giá sàn tối thiểu cho cước vận chuyển. VD: `15000.00` VND (nếu đi cự ly siêu ngắn) |
| `free_distance_km`| Float | Số km đầu tiên được miễn cước khoảng cách. VD: `2.0` km (trong 2km đầu chỉ tính giá base) |
| `price_per_km` | Decimal(12,2) | Đơn giá cộng thêm trên mỗi km tiếp theo. VD: `5000.00` VND/km |
| `free_weight_kg` | Float | Số cân nặng đầu tiên được miễn cước khối lượng. VD: `1.0` kg |
| `price_per_kg` | Decimal(12,2) | Đơn giá cộng thêm trên mỗi kg tăng thêm. VD: `3000.00` VND/kg |
| `estimated_delivery_hours`| Int | Thời gian giao hàng dự kiến (tính theo giờ). VD: `24` giờ (Standard), `2` giờ (Express) |
| `pricing_version`| Int | Phiên bản bảng giá để đối chiếu kế toán khi có sự thay đổi giá. VD: `1`, `2` |
| `description` | Text | Mô tả chi tiết dịch vụ. VD: "Giao hàng bằng thùng giữ nhiệt lạnh từ 2-8 độ C." |
| `is_active` | Boolean | Dịch vụ có đang được mở bán cho khách đặt đơn không (`true`/`false`). |
| `created_at` | Timestamptz | Ngày tạo dịch vụ. |
| `updated_at` | Timestamptz | Ngày cập nhật giá. |

---

### 16. Bảng `orders` (Quản lý Đơn hàng)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã đơn hàng. |
| `customer_id` | Uuid (FK) | Khóa ngoại chỉ định khách hàng tạo đơn, nối tới `customers(id)`. |
| `order_code` | VarChar(30) | Mã đơn hàng hiển thị (Duy nhất). VD: `ORD-2026-000492` |
| `status` | Enum (OrderStatus) | Trạng thái đơn: `CREATED` (Mới tạo), `WAITING_PICKUP` (Chờ tài xế đến lấy), `PICKING` (Tài xế đang đi lấy), `ARRIVED_ORIGIN_FACILITY` (Hàng đã về bưu cục gốc)... |
| `service_id` | Uuid (FK) | Khóa ngoại nối sang gói dịch vụ áp dụng, nối tới `services(id)`. |
| `pickup_address_id`| Uuid (FK) | Khóa ngoại nối sang địa chỉ gốc lấy hàng, nối tới `addresses(id)`. |
| `sender_contact_id`| Uuid (FK) | Khóa ngoại nối sang danh bạ người gửi, nối tới `customer_contacts(id)`. |
| `sender_name` | VarChar(150) | Tên người gửi (Lưu snapshot tránh việc đổi tên trong danh bạ làm sai lệch lịch sử đơn cũ). VD: "Trần Văn B" |
| `sender_phone` | VarChar(20) | SĐT người gửi. VD: `0909999888` |
| `pickup_address_text`| Text | Địa chỉ lấy hàng dạng chuỗi (Lưu snapshot). VD: "Số 10 Lý Thường Kiệt, Q.1, TP. HCM" |
| `pickup_latitude`| DoublePrecision | Vĩ độ nơi lấy hàng (Lưu snapshot). VD: `10.7765` |
| `pickup_longitude`| DoublePrecision | Kinh độ nơi lấy hàng (Lưu snapshot). VD: `106.7009` |
| `delivery_address_id`| Uuid (FK) | Khóa ngoại nối sang địa chỉ đích giao hàng, nối tới `addresses(id)`. |
| `receiver_contact_id`| Uuid (FK) | Khóa ngoại nối sang danh bạ người nhận, nối tới `customer_contacts(id)`. |
| `receiver_name`| VarChar(150) | Tên người nhận (Lưu snapshot). VD: "Nguyễn Thị C" |
| `receiver_phone`| VarChar(20) | SĐT người nhận. VD: `0911222333` |
| `delivery_address_text`| Text | Địa chỉ giao hàng dạng chuỗi (Lưu snapshot). VD: "123 Nguyễn Trãi, Thanh Xuân, Hà Nội" |
| `delivery_latitude`| DoublePrecision | Vĩ độ nơi giao hàng (Lưu snapshot). VD: `20.9998` |
| `delivery_longitude`| DoublePrecision | Kinh độ nơi giao hàng (Lưu snapshot). VD: `105.8123` |
| `shipping_fee` | Decimal(12,2) | Phí vận chuyển tạm tính dựa trên khoảng cách và cân nặng. VD: `35000.00` VND |
| `insurance_fee`| Decimal(12,2) | Phí bảo hiểm hàng hóa khai giá. VD: `5000.00` VND |
| `cod_amount` | Decimal(12,2) | Tiền thu hộ COD (nếu có). VD: `500000.00` VND |
| `total_amount` | Decimal(12,2) | Tổng số tiền cần thanh toán của đơn hàng (shipping_fee + insurance_fee). VD: `40000.00` VND |
| `estimated_distance`| Decimal(10,2) | Khoảng cách ước tính giữa điểm gửi và điểm nhận. VD: `8.50` km |
| `estimated_duration`| Int | Thời gian di chuyển dự kiến (tính bằng phút). VD: `25` phút |
| `pricing_version`| Int | Phiên bản bảng giá áp dụng khi tạo đơn. VD: `1` |
| `estimated_delivery_date`| Timestamptz| Thời gian cam kết giao hàng thành công. VD: `2026-07-03 17:00:00+07` |
| `created_by` | Uuid (FK) | Khóa ngoại nhân viên thực hiện tạo đơn (nếu tạo hộ khách trên tổng đài). Nối tới `users(id)`. |
| `updated_by` | Uuid (FK) | Người cập nhật đơn gần nhất. Nối tới `users(id)`. |
| `created_at` | Timestamptz | Thời điểm tạo đơn. |
| `updated_at` | Timestamptz | Thời điểm cập nhật đơn. |
| `deleted_at` | Timestamptz | Thời điểm xóa đơn (nếu khách hàng hủy đơn). |

* **Giải thích liên kết:**
  * `customer_id` liên kết `customers(id)`: Đơn hàng thuộc sở hữu của khách hàng nào.
  * `service_id` liên kết `services(id)`: Đơn hàng chạy theo gói dịch vụ nào (Express, Standard) để áp công thức tính tiền cước.
  * `pickup_address_id` / `delivery_address_id` liên kết `addresses(id)`: Chỉ đến tọa độ gốc và tọa độ đích thực tế để chạy thuật toán định tuyến.
  * `sender_contact_id` / `receiver_contact_id` liên kết `customer_contacts(id)`: Lấy thông tin liên hệ của người gửi và người nhận.
  * `created_by` / `updated_by` liên kết `users(id)`: Nhân viên admin hoặc tổng đài viên tạo/sửa đơn cho khách.

---

### 17. Bảng `packages` (Kiện hàng vật lý)
*Một đơn hàng có thể có nhiều kiện hàng vật lý khác nhau.*
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã kiện hàng. |
| `order_id` | Uuid (FK) | Khóa ngoại liên kết tới đơn hàng gốc chứa kiện này, nối tới `orders(id)`. |
| `package_code` | VarChar(30) | Mã kiện hàng hiển thị (Để in mã vạch QR code dán lên hộp). VD: `PKG-10029381-01` |
| `weight` | Decimal(8,2) | Khối lượng kiện hàng (kg). VD: `2.50` kg |
| `length` | Decimal(6,2) | Chiều dài kiện (cm). VD: `30.00` cm |
| `width` | Decimal(6,2) | Chiều rộng kiện (cm). VD: `20.00` cm |
| `height` | Decimal(6,2) | Chiều cao kiện (cm). VD: `15.00` cm |
| `volume` | Decimal(10,4) | Thể tích kiện hàng (m³) phục vụ tính toán không gian chứa của thùng xe tải. VD: `0.0090` m³ |
| `is_fragile` | Boolean | Hàng có thuộc dạng dễ vỡ cần lưu ý không (`true`/`false`). |
| `temperature_requirement`| VarChar(50)| Yêu cầu nhiệt độ bảo quản. VD: "2-8 degree C" |
| `required_vehicle_type_id`| Uuid (FK) | Khóa ngoại yêu cầu loại xe chuyên chở, nối tới `vehicle_types(id)`. |
| `created_at` | Timestamptz | Ngày tạo kiện. |
| `updated_at` | Timestamptz | Ngày cập nhật kiện. |

* **Giải thích liên kết:**
  * `order_id` liên kết `orders(id)` (Nhiều - 1): Xác định kiện hàng này thuộc về đơn hàng nào.
  * `required_vehicle_type_id` liên kết `vehicle_types(id)`: Dùng khi hàng cồng kềnh cần chỉ định rõ là phải giao bằng xe tải chứ không thể dùng xe máy.

---

### 18. Bảng `order_payments` (Thông tin Thanh toán Đơn hàng)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã thanh toán. |
| `order_id` | Uuid (FK, Unique) | Khóa ngoại liên kết với đơn hàng gốc, nối tới `orders(id)`. |
| `shipping_fee` | Decimal(12,2) | Cước phí vận chuyển. VD: `35000.00` VND |
| `insurance_fee`| Decimal(12,2) | Phí bảo hiểm hàng. VD: `5000.00` VND |
| `cod_amount` | Decimal(12,2) | Tiền thu hộ COD (nếu có). VD: `500000.00` VND |
| `fee_payer` | Enum (FeePayer) | Người trả tiền cước: `SENDER` (Người gửi trả cước), `RECEIVER` (Người nhận trả cước - Ship COD) |
| `payment_method`| Enum (PaymentMethod)| Phương thức thanh toán: `CASH` (Tiền mặt), `BANK_TRANSFER` (Chuyển khoản), `E_WALLET` (Ví điện tử), `COD` (Thanh toán khi nhận hàng) |
| `payment_status`| Enum (PaymentStatus)| Trạng thái thanh toán: `UNPAID` (Chưa thanh toán), `PAID` (Đã thanh toán), `REFUNDED` (Đã hoàn tiền) |
| `created_at` | Timestamptz | Ngày tạo hóa đơn thanh toán. |
| `updated_at` | Timestamptz | Ngày cập nhật trạng thái thanh toán. |

* **Giải thích liên kết:**
  * `order_id` liên kết `orders(id)` (1-1): Nối trực tiếp với đơn hàng chính để đối soát dòng tiền thu hộ và phí dịch vụ.

---

### 19. Bảng `order_status_history` (Lịch sử cập nhật trạng thái đơn hàng)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã bản ghi lịch sử. |
| `order_id` | Uuid (FK) | Khóa ngoại liên kết tới đơn hàng, nối tới `orders(id)`. |
| `status` | Enum (OrderStatus) | Trạng thái đơn hàng tại thời điểm cập nhật. VD: `PICKED_UP`, `ARRIVED_ORIGIN_FACILITY` |
| `changed_by_user_id`| Uuid (FK) | Khóa ngoại lưu người thay đổi trạng thái đơn, nối tới `users(id)`. |
| `change_source`| Enum (OrderChangeSource)| Nguồn thay đổi: `SYSTEM` (hệ thống tự quét), `CUSTOMER` (khách hủy), `DRIVER` (tài xế bấm nhận), `ADMIN` (admin chuyển trạng thái) |
| `reason` | Text | Lý do thay đổi trạng thái. VD: "Khách hẹn giao lại vào ngày mai do đi vắng." |
| `created_at` | Timestamptz | Thời điểm trạng thái được cập nhật. |

* **Giải thích liên kết:**
  * `order_id` liên kết `orders(id)`: Ghi lại lịch sử di chuyển trạng thái của một đơn hàng cụ thể.
  * `changed_by_user_id` liên kết `users(id)`: Ai là người chuyển trạng thái đơn (tài xế quét nhận hàng, admin đổi trạng thái trên portal...).

---

## 🚚 MODULE 5: SHIPMENT MANAGEMENT (Quản lý Vận đơn / Chuyến hàng)

### 20. Bảng `shipments` (Quản lý Vận đơn / Chuyến xe gom)
*Bảng này đại diện cho một đợt vận chuyển gom nhiều kiện hàng (gom hàng từ bưu cục về tổng kho hoặc gom đi giao hàng).*
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã vận đơn / Chuyến hàng. |
| `shipment_code`| VarChar(30) | Mã vận đơn hiển thị. VD: `SHP-2026-88019` |
| `status` | Enum (ShipmentStatus)| Trạng thái vận đơn: `CREATED` (Mới lập), `ASSIGNED` (Đã gán tài xế), `IN_TRANSIT` (Đang di chuyển trên đường), `AT_HUB` (Đang ở kho trung chuyển), `OUT_FOR_DELIVERY` (Đang đi giao chặng cuối), `DELIVERED` (Đã giao xong) |
| `route_id` | Uuid (FK) | Khóa ngoại liên kết với lộ trình tối ưu được gán cho chuyến xe này, nối tới `routes(id)`. |
| `created_by` | Uuid (FK) | Người lập chuyến xe vận đơn này, nối tới `users(id)`. |
| `updated_by` | Uuid (FK) | Người cập nhật gần nhất, nối tới `users(id)`. |
| `created_at` | Timestamptz | Ngày tạo. |
| `updated_at` | Timestamptz | Ngày sửa đổi. |
| `deleted_at` | Timestamptz | Ngày xóa chuyến. |

* **Giải thích liên kết:**
  * `route_id` liên kết `routes(id)`: Lộ trình tối ưu do thuật toán AI đề xuất cho chuyến xe này đi thực tế.

---

### 21. Bảng `shipment_packages` (Chi tiết Kiện hàng trong Vận đơn)
*Bảng liên kết Nhiều - Nhiều chỉ ra chuyến xe vận đơn này đang chứa những kiện hàng nào.*
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã liên kết. |
| `shipment_id` | Uuid (FK) | Khóa ngoại nối sang chuyến vận đơn `shipments(id)` |
| `package_id` | Uuid (FK) | Khóa ngoại nối sang kiện hàng `packages(id)` |
| `created_at` | Timestamptz | Ngày đưa kiện hàng lên xe xếp tải. |

* **Giải thích liên kết:**
  * `shipment_id` liên kết `shipments(id)`: Chuyến xe gom/giao hàng.
  * `package_id` liên kết `packages(id)`: Kiện hàng vật lý nằm trong xe tải.

---

### 22. Bảng `shipment_events` (Sự kiện xảy ra với chuyến xe vận đơn)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã sự kiện. |
| `shipment_id` | Uuid (FK) | Khóa ngoại nối tới chuyến xe `shipments(id)` |
| `event_type` | Enum (ShipmentEventType)| Loại sự kiện: `DRIVER_ASSIGNED` (Tài xế nhận xe), `DEPARTED_FACILITY` (Xe xuất phát rời kho), `ARRIVED_FACILITY` (Xe cập bến kho đích), `EXCEPTION_OCCURRED` (Gặp sự cố trên đường) |
| `facility_id` | Uuid (FK) | Khóa ngoại định vị sự kiện xảy ra ở kho bãi nào (nếu có). Nối tới `facilities(id)`. |
| `latitude` | DoublePrecision | Tọa độ vĩ độ GPS nơi xảy ra sự kiện. VD: `10.7989` |
| `longitude` | DoublePrecision | Tọa độ kinh độ GPS nơi xảy ra sự kiện. VD: `106.7523` |
| `event_time` | Timestamptz | Thời gian thực tế xảy ra sự kiện. VD: `2026-07-02 14:30:00+07` |
| `created_by` | Uuid (FK) | Người báo cáo sự kiện (thường là tài xế bấm trên app), nối tới `users(id)`. |
| `notes` | Text | Ghi chú thêm về sự kiện. VD: "Xịt lốp xe tại Quốc lộ 1A" |

* **Giải thích liên kết:**
  * `shipment_id` liên kết `shipments(id)`: Sự kiện này gắn với chuyến xe tải nào.
  * `facility_id` liên kết `facilities(id)`: Điểm kho xảy ra sự kiện (ví dụ: xe cập bến tổng kho SGN).
  * `created_by` liên kết `users(id)`: Người báo cáo sự kiện.

---

### 23. Bảng `shipment_transfers` (Yêu cầu Trung chuyển Liên kho)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã yêu cầu trung chuyển. |
| `shipment_id` | Uuid (FK) | Khóa ngoại chỉ định chuyến xe vận tải chở lô hàng này đi, nối tới `shipments(id)`. |
| `from_facility_id`| Uuid (FK) | Khóa ngoại kho xuất phát trung chuyển. Nối tới `facilities(id)`. |
| `to_facility_id` | Uuid (FK) | Khóa ngoại kho đích nhận hàng trung chuyển. Nối tới `facilities(id)`. |
| `status` | Enum (TransferStatus)| Trạng thái trung chuyển: `PENDING` (Chờ bốc xếp), `IN_TRANSIT` (Đang đi trên đường liên tỉnh), `ARRIVED` (Đã cập bến kho nhận), `REJECTED` (Thủ kho từ chối nhận do lỗi) |
| `dispatched_at` | Timestamptz | Thời điểm xe xuất phát đi trung chuyển. |
| `arrived_at` | Timestamptz | Thời điểm xe cập bến và bàn giao hàng cho kho đích. |
| `received_by` | Uuid (FK) | Khóa ngoại định danh thủ kho đích ký nhận hàng đến, nối tới `users(id)`. |

* **Giải thích liên kết:**
  * `shipment_id` liên kết `shipments(id)`: Chuyến vận đơn chở lô hàng trung chuyển này đi.
  * `from_facility_id` / `to_facility_id` liên kết `facilities(id)`: Điểm xuất phát và đích đến của tuyến đường liên kho (VD: đi từ kho Hà Nội đến kho Đà Nẵng).
  * `received_by` liên kết `users(id)`: Nhân viên kho thực hiện việc quét mã nhập kho (inbound) để xác thực đã nhận hàng đầy đủ.

---

## 🚚 MODULE 6: FLEET & DRIVER MANAGEMENT (Đội xe & Tài xế)

### 24. Bảng `drivers` (Thông tin Tài xế)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã tài xế. |
| `user_id` | Uuid (FK, Unique)| Khóa ngoại liên kết tài khoản đăng nhập của tài xế, nối tới `users(id)`. |
| `employee_code`| VarChar(30) | Mã nhân viên tài xế. VD: `DRV-0089` |
| `full_name` | VarChar(150) | Họ và tên tài xế. VD: "Nguyễn Văn Bính" |
| `phone` | VarChar(20) | Số điện thoại tài xế (Duy nhất). VD: `0989123456` |
| `citizen_id` | VarChar(20) | Số CCCD tài xế (Duy nhất, Nullable). VD: `079876543210` |
| `driver_license_number`| VarChar(50)| Số bằng lái xe / Giấy phép lái xe. VD: `290123456789` |
| `driver_license_class`| VarChar(10) | Hạng bằng lái xe cao nhất được cấp. VD: `B2`, `C`, `E` |
| `hire_date` | Date | Ngày tuyển dụng vào công ty. VD: `2025-06-01` |
| `employment_status`| Enum (DriverEmploymentStatus)| Trạng thái làm việc tài xế: `ACTIVE` (đang sẵn sàng chạy ca), `OFFLINE` (đang nghỉ ca), `SUSPENDED` (tạm dừng do vi phạm) |
| `preferred_latitude`| DoublePrecision | Vĩ độ của điểm Driver Affinity (Khu vực hoạt động ưu tiên). VD: `10.7765` |
| `preferred_longitude`| DoublePrecision| Kinh độ của điểm Driver Affinity (Khu vực hoạt động ưu tiên). VD: `106.7009` |
| `driver_type` | Enum (DriverType) | Phân loại nhóm tài xế để phân luồng dịch vụ: `HUB_DELIVERY` (Tiêu chuẩn), `ON_DEMAND` (Hỏa tốc) |
| `home_facility_id`| Uuid (FK) | Khóa ngoại xác định bưu cục/kho tài xế trực thuộc hoạt động chính, nối tới `facilities(id)`. |
| `note` | Text | Ghi chú thêm về tài xế (Ví dụ: "Chuyên chạy xe tải đông lạnh tuyến dài") |
| `created_at` | Timestamptz | Ngày tạo hồ sơ tài xế. |
| `updated_at` | Timestamptz | Ngày cập nhật. |
| `deleted_at` | Timestamptz | Ngày xóa tài xế. |

* **Giải thích liên kết:**
  * `user_id` liên kết `users(id)` (1-1): Liên kết với tài khoản để tài xế đăng nhập vào ứng dụng mobile của tài xế (Driver App).
  * `home_facility_id` liên kết `facilities(id)`: Nối tới bưu cục để thuật toán gán đơn lấy hàng cho tài xế cư trú gần khu vực bưu cục đó.

---

### 25. Bảng `vehicles` (Thông tin Xe tải / Phương tiện)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã phương tiện. |
| `vehicle_code` | VarChar(30) | Mã số xe nội bộ công ty quản lý. VD: `VEH-T-015` |
| `license_plate`| VarChar(20) | Biển kiểm soát / Biển số xe (Duy nhất). VD: `29C-123.45`, `51D-999.99` |
| `vehicle_type_id`| Uuid (FK) | Khóa ngoại loại xe (xe máy, xe tải), nối tới `vehicle_types(id)`. |
| `home_facility_id`| Uuid (FK) | Khóa ngoại bãi xe trực thuộc tại kho nào, nối tới `facilities(id)`. |
| `max_weight` | Decimal(10,2) | Tải trọng khối lượng tối đa chở được (kg). VD: `5000.00` kg (Xe tải 5 tấn) |
| `max_volume` | Decimal(10,4) | Thể tích thùng chứa tối đa chở được (m³). VD: `25.5000` m³ |
| `max_length` | Decimal(6,2) | Chiều dài tối đa thùng xe (m). VD: `6.20` m |
| `refrigeration_supported`| Boolean | Xe có thùng bảo ôn lạnh để chở hàng đông lạnh không (`true`/`false`). |
| `gps_device_id`| VarChar(100) | Mã định danh thiết bị định vị GPS (hộp đen) gắn cứng trên xe. VD: `GPS-Device-9981a` |
| `operating_status`| Enum (VehicleOperatingStatus)| Trạng thái vận hành xe: `ACTIVE` (đang hoạt động), `MAINTENANCE` (đang nằm xưởng sửa chữa), `RETIRED` (đã thanh lý thanh thải) |
| `created_at` | Timestamptz | Ngày đăng ký xe. |
| `updated_at` | Timestamptz | Ngày cập nhật. |

* **Giải thích liên kết:**
  * `vehicle_type_id` liên kết `vehicle_types(id)`: Phân loại nhóm xe (xe máy, xe bán tải, xe tải 5 tấn...).
  * `home_facility_id` liên kết `facilities(id)`: Xe này thuộc bãi xe của kho bãi nào quản lý.

---

### 26. Bảng `vehicle_types` (Loại phương tiện)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã loại xe. |
| `type_code` | VarChar(30) | Mã phân loại viết liền. VD: `MOTORBIKE`, `VAN_1T`, `TRUCK_5T`, `TRUCK_10T` |
| `type_name` | VarChar(100) | Tên hiển thị loại xe. VD: "Xe máy giao nhận", "Xe tải 5 tấn" |
| `max_default_weight`| Decimal(10,2) | Khối lượng tải mặc định cho nhóm xe này (kg). VD: `1000.00` kg |
| `description` | Text | Mô tả chi tiết thùng xe hoặc kích cỡ. |
| `created_at` | Timestamptz | Ngày tạo. |

---

### 27. Bảng `driver_vehicle_assignments` (Lịch phân công Tài xế lái Xe)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã phiên phân công bàn giao xe. |
| `driver_id` | Uuid (FK) | Khóa ngoại tài xế lái xe, nối sang `drivers(id)` |
| `vehicle_id` | Uuid (FK) | Khóa ngoại xe được gán cho tài xế chạy ca, nối sang `vehicles(id)` |
| `assigned_from`| Timestamptz | Thời điểm bắt đầu giao xe cho tài xế chạy ca. VD: `2026-07-02 08:00:00+07` |
| `assigned_to` | Timestamptz | Thời điểm kết thúc ca lái trả lại xe cho bãi (nếu có). |
| `is_active` | Boolean | Phiên bàn giao xe này hiện tại có đang hiệu lực không (`true`/`false`). |

* **Giải thích liên kết:**
  * `driver_id` liên kết `drivers(id)` và `vehicle_id` liên kết `vehicles(id)`: Khớp nối 1 tài xế với 1 phương tiện cụ thể trong ca làm việc. Lộ trình di chuyển sau đó sẽ gán theo mã phân công này.

---

### 28. Bảng `driver_locations` (Tọa độ GPS Trực tuyến của Tài xế)
*Cập nhật thời gian thực tọa độ GPS của tài xế phục vụ theo dõi trực tiếp đơn hàng.*
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `driver_id` | Uuid (FK, Unique)| Mã tài xế định vị (Khóa ngoại nối sang `drivers(id)` đồng thời là PK luôn). |
| `latitude` | DoublePrecision | Vĩ độ GPS hiện tại đo được từ thiết bị di động tài xế. VD: `10.7765` |
| `longitude` | DoublePrecision | Kinh độ GPS hiện tại đo được từ thiết bị di động tài xế. VD: `106.7009` |
| `heading` | Real | Hướng di chuyển (góc độ từ 0 - 360). VD: `180.0` (Hướng Nam) |
| `speed` | Real | Vận tốc di chuyển tức thời (m/s). VD: `12.5` m/s (Khoảng 45 km/h) |
| `accuracy` | Real | Độ sai số định vị GPS (mét). VD: `5.0` m |
| `recorded_at` | Timestamptz | Thời điểm ghi nhận tọa độ này từ app mobile gửi về. VD: `2026-07-02 18:02:40+07` |

* **Giải thích liên kết:**
  * `driver_id` liên kết `drivers(id)` (1-1): Tọa độ này gắn liền với tài xế đó khi họ bật app chạy xe ngoài đường.

---

## 🧭 MODULE 7: ROUTING ENGINE (Động cơ Định tuyến tối ưu)

### 29. Bảng `routes` (Danh sách Tuyến đường đi tối ưu)
*Tuyến đường đi do thuật toán AI/VRP tối ưu đề xuất.*
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã tuyến đường. |
| `route_code` | VarChar(30) | Mã tuyến đường hiển thị. VD: `RT-2026-HN002` |
| `driver_vehicle_assignment_id`| Uuid (FK) | Khóa ngoại phiên tài xế lái xe chịu trách nhiệm chạy tuyến này, nối tới `driver_vehicle_assignments(id)`. |
| `start_facility_id`| Uuid (FK) | Khóa ngoại kho/bưu cục bắt đầu xuất phát, nối tới `facilities(id)`. |
| `end_facility_id`| Uuid (FK) | Khóa ngoại kho/bưu cục kết thúc tuyến để về trả xe, nối tới `facilities(id)`. |
| `optimization_id`| Uuid (FK) | Khóa ngoại đợt chạy thuật toán tối ưu AI gán sinh ra tuyến này, nối tới `route_optimizations(id)`. |
| `planned_distance_km`| Decimal(10,2) | Khoảng cách lộ trình dự kiến theo kế hoạch AI (km). VD: `45.80` km |
| `actual_distance_km`| Decimal(10,2) | Khoảng cách xe chạy thực tế đo bằng thiết bị GPS (km). VD: `48.20` km |
| `planned_duration_min`| Int | Thời gian di chuyển dự kiến theo kế hoạch (phút). VD: `120` phút |
| `actual_duration_min`| Int | Thời gian chạy thực tế đo bằng GPS (phút). VD: `135` phút |
| `total_stops` | Int | Tổng số điểm dừng (stops) trên lộ trình này. VD: `12` điểm dừng |
| `status` | Enum (RouteStatus) | Trạng thái tuyến: `PLANNED` (Mới lên lịch), `ASSIGNED` (Đã gán xe chạy), `IN_PROGRESS` (Xe đang chạy trên đường), `COMPLETED` (Đã hoàn thành toàn bộ stops) |
| `planned_start_at`| Timestamptz | Thời gian xuất phát dự kiến theo kế hoạch. |
| `actual_start_at`| Timestamptz | Thời gian xuất phát thực tế tài xế bắt đầu lăn bánh. |
| `completed_at` | Timestamptz | Thời gian hoàn thành toàn bộ lộ trình (khi check-out khỏi stop cuối cùng). |
| `created_at` | Timestamptz | Ngày tạo tuyến đường. |
| `updated_at` | Timestamptz | Ngày cập nhật. |

* **Giải thích liên kết:**
  * `driver_vehicle_assignment_id` liên kết `driver_vehicle_assignments(id)`: Lộ trình này do cặp tài xế & xe nào thực hiện lái.
  * `start_facility_id` / `end_facility_id` liên kết `facilities(id)`: Nơi xuất phát xuất phát và điểm về kho đỗ trả xe.
  * `optimization_id` liên kết `route_optimizations(id)`: Lộ trình này được tạo ra từ đợt chạy thuật toán tối ưu hóa VRP (Vehicle Routing Problem) cụ thể nào.

---

### 30. Bảng `route_stops` (Các Điểm dừng dọc đường của Lộ trình)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã điểm dừng. |
| `route_id` | Uuid (FK) | Khóa ngoại tuyến đường cha chứa điểm dừng này, nối sang `routes(id)` |
| `shipment_id` | Uuid (FK) | Khóa ngoại vận đơn cần giao/nhận tại điểm dừng này, nối sang `shipments(id)` |
| `facility_id` | Uuid (FK) | Khóa ngoại địa chỉ kho (nếu điểm dừng này là tại một kho bãi), nối sang `facilities(id)` |
| `stop_type` | Enum (RouteStopType)| Loại điểm dừng: `PICKUP` (Ghé lấy hàng), `HUB` (Ghé kho trung chuyển để trả hoặc lấy thêm hàng), `DELIVERY` (Giao hàng tận nơi cho khách) |
| `sequence` | Int | Thứ tự ghé thăm điểm dừng do AI sắp xếp tối ưu. VD: `1` (ghé kho A lấy hàng), `2` (giao khách B), `3` (giao khách C)... |
| `address_snapshot`| Text | Snapshot chuỗi địa điểm tại thời điểm lập lịch. VD: "Số 5 Tạ Quang Bửu, Hai Bà Trưng, Hà Nội" |
| `latitude` | DoublePrecision | Vĩ độ GPS của điểm dừng. VD: `21.0062` |
| `longitude` | DoublePrecision | Kinh độ GPS của điểm dừng. VD: `105.8422` |
| `planned_arrival_at`| Timestamptz | Thời gian dự kiến xe cập bến điểm dừng. |
| `actual_arrival_at`| Timestamptz | Thời gian thực tế xe đến điểm dừng. |
| `planned_departure_at`| Timestamptz | Thời gian dự kiến xe rời đi sau khi xử lý xong hàng. |
| `actual_departure_at`| Timestamptz | Thời gian thực tế xe xuất phát rời đi. |
| `status` | Enum (RouteStopStatus)| Trạng thái điểm dừng: `PENDING` (Chờ xe đến), `ARRIVED` (Đã đến điểm), `DEPARTED` (Đã xử lý xong và đi tiếp), `FAILED` (Không giao/nhận được hàng), `SKIPPED` (Bị bỏ qua do khẩn cấp) |

* **Giải thích liên kết:**
  * `route_id` liên kết `routes(id)` (Nhiều - 1): Điểm dừng này nằm trong tuyến đường cha nào.
  * `shipment_id` liên kết `shipments(id)`: Hàng hóa cần bốc lên xe hoặc hạ xuống giao khách tại điểm dừng này.
  * `facility_id` liên kết `facilities(id)`: Bưu cục hoặc kho trung gian nếu xe đến đó để trả hoặc gom hàng trung chuyển.

---

### 31. Bảng `dispatch_tasks` (Nhiệm vụ Điều phối gửi về App Tài xế)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã nhiệm vụ điều phối. |
| `task_code` | VarChar(30) | Mã số nhiệm vụ. VD: `TASK-2026-9901` |
| `route_id` | Uuid (FK) | Khóa ngoại tuyến đường cần chạy, nối sang `routes(id)` |
| `assigned_by` | Uuid (FK) | Khóa ngoại điều phối viên gán việc, nối sang `users(id)` |
| `assigned_to` | Uuid (FK) | Khóa ngoại tài xế nhận việc, nối sang `drivers(id)` |
| `task_type` | Enum (DispatchTaskType)| Loại nhiệm vụ: `ASSIGN_ROUTE` (chạy lộ trình định sẵn), `REASSIGN_ROUTE` (chuyển tuyến khác do đổi xe), `EMERGENCY` (nhiệm vụ khẩn cấp đột xuất) |
| `priority` | SmallInt | Độ ưu tiên nhiệm vụ. VD: `1` (Thường), `2` (Quan trọng cần chạy ngay) |
| `status` | Enum (DispatchTaskStatus)| Trạng thái gán việc: `PENDING` (Tài xế đang cân nhắc), `ACCEPTED` (Tài xế đã bấm nhận trên điện thoại), `REJECTED` (Tài xế từ chối nhận việc), `COMPLETED` (Đã chạy xong tuyến), `CANCELLED` (Admin hủy gán) |
| `note` | Text | Chỉ dẫn từ điều phối viên. VD: "Tuyến này có hàng lạnh, chú ý bật thùng đông lạnh trên xe." |
| `created_at` | Timestamptz | Thời gian đẩy nhiệm vụ đi. |
| `completed_at` | Timestamptz | Thời gian tài xế hoàn thành nhiệm vụ chạy xe. |

* **Giải thích liên kết:**
  * `route_id` liên kết `routes(id)`: Lộ trình và các điểm dừng tài xế cần phải thực hiện theo.
  * `assigned_by` liên kết `users(id)`: Người điều hành trung tâm vận hành.
  * `assigned_to` liên kết `drivers(id)`: Tài xế chịu trách nhiệm chấp nhận/từ chối chạy lộ trình này trên điện thoại của họ.

---

### 32. Bảng `route_location_logs` (Nhật ký hành trình di chuyển thực tế)
*Lưu lại vệt đường chạy GPS thực tế của xe phục vụ so sánh tuyến tối ưu AI vs tuyến thực chạy.*
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã bản ghi nhật ký. |
| `route_id` | Uuid (FK) | Khóa ngoại tuyến đường xe đang chạy, nối sang `routes(id)` |
| `latitude` | DoublePrecision | Tọa độ vĩ độ thực tế xe đi qua. VD: `10.8479` |
| `longitude` | DoublePrecision | Tọa độ kinh độ thực tế xe đi qua. VD: `106.7868` |
| `speed_mps` | Decimal(5,2) | Vận tốc đo được tại thời điểm đó (m/s). VD: `11.50` m/s |
| `heading_degrees`| Decimal(5,2) | Hướng quay đầu xe (độ). VD: `90.00` (Hướng Đông) |
| `accuracy_meters`| Decimal(5,2) | Sai số thiết bị định vị GPS (mét). VD: `3.50` m |
| `recorded_at` | Timestamptz | Thời gian lưu tọa độ này. |

* **Giải thích liên kết:**
  * `route_id` liên kết `routes(id)` (Nhiều - 1): Tọa độ lịch sử GPS này thuộc về hành trình tuyến chạy nào của xe.

---

### 33. Bảng `route_optimizations` (Nhật ký Lịch sử chạy thuật toán AI tối ưu)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã đợt chạy thuật toán. |
| `algorithm_name`| VarChar(50) | Tên thuật toán tối ưu. VD: `Genetic_Algorithm` (Thuật toán Di truyền), `Tabu_Search` |
| `algorithm_version`| VarChar(20)| Phiên bản của thuật toán. VD: `v2.4` |
| `input_shipment_count`| Int | Số lượng đơn hàng đầu vào cần xử lý định tuyến. VD: `150` đơn hàng |
| `output_route_count`| Int | Số lượng tuyến đường tối ưu đầu ra sau tính toán. VD: `5` chuyến xe chạy |
| `total_distance_km`| Decimal(10,2) | Tổng số km dự kiến toàn bộ các xe chạy. VD: `210.50` km |
| `estimated_duration_min`| Int | Tổng thời gian ước tính chạy toàn bộ các tuyến (phút). VD: `480` phút |
| `execution_time_ms`| Int | Thời gian máy tính chạy thuật toán xử lý (mili-giây). VD: `1250` ms |
| `fitness_score`| Decimal(8,4) | Điểm tối ưu của thuật toán (dùng đánh giá hiệu năng mô hình AI). VD: `0.9250` |
| `optimization_status`| Enum (OptimizationStatus)| Trạng thái đợt tính toán: `SUCCESS` (Thành công xuất ra các tuyến đường), `FAILED` (Thất bại do dữ liệu lỗi hoặc quá tải hệ thống) |
| `created_at` | Timestamptz | Thời điểm chạy thuật toán. |

---

## 📸 MODULE 8: TRACKING, SCAN & POD (Bằng chứng giao nhận & Quét mã)

### 34. Bảng `tracking_events` (Nhật ký sự kiện Hành trình đơn hàng)
*Bảng này lưu dữ liệu hành trình lịch sử của vận đơn để khách hàng vào tra cứu (VD: "Đơn hàng đã rời kho Hà Nội").*
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã sự kiện. |
| `shipment_id` | Uuid (FK) | Khóa ngoại nối sang vận đơn `shipments(id)` |
| `route_stop_id`| Uuid (FK) | Khóa ngoại điểm dừng phát sinh sự kiện, nối sang `route_stops(id)` |
| `event_type` | Enum (TrackingEventType)| Loại trạng thái vận đơn: `PICKED_UP` (Đã lấy hàng), `ARRIVED_HUB` (Hàng về kho), `DEPARTED_HUB` (Hàng rời kho trung chuyển), `OUT_FOR_DELIVERY` (Đang đi giao khách), `DELIVERED` (Đã giao thành công) |
| `event_source` | Enum (EventSource) | Nguồn cập nhật sự kiện: `SYSTEM` (hệ thống tự động ghi nhận), `DRIVER_APP` (tài xế cập nhật trên điện thoại), `WAREHOUSE_APP` (nhân viên kho quét barcode cập nhật) |
| `description` | Text | Văn bản hiển thị cho người dùng tra cứu hành trình. VD: "Đơn hàng đã được tài xế Nguyễn Văn A nhận bàn giao đi giao chặng cuối." |
| `latitude` | DoublePrecision | Tọa độ GPS xảy ra sự kiện. |
| `longitude` | DoublePrecision | Tọa độ GPS xảy ra sự kiện. |
| `created_by` | Uuid (FK) | Người ghi nhận sự kiện (nối sang `users(id)`). |
| `occurred_at` | Timestamptz | Thời điểm thực tế phát sinh sự kiện ngoài đời. |
| `created_at` | Timestamptz | Thời điểm ghi nhận sự kiện vào DB. |

* **Giải thích liên kết:**
  * `shipment_id` liên kết `shipments(id)`: Sự kiện hành trình này mô tả cho vận đơn cụ thể nào.
  * `route_stop_id` liên kết `route_stops(id)`: Phát sinh tại điểm dừng cụ thể nào trên lịch trình.
  * `created_by` liên kết `users(id)`: Ai là người phát sinh (tài xế cập nhật trạng thái giao hàng, hay do hệ thống tự động ghi nhận khi quét inbound).

---

### 35. Bảng `barcode_scans` (Nhật ký quét mã QR Code / Barcode)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã bản ghi quét mã. |
| `shipment_id` | Uuid (FK) | Khóa ngoại liên kết vận đơn, nối tới `shipments(id)`. |
| `package_id` | Uuid (FK) | Khóa ngoại liên kết kiện hàng vật lý được quét, nối tới `packages(id)`. |
| `route_stop_id`| Uuid (FK) | Khóa ngoại liên kết điểm dừng xảy ra quét mã, nối tới `route_stops(id)`. |
| `facility_id` | Uuid (FK) | Khóa ngoại liên kết kho bãi xảy ra thao tác quét, nối tới `facilities(id)`. |
| `scanned_by` | Uuid (FK) | Khóa ngoại người thực hiện quét mã, nối tới `users(id)`. |
| `scan_type` | Enum (ScanType) | Phân loại hoạt động quét: `INBOUND` (Nhập kho), `OUTBOUND` (Xuất kho), `DELIVERY` (Quét giao hàng cho khách hàng), `SORTING` (Quét phân loại trên băng chuyền) |
| `barcode_value`| VarChar(100) | Giá trị của mã vạch đọc được. VD: `PKG-10029381-01` |
| `latitude` | DoublePrecision | Tọa độ GPS xảy ra thao tác quét. |
| `longitude` | DoublePrecision | Tọa độ GPS xảy ra thao tác quét. |
| `scanned_at` | Timestamptz | Thời điểm thực hiện quét mã. |

* **Giải thích liên kết:**
  * `shipment_id` liên kết `shipments(id)` / `package_id` liên kết `packages(id)`: Xác định kiện hàng hay vận đơn nào được xử lý quét mã.
  * `scanned_by` liên kết `users(id)`: Nhân viên kho hoặc tài xế thực hiện quét mã bằng máy quét chuyên dụng hoặc camera điện thoại.
  * `facility_id` liên kết `facilities(id)`: Quét tại bưu cục nào để quản lý dòng luân chuyển hàng tồn kho bãi (Inventory).

---

### 36. Bảng `delivery_proofs` (Bằng chứng giao nhận hàng POD)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã chứng từ POD. |
| `shipment_id` | Uuid (FK, Unique) | Khóa ngoại nối sang chuyến xe vận đơn `shipments(id)`. |
| `route_stop_id`| Uuid (FK, Unique) | Khóa ngoại nối sang điểm dừng giao hàng `route_stops(id)`. |
| `proof_type` | Enum (ProofType) | Thể loại bằng chứng giao: `PHOTO` (Chụp ảnh hàng hóa đã đặt trước cửa), `SIGNATURE` (Chữ ký trực tiếp của khách), `OTP` (Mã xác thực gửi về điện thoại khách), `FAILED_DELIVERY` (Bằng chứng lý do giao hàng thất bại) |
| `delivery_result`| Enum (DeliveryResult)| Kết quả giao: `SUCCESS` (Thành công hoàn toàn), `FAILED` (Giao thất bại), `PARTIAL` (Khách chỉ nhận một phần kiện hàng) |
| `receiver_name`| VarChar(150) | Tên người nhận hàng thực tế tại điểm giao. VD: "Nguyễn Văn A (Nhận hộ)" |
| `receiver_phone`| VarChar(20) | Số điện thoại người nhận hàng thực tế. VD: `0904555666` |
| `failure_reason`| Enum (DeliveryFailureReason)| Lý do nếu giao thất bại: `RECIPIENT_UNAVAILABLE` (Khách không nghe máy), `INCORRECT_ADDRESS` (Sai địa chỉ), `RECIPIENT_REJECTED` (Khách từ chối nhận do rách hộp), `FORCE_MAJEURE` (Sự cố thiên tai, bão lũ) |
| `verified_latitude`| DoublePrecision| Vĩ độ GPS thực tế của tài xế khi bấm xác nhận trên app để chống gian lận. VD: `10.7765` |
| `verified_longitude`| DoublePrecision| Kinh độ GPS thực tế của tài xế khi bấm xác nhận trên app. VD: `106.7009` |
| `created_at` | Timestamptz | Thời gian cập nhật POD lên máy chủ. |

* **Giải thích liên kết:**
  * `shipment_id` liên kết `shipments(id)` / `route_stop_id` liên kết `route_stops(id)` (1-1): POD này là bằng chứng xác thực hoàn thành cho điểm dừng giao hàng nào của tài xế.

---

### 37. Bảng `driver_check_ins` (Nhật ký Check-in/Check-out của Tài xế tại điểm dừng)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã bản ghi check-in. |
| `route_stop_id`| Uuid (FK, Unique) | Khóa ngoại nối sang điểm dừng tài xế check-in, nối tới `route_stops(id)`. |
| `driver_id` | Uuid (FK) | Khóa ngoại tài xế thực hiện check-in, nối tới `drivers(id)`. |
| `check_in_at` | Timestamptz | Thời điểm xe tải đỗ tới điểm dừng (GPS tự động ghi nhận khi đi vào bán kính). VD: `2026-07-02 10:15:00+07` |
| `check_out_at` | Timestamptz | Thời điểm xe lăn bánh rời đi (Sau khi hoàn thành giao/nhận hàng). VD: `2026-07-02 10:30:00+07` |
| `latitude` | DoublePrecision | Tọa độ vĩ độ thực tế khi bấm check-in. |
| `longitude` | DoublePrecision | Tọa độ kinh độ thực tế khi bấm check-in. |
| `note` | Text | Báo cáo nhanh của tài xế tại điểm dừng. VD: "Ngõ nhỏ phải đi bộ vào giao hàng." |

* **Giải thích liên kết:**
  * `route_stop_id` liên kết `route_stops(id)` (1-1) and `driver_id` liên kết `drivers(id)`: Nhật ký này kiểm soát hiệu suất làm việc của tài xế tại mỗi điểm dừng để tính hiệu suất (KPI) thời gian bốc dỡ hàng hóa.

---

### 38. Bảng `tracking_attachments` (Tệp ảnh đính kèm bằng chứng giao nhận)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã tệp đính kèm. |
| `delivery_proof_id`| Uuid (FK) | Khóa ngoại liên kết tới chứng từ bằng chứng giao nhận `delivery_proofs(id)` |
| `file_type` | Enum (AttachmentFileType)| Loại tệp: `PHOTO` (Ảnh gói hàng tại nhà khách), `SIGNATURE` (Chữ ký điện tử dạng ảnh PNG), `VIDEO` (Quá trình khui hàng - nếu có), `DOCUMENT` (Biên bản ký tay giấy) |
| `storage_provider`| VarChar(30) | Nơi lưu trữ đám mây. VD: `S3` (Amazon S3), `CLOUDINARY` |
| `object_key` | VarChar(500) | URL đường dẫn tệp ảnh lưu trữ. VD: `https://s3.amazonaws.com/smartlog/pods/pod_9981.jpg` |
| `mime_type` | VarChar(100) | Định dạng tệp. VD: `image/jpeg`, `image/png` |
| `file_size_bytes`| BigInt | Dung lượng file (bytes). VD: `245120` bytes (Khoảng 240 KB) |
| `uploaded_at` | Timestamptz | Ngày giờ tải lên đám mây thành công. |

* **Giải thích liên kết:**
  * `delivery_proof_id` liên kết `delivery_proofs(id)` (Nhiều - 1): Ảnh chụp gói hàng giao thành công hoặc chữ ký người nhận được gắn trực tiếp vào chứng từ POD.

---

## ⚙️ MODULE 9: SYSTEM CONFIGURATION (Cấu hình Hệ thống)

### 39. Bảng `system_settings` (Cấu hình hệ thống)
| Tên trường | Kiểu dữ liệu | Ý nghĩa & Ví dụ |
| :--- | :--- | :--- |
| `id` | Uuid (PK) | Mã cấu hình. |
| `setting_key` | VarChar(100) | Mã khóa cài đặt duy nhất của hệ thống. VD: `GPS_PING_INTERVAL_SECONDS` (Chu kỳ gửi GPS tài xế), `AI_MUTATION_RATE` (Tỷ lệ đột biến thuật toán tối ưu) |
| `setting_value`| Text | Giá trị cài đặt. VD: `30` (giây), `0.05` |
| `value_type` | Enum (SettingValueType)| Kiểu dữ liệu của giá trị cài đặt để backend xử lý: `STRING`, `INTEGER`, `DECIMAL`, `BOOLEAN`, `JSON` |
| `category` | Enum (SettingCategory)| Phân loại cấu hình: `AI` (cấu hình thuật toán), `ROUTING` (chỉ đường), `GPS` (định vị), `SYSTEM` (chung), `MOBILE` (cấu hình app tài xế) |
| `description` | Text | Mô tả chức năng cài đặt này để làm gì. VD: "Thời gian giãn cách giữa hai lần app mobile gửi tọa độ GPS tài xế về máy chủ." |
| `is_editable` | Boolean | Có cho phép Admin sửa giá trị này trên giao diện Portal hay không (`true`/`false`). |
| `is_active` | Boolean | Cấu hình này có đang được áp dụng hoạt động hay không (`true`/`false`). |
| `updated_by` | Uuid (FK) | Mã nhân viên thực hiện chỉnh sửa cấu hình hệ thống gần nhất, nối sang `users(id)`. |
| `updated_at` | Timestamptz | Ngày cập nhật gần nhất. |
| `created_at` | Timestamptz | Ngày tạo cấu hình. |

* **Giải thích liên kết:**
  * `updated_by` liên kết `users(id)`: Định danh người quản trị hệ thống đã thực hiện điều chỉnh cấu hình này.
