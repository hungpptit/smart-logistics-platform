# CẨM NANG NGHIỆP VỤ DÀNH CHO TÀI XẾ (DRIVER / SHIPPER)

## 1. Quy trình Nhận và Giao Đơn Hàng (Shipment Lifecycle)
- **Bước 1: Tiếp nhận chuyến giao (ASSIGNED)**
  - Tài xế kiểm tra thông tin đơn hàng trên ứng dụng Smart Logistics bao gồm: Địa chỉ lấy hàng, Địa chỉ giao hàng, Số điện thoại người nhận, Tiền thu hộ COD, và ghi chú đặc biệt (ví dụ: hàng dễ vỡ, giao giờ hành chính).
  - Bấm "Bắt đầu lấy hàng" để hệ thống cập nhật trạng thái đơn.
- **Bước 2: Lấy hàng tại Bưu cục / Kho Hub (PICKED_UP)**
  - Quét mã vạch (Barcode / QR Code) trên kiện hàng để xác nhận lấy đúng kiện.
  - Kiểm tra ngoại quan kiện hàng: bao bì nguyên vẹn, không móp méo, rách nát, chảy nước.
  - Bấm "Đã lấy hàng" để chuyển trạng thái sang Đang vận chuyển.
- **Bước 3: Vận chuyển và Giao hàng (IN_TRANSIT & DELIVERED)**
  - Sử dụng bản đồ điều hướng tối ưu trên ứng dụng.
  - Trước khi đến địa chỉ giao từ 5 - 10 phút, gọi điện thông báo cho người nhận.
  - Khi giao hàng thành công: Thu đủ số tiền COD (nếu có), yêu cầu người nhận ký nhận trên app hoặc chụp ảnh bằng chứng giao hàng (chụp rõ kiện hàng và số nhà người nhận).
  - Bấm "Xác nhận đã giao hàng thành công".

## 2. Quy trình Thu hộ và Nộp tiền COD (Cash on Delivery)
- **Quy tắc thu tiền COD:**
  - Tài xế chỉ thu đúng số tiền hiển thị trên ứng dụng. Tuyệt đối không tự ý thu thêm tiền hoặc làm tròn số tiền gây bất đồng với khách hàng.
  - Khách hàng có thể thanh toán tiền mặt hoặc quét mã VietQR / ZaloPay động do ứng dụng của tài xế hiển thị.
- **Quy trình nộp tiền COD:**
  - Tiền COD thu bằng tiền mặt trong ca làm việc phải được bàn giao và nộp về Bưu cục / Hub vào cuối mỗi ca làm việc (trước 21:00 hàng ngày) hoặc nộp qua cổng thanh toán chuyển khoản nội bộ.
  - Tài xế có thể kiểm tra tổng tiền COD cần nộp trong mục "Ví & Thu hộ" trên ứng dụng.

## 3. Quy trình Xử lý Sự cố Giao hàng không thành công (FAILED / EXCEPTION)
- **Trường hợp không liên lạc được với người nhận:**
  - Tài xế phải thực hiện tối thiểu **3 cuộc gọi** trong khoảng thời gian cách nhau ít nhất 15 phút.
  - Chụp ảnh màn hình nhật ký cuộc gọi và chụp ảnh địa chỉ giao hàng để làm bằng chứng.
  - Cập nhật lý do trên app: "Không nghe máy", "Thuê bao", "Hẹn giao lại ngày mai".
- **Trường hợp người nhận từ chối nhận hàng (Khách hủy / không đúng hàng):**
  - Ghi nhận chính xác lý do khách từ chối trên app.
  - Tuyệt đối không tranh cãi hay có thái độ khiếm nhã với khách hàng.
  - Đóng gói bảo quản kiện hàng cẩn thận để bàn giao lại về kho hàng trả (Return Hub).

## 4. Quy định về Hàng Cấm & Tiêu chuẩn An toàn Vận chuyển
- **Hàng hóa cấm vận chuyển:**
  - Vũ khí, chất nổ, chất phóng xạ, chất độc hại, ma túy, chất kích thích, tài liệu phản động.
  - Tiền mặt, kim loại quý (vàng, bạc, kim cương), tài liệu pháp lý nhạy cảm không có bảo hiểm đặc biệt.
- **Hàng dễ vỡ / chất lỏng:**
  - Phải có dán nhãn "Hàng dễ vỡ" (Fragile).
  - Luôn đặt kiện hàng nhẹ lên trên, kiện hàng nặng ở dưới đáy thùng xe. Cố định cẩn thận tránh rung lắc, va đập trong suốt hành trình di chuyển.

## 5. Hỗ trợ khẩn cấp dành cho Tài xế
- Hotline Điều phối viên / Bưu cục quản lý: 1900-6868 (Phím 1 dành cho Tài xế).
- Trong trường hợp xe gặp sự cố, tai nạn hoặc hư hỏng dọc đường: Bấm nút "Báo sự cố khẩn cấp" trên ứng dụng, hệ thống điều phối sẽ điều xe hỗ trợ nhận chuyển giao hàng để đảm bảo cam kết SLA.

