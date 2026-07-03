# 📱 ĐẶC TẢ CHỨC NĂNG ỨNG DỤNG DI ĐỘNG (MOBILE APP)

Tài liệu này xác nhận danh sách các chức năng thực tế sẽ được lập trình trên ứng dụng di động dành cho **Khách hàng (Customer)** và **Tài xế (Shipper)**.

---

## 🔐 0. HỆ THỐNG XÁC THỰC CHUNG (Common Authentication)

Bộ phận xác thực và điều hướng ban đầu giúp nhận diện người dùng và đưa họ về đúng giao diện tương ứng với vai trò của mình.

### 🖥️ Màn hình 0.1: Màn hình chào / Màn hình chờ (Welcome / Landing Screen)
* **Thành phần hiển thị:**
  * Logo hệ thống **Smart Logistics**, slogan và mô tả ngắn giới thiệu dịch vụ.
* **Các nút bấm chính:**
  * Nút **"Đăng nhập"** (Chuyển sang Màn hình 0.2).
  * Nút **"Đăng ký"** (Chuyển sang Màn hình 0.3 - Chỉ dành cho Khách hàng).

### 🖥️ Màn hình 0.2: Màn hình Đăng nhập (Login Screen)
* **Thành phần nhập liệu (Form Inputs):**
  * Ô nhập Tài khoản (Email hoặc Tên đăng nhập).
  * Ô nhập Mật khẩu (Có nút ẩn/hiện mật khẩu).
* **Các nút bấm chính:**
  * Nút **"Đăng nhập"** (Gửi yêu cầu xác thực JWT về API Backend).
  * Nút **"Quên mật khẩu"**.
  * Nút **"Quay lại"** (Về Màn hình 0.1).
* **Luồng xử lý (Redirect):**
  * Đăng nhập thành công $\rightarrow$ Kiểm tra vai trò của tài khoản:
    * Nếu vai trò là `CUSTOMER` $\rightarrow$ Điều hướng sang Màn hình 1.1 (Customer Dashboard).
    * Nếu vai trò là `DRIVER` $\rightarrow$ Điều hướng sang Màn hình 2.1 (Shipper Dashboard).

### 🖥️ Màn hình 0.3: Màn hình Đăng ký (Register Screen)
* **Thành phần nhập liệu (Form Inputs):**
  * Ô nhập Họ và tên khách hàng.
  * Ô nhập Số điện thoại liên hệ.
  * Ô nhập Địa chỉ Email.
  * Ô nhập Mật khẩu.
  * Ô nhập Xác nhận mật khẩu.
* **Các nút bấm chính:**
  * Nút **"Đăng ký tài khoản"** (Tạo bản ghi `User` và `Customer` trong cơ sở dữ liệu).
  * Nút **"Đăng nhập ngay"** (Nếu khách hàng đã có tài khoản).
  * Nút **"Quay lại"** (Về Màn hình 0.1).

### 🖥️ Màn hình 0.4: Thông tin cá nhân & Đăng xuất (Profile / Settings Screen)
* *Lưu ý:* Màn hình này dùng chung cho cả Khách hàng và Tài xế (truy cập từ menu sidebar hoặc icon avatar trên thanh tiêu đề).
* **Thành phần hiển thị:**
  * Ảnh đại diện (Avatar).
  * Họ và tên người dùng, Số điện thoại, Email.
  * Tên vai trò tài khoản (`Khách hàng` hoặc `Tài xế`).
  * Danh sách các bưu cục trực thuộc quản lý (nếu là tài xế).
* **Các nút bấm chính:**
  * Nút **"Đổi mật khẩu"**.
  * Nút **"Đăng xuất" (Log Out)** (Xóa JWT token lưu trữ trong bộ nhớ máy di động và đưa người dùng quay lại Màn hình 0.1).

---

## 👥 1. CÁC MÀN HÌNH ỨNG DỤNG KHÁCH HÀNG (Customer App Screens)

### 🖥️ Màn hình 1.1: Danh sách Đơn hàng (Dashboard / Order List Screen)
* **Thành phần hiển thị:**
  * Bộ lọc trạng thái đơn hàng (Tất cả, Chờ lấy hàng, Đang giao, Đã hoàn thành, Đã hủy).
  * Danh sách thẻ đơn hàng (mỗi thẻ hiển thị: Mã đơn `order_code`, Ngày tạo, Trạng thái đơn, Tổng cước phí, Địa chỉ nhận hàng).
  * Ô tìm kiếm đơn hàng nhanh theo mã đơn hàng.
* **Các nút bấm chính:**
  * Nút **"Tạo đơn hàng mới"** (Chuyển sang Màn hình 1.3).
  * Nút **"Tra cứu vận đơn nhanh"** (Chuyển sang Màn hình 1.5).

### 🖥️ Màn hình 1.2: Chi tiết Đơn hàng (Order Details Screen)
* **Thành phần hiển thị:**
  * Thông tin chi tiết Người gửi: Họ tên, SĐT, Địa chỉ lấy hàng.
  * Thông tin chi tiết Người nhận: Họ tên, SĐT, Địa chỉ nhận hàng.
  * Chi tiết kiện hàng: Trọng lượng, Kích thước (Dài-Rộng-Cao), loại hàng.
  * Thông tin thanh toán: Cước phí, Tiền thu hộ COD, Đối tượng trả phí.
  * Nút tiến trình/Trạng thái hiện tại của đơn hàng.
* **Các nút bấm tương tác:**
  * Nút **"Xác nhận đã nhận hàng"**: Nút này chỉ xuất hiện và cho phép bấm khi trạng thái đơn hàng do tài xế báo là "Giao thành công". Khách bấm vào để đóng đơn hàng.
  * Nút **"Theo dõi tài xế"**: Chỉ hiển thị khi đơn hàng ở trạng thái "Đang đi giao chặng cuối". (Chuyển sang Màn hình 1.6).
  * Nút **"Xem bằng chứng giao hàng (POD)"**: Chỉ hiển thị khi đơn đã hoàn thành. Nhấn vào sẽ hiển thị Pop-up hình ảnh gói hàng đã ký nhận và chữ ký của người nhận.

### 🖥️ Màn hình 1.3: Tạo đơn hàng mới (Create Order Screen)
* **Thành phần nhập liệu (Form Inputs):**
  * **Thông tin lấy hàng:** Họ tên người gửi, SĐT, Địa chỉ lấy (Ô nhập text địa chỉ + nút Bản đồ chọn tọa độ định vị tự động).
  * **Thông tin giao hàng:** Họ tên người nhận, SĐT, Địa chỉ giao (Ô nhập text địa chỉ + nút Bản đồ chọn tọa độ định vị tự động).
  * **Thông tin kiện hàng:** Trọng lượng (kg), kích thước dài/rộng/cao (cm), loại kiện hàng (Thông thường, dễ vỡ, hàng lạnh).
  * **Gói dịch vụ:** Nút chọn `EXPRESS` (Hỏa tốc) hoặc `STANDARD` (Tiêu chuẩn).
  * **Hình thức thanh toán:** Người gửi trả cước ngay / Người nhận trả cước đầu nhận.
  * **Tiền thu hộ:** Ô nhập số tiền COD (nếu có).
* **Các nút bấm chính:**
  * Nút **"Xác nhận tạo đơn"** (Kiểm tra dữ liệu nhập, gọi API tạo đơn và chuyển hướng về màn hình danh sách đơn hàng).

### 🖥️ Màn hình 1.4: Hẹn lịch lấy hàng (Schedule Pickup Screen)
* **Thành phần hiển thị & nhập liệu:**
  * Danh sách các đơn hàng mới tạo chưa được tài xế lấy.
  * Ô chọn Ngày hẹn lấy hàng.
  * Bộ chọn Khung giờ hẹn lấy (Ca sáng: 08:00 - 12:00 / Ca chiều: 14:00 - 18:00).
* **Các nút bấm chính:**
  * Nút **"Đặt lịch lấy hàng"** (Gửi yêu cầu điều phối tới server).

### 🖥️ Màn hình 1.5: Tra cứu nhanh hành trình (Track & Trace Screen)
* **Thành phần hiển thị & nhập liệu:**
  * Ô nhập mã vận đơn để tra cứu.
  * Danh sách dòng thời gian (Timeline) dạng dọc ghi nhận chi tiết lịch sử cập nhật trạng thái đơn (Ví dụ: `10:00 Đã nhận đơn` -> `13:30 Nhập bưu cục gốc` -> `16:00 Đang đi giao`).
* **Các nút bấm chính:**
  * Nút **"Tìm kiếm"**.
  * Nút **"Theo dõi bản đồ trực tuyến"** (Chỉ sáng lên khi đơn hàng đang trên đường đi giao thực tế).

### 🖥️ Màn hình 1.6: Bản đồ Theo dõi Tài xế trực tuyến (Real-time Delivery Tracking Map)
* **Thành phần hiển thị:**
  * Bản đồ số lớn chiếm toàn màn hình.
  * Các biểu tượng Marker định vị: Điểm lấy/giao hàng, biểu tượng xe máy/tải của tài xế đang chạy chặng cuối.
  * Đường vẽ lộ trình polyline từ vị trí tài xế đến địa chỉ giao.
  * Panel thông tin ở góc màn hình: Họ tên tài xế, Biển số xe, Ảnh đại diện, Khoảng cách dự kiến còn lại (km) và Thời gian dự kiến đến nơi (phút).
* **Các nút bấm tương tác:**
  * Nút **"Gọi điện cho tài xế"** (Kích hoạt trình gọi điện thoại hệ điều hành).

---

## 🛵 2. CÁC MÀN HÌNH ỨNG DỤNG TÀI XẾ (Shipper App Screens)

### 🖥️ Màn hình 2.1: Danh sách Điểm dừng ca chạy (Route & Stops Dashboard)
* **Thành phần hiển thị:**
  * Thông tin ca làm việc: Trạng thái ca (`ACTIVE` / `OFFLINE`), Mã lộ trình gán chạy.
  * Danh sách các Điểm dừng (Stops) xếp thứ tự dọc từ trên xuống dưới theo thuật toán AI tối ưu (1 -> 2 -> N).
  * Mỗi thẻ điểm dừng hiển thị: Thứ tự dừng, loại tác vụ (Nhận hàng / Giao hàng), Địa chỉ khách hàng, Trạng thái điểm dừng (Chờ xử lý, Đã đến, Đã rời đi, Thất bại).
* **Các nút bấm chính:**
  * Nút **"Quét mã QR bốc hàng (Check-in ca)"**: Chỉ sử dụng ở đầu ca tại kho bưu cục.
  * Nút **"Báo cáo Kết thúc ca (Check-out ca)"**: Chỉ sáng khi toàn bộ danh sách điểm dừng đã xử lý xong.
  * Bấm vào từng Thẻ điểm dừng sẽ chuyển sang Màn hình 2.2.

### 🖥️ Màn hình 2.2: Chi tiết Điểm dừng & Dẫn đường (Stop Details & Navigation Screen)
* **Thành phần hiển thị:**
  * Thông tin khách hàng cần gặp: Họ tên, Số điện thoại.
  * Địa chỉ chi tiết kèm ghi chú giao hàng.
  * Thông tin bưu gửi cần giao/nhận: Mã kiện hàng, Cân nặng, Kích thước, Tiền COD cần thu.
  * Bản đồ nhỏ định tuyến đường đi ngắn nhất từ vị trí GPS hiện tại của tài xế đến địa điểm này.
* **Các nút bấm chính:**
  * Nút **"Gọi điện cho khách"**.
  * Nút **"Dẫn đường"** (Chuyển sang Màn hình 2.6 để dẫn đường chi tiết trực tiếp trong ứng dụng).
  * Nút **"Xác nhận đã đến nơi"** (Ghi nhận thời gian check-in của tài xế).
  * Nút **"Giao hàng thành công"** (Chuyển sang Màn hình 2.3).
  * Nút **"Báo cáo giao thất bại"** (Chuyển sang Màn hình 2.4).

### 🖥️ Màn hình 2.3: Xác nhận giao hàng thành công (Delivery Confirmation / POD Screen)
* **Thành phần tương tác & nhập liệu:**
  * Khung chụp ảnh: Nút mở camera chụp hình ảnh gói hàng đã giao cho khách làm bằng chứng thực địa.
  * Khung ký nhận: Vùng cảm ứng cho khách hàng ký chữ ký điện tử trực tiếp bằng ngón tay.
  * Trường hiển thị số tiền COD thực nhận từ khách.
* **Các nút bấm chính:**
  * Nút **"Xác nhận hoàn thành"** (Gọi API cập nhật trạng thái đơn thành công, gửi hình ảnh/chữ ký lên S3, đồng thời tự động kích hoạt nút "Xác nhận đã nhận hàng" trên app của khách hàng).

### 🖥️ Màn hình 2.4: Báo cáo giao hàng thất bại (Delivery Exception Screen)
* **Thành phần nhập liệu:**
  * Bộ chọn danh sách lý do thất bại (Khách không nghe máy, Sai địa chỉ nhận, Khách từ chối nhận hàng do móp méo hộp...).
  * Khung chụp ảnh: Chụp ảnh hiện trường bưu gửi hoặc số cuộc gọi nhỡ làm bằng chứng đối soát.
  * Ô nhập ghi chú lý do chi tiết.
* **Các nút bấm chính:**
  * Nút **"Xác nhận thất bại"** (Cập nhật trạng thái đơn thành thất bại và quay về danh sách ca chạy).

### 🖥️ Màn hình 2.5: Thống kê ca chạy (Shift Performance Summary Screen)
* **Thành phần hiển thị:**
  * Tổng quan hiệu suất trong ca:
    * Số đơn giao thành công / Tổng số đơn được giao trong ca.
    * Số đơn giao thất bại cần mang về kho hoàn trả.
    * Tổng số tiền mặt COD đã thu hộ.
    * Tổng quãng đường thực tế di chuyển (đo bằng GPS chạy ngầm).
  * Thời gian bắt đầu check-in ca và thời gian check-out.

### 🖥️ Màn hình 2.6: Dẫn đường chi tiết (Turn-by-Turn Navigation Screen)
* **Thành phần hiển thị:**
  * Bản đồ lớn chiếm toàn bộ màn hình (hiển thị mô hình 2D/3D hướng di chuyển).
  * Icon mũi tên chỉ hướng đi chuyển động thời gian thực khớp với tọa độ GPS của tài xế.
  * Chỉ dẫn chỉ đường chi tiết bằng hình ảnh và chữ viết ở phía trên cùng màn hình (Ví dụ: "Đi thẳng 200m sau đó rẽ phải vào đường Hai Bà Trưng").
  * Thanh thông tin dưới đáy màn hình hiển thị: Khoảng cách còn lại (mét/km), Thời gian ước tính đến nơi (phút) và vận tốc hiện tại.
* **Các nút bấm tương tác:**
  * Nút **"Thoát dẫn đường"** (Tắt chế độ điều hướng và quay về Màn hình 2.2).
  * Nút **"Bật/Tắt hướng dẫn bằng giọng nói"** (Voice Guide).

