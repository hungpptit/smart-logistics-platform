# 📋 KẾ HOẠCH TRIỂN KHAI PHÁT TRIỂN MOBILE APP & BACKEND APIs

Kế hoạch này vạch ra lộ trình chi tiết để xây dựng ứng dụng di động Flutter (tuân thủ cấu trúc giao diện và thông số thiết kế tại thư mục `Design_mobile`) và các API Backend tương ứng để vận hành ứng dụng.

---

## 🏗️ GIAI ĐOẠN 1: KHỞI TẠO & XÂY DỰNG GIAO DIỆN DI ĐỘNG (Lựa chọn A)
*Mục tiêu: Thiết lập dự án Flutter, dựng khung cấu trúc và code toàn bộ giao diện màn hình mô phỏng chính xác các file mã nguồn HTML/Tailwind có trong `mobile/Design_mobile/stitch_web_to_markdown_extractor/`.*

### 🛠️ Bước 1.1: Khởi tạo Project Flutter
* **Hành động:** 
  * Chạy lệnh khởi tạo Flutter trong thư mục `mobile/`:
    `flutter create --org com.velocity.slp --project-name velocity_mobile .`
  * Dọn dẹp dự án (Xóa bỏ các ghi chú và widget mẫu trong `lib/main.dart`).
* **Cài đặt Dependencies (`pubspec.yaml`):**
  * `google_fonts`: Để hiển thị font Montserrat chuẩn thiết kế.
  * `material_symbols_icons` hoặc `flutter_svg`: Để sử dụng hệ thống icon chuẩn.
  * `http` or `dio`: Phục vụ gọi API Backend sau này.
  * `provider` or `flutter_bloc`: Quản lý trạng thái ứng dụng.
  * `flutter_secure_storage`: Lưu trữ JWT token an toàn.
  * `maplibre_gl` or `google_maps_flutter`: Hỗ trợ vẽ bản đồ chặng giao hàng và dẫn đường.

### 🎨 Bước 1.2: Định nghĩa Design System Tokens
* **Hành động:** Tạo thư mục `lib/core/theme/` và viết các file cấu hình giao diện dựa theo file `DESIGN.md` trong thư mục `velocity_logistics/`:
  * **`app_colors.dart`:** Định nghĩa các hằng số màu sắc (`logisticsRed`, `deepOnyx`, `cloudGray`, `pureWhite`).
  * **`app_typography.dart`:** Cấu hình TextStyle cho các thẻ font chữ Montserrat (`displayLg`, `headlineLg`, `headlineMd`, `bodyLg`, `bodyMd`, `labelLg`, `buttonText`).
  * **`app_theme.dart`:** Thiết lập `ThemeData` toàn cục cho ứng dụng (InputDecorationTheme, ButtonTheme, DialogTheme).

### 📱 Bước 1.3: Dựng các màn hình theo Design_mobile
Mỗi màn hình trong Flutter sẽ được triển khai dựa trên cấu trúc các trường nhập liệu (`inputs`) và nút bấm (`buttons`) lấy từ các thư mục con trong `Design_mobile/stitch_web_to_markdown_extractor/`:

1. **Nhóm Xác thực (Auth Screens):**
   * **Màn hình 0.1 (Welcome):** Dựa theo code tại thư mục `welcome_velocity_logistics_fixed`.
   * **Màn hình 0.2 (Login):** Dựa theo code tại thư mục `login` (có phần chuyển vai trò Khách hàng / Tài xế).
   * **Màn hình 0.3 (Register):** Dựng form điền thông tin Đăng ký Khách hàng.
   * **Màn hình 0.4 (Profile):** Dựa theo code tại thư mục `profile`.

2. **Nhóm Khách hàng (Customer Screens):**
   * **Màn hình 1.1 (Dashboard / My Orders):** Dựa theo code tại thư mục `my-order-customer` (gồm danh sách đơn hàng có timeline trạng thái).
   * **Màn hình 1.2 (Order Details):** Dựng chi tiết thông tin đơn, POD và nút *"Xác nhận đã nhận hàng"*.
   * **Màn hình 1.3 (Create Order):** Dựa theo code tại thư mục `create-new-order`.
   * **Màn hình 1.5 (Track & Trace):** Dựa theo code tại thư mục `track-order`.
   * **Màn hình 1.6 (Real-time Map):** Bản đồ hiển thị vị trí Shipper chặng cuối.

3. **Nhóm Tài xế (Shipper Screens):**
   * **Màn hình 2.1 (Route & Stops):** Dựa theo code tại thư mục `delivery-route` (hiển thị danh sách điểm dừng được AI tối ưu hóa, nút check-in/check-out ca).
   * **Màn hình 2.2 (Stop Details):** Màn hình hiển thị chi tiết điểm dừng giao/nhận hàng.
   * **Màn hình 2.3 & 2.4 (POD & Exception):** Form xác nhận giao hàng (ảnh, chữ ký) và báo cáo thất bại.
   * **Màn hình 2.6 (Turn-by-Turn Map):** Dựng màn hình dẫn đường chi tiết 3D (dựa theo code tại thư mục `turn-by-turn-direction`).

---

## 🌐 GIAI ĐOẠN 2: XÂY DỰNG HỆ THỐNG APIs BACKEND (Lựa chọn B)
*Mục tiêu: Thiết lập các endpoint API RESTful bên phía Node.js Backend phục vụ trực tiếp cho các màn hình Flutter di động vừa dựng ở Giai đoạn 1.*

### 🔑 Bước 2.1: Phân hệ Xác thực (Auth API)
* **Endpoint `POST /api/auth/register`:** 
  * Tạo bản ghi `User` (email, password băm bằng bcrypt, role: `CUSTOMER`) và hồ sơ `Customer` tương ứng.
* **Endpoint `POST /api/auth/login`:**
  * Xác thực email/password. Trả về token JWT và thông tin vai trò người dùng (`CUSTOMER` hoặc `DRIVER`).

### 📦 Bước 2.2: Phân hệ Khách hàng (Customer API)
* **Endpoint `POST /api/orders`:**
  * Tạo đơn hàng mới từ dữ liệu Form gửi lên, tự động chuẩn hóa địa chỉ và lưu trữ tọa độ.
* **Endpoint `GET /api/orders/my-orders`:**
  * Lấy danh sách đơn hàng của khách hàng đang đăng nhập phục vụ hiển thị ở Màn hình 1.1.
* **Endpoint `GET /api/orders/:code`:**
  * Tra cứu chi tiết đơn hàng cho màn hình Track & Trace.
* **Endpoint `POST /api/orders/:code/confirm-receipt`:**
  * Cập nhật trạng thái đơn sang `CUSTOMER_CONFIRMED` khi khách hàng bấm nút đã nhận hàng.

### 🛵 Bước 2.3: Phân hệ Tài xế & Vận chuyển (Driver & Routing API)
* **Endpoint `GET /api/drivers/active-shift`:**
  * Lấy thông tin ca làm việc hiện tại của tài xế cùng lộ trình tối ưu và danh sách các điểm dừng (Stops).
* **Endpoint `POST /api/drivers/stops/:id/status`:**
  * Cập nhật trạng thái điểm dừng (`ARRIVED`, `DEPARTED`, `FAILED`).
  * Lưu trữ chữ ký và ảnh chụp POD khi hoàn thành giao hàng.

---

## 🎯 TIÊU CHÍ HOÀN THÀNH (Definition of Done)
1. Ứng dụng Flutter hiển thị giao diện Montserrat giống hệt thiết kế Stitch trong thư mục `Design_mobile`.
2. Có thể Đăng nhập/Đăng ký trên điện thoại, tự động chuyển về đúng giao diện Khách hàng hoặc Tài xế.
3. Người dùng tạo đơn hàng trên mobile và dữ liệu được ghi nhận chính xác trong PostgreSQL Database qua API Backend.
4. Tài xế thực hiện giao nhận đơn trên mobile và trạng thái được cập nhật realtime đồng bộ về App Khách hàng.
