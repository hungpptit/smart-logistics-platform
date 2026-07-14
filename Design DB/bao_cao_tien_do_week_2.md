# BÁO CÁO TIẾN ĐỘ TUẦN 2 — DỰ ÁN SMART LOGISTICS PLATFORM (SLP)
**Ngày báo cáo:** 11/07/2026  
**Giai đoạn:** Phase 1 — Phân hệ cốt lõi & Nghiệp vụ cốt lõi  
**Tình trạng tổng thể:** **ĐẠT TIẾN ĐỘ (ON TRACK)** (Hoàn thành 100% mục tiêu cốt lõi của Tuần 2)

---

## I. CÁC CÔNG VIỆC ĐÃ HOÀN THÀNH (WEEK 2 ACHIEVEMENTS)

### 1. Phân hệ Backend APIs (Thành viên 1)
*   **Xác thực & Phân quyền (Auth & RBAC):** 
    *   Xây dựng hệ thống đăng nhập, đăng ký, đăng xuất sử dụng **JWT (Access Token & Refresh Token)** bảo mật.
    *   Mã hóa mật khẩu bằng thuật toán **bcryptjs**.
    *   Triển khai bộ middleware phân quyền nâng cao **Role-Based Access Control (RBAC)** bảo vệ nghiêm ngặt tài nguyên cho 4 vai trò chính: `ADMIN`, `STAFF`, `CUSTOMER`, và `DRIVER`.
*   **Quản lý Khách hàng & Sổ địa chỉ:**
    *   Hoàn thành bộ APIs CRUD Khách hàng, sổ địa chỉ (Address Book - hỗ trợ lưu nhiều địa chỉ cho mỗi khách hàng).
    *   Đảm bảo ràng buộc nghiệp vụ: Không cho phép xóa khách hàng nếu vẫn còn đơn hàng chưa hoàn thành trong hệ thống.
*   **Quản lý Kho bãi (Facility Management):**
    *   Hoàn thiện APIs quản lý mạng lưới bưu cục/kho bãi (Facility) và phân khu lưu kho hàng hóa (Receiving Zone, Sorting Zone, Shipping Zone).
    *   Xây dựng mối liên kết dữ liệu giữa Nhân viên (Staff) và Kho bãi mà họ được chỉ định để phục vụ phân quyền dữ liệu.
*   **Quản lý Đơn hàng & Tính phí tự động:**
    *   Triển khai bộ APIs quản lý đơn hàng (`Order`), kiện hàng (`Package`), lịch sử trạng thái (`OrderStatusHistory`) và lịch sử thanh toán (`OrderPayment`).
    *   Tích hợp **Goong Geocoding API** tự động phân tích địa chỉ người gửi/người nhận thành tọa độ địa lý `[Latitude, Longitude]`.
    *   Xây dựng **Pricing Service** tự động tính toán cước phí vận chuyển chính xác dựa trên quy tắc khoảng cách, trọng lượng thực tế/quy đổi (Volume Weight), loại gói cước dịch vụ và bảo hiểm hàng hóa.
    *   Thiết lập cơ chế sinh mã vận đơn tự động dạng QR Code và tự động lưu **Snapshot** địa chỉ/người liên hệ tại thời điểm tạo đơn để bảo toàn lịch sử giao dịch.
*   **Tài liệu Swagger & Postman:** 
    *   Viết tài liệu **Swagger OpenAPI Spec** chi tiết cho toàn bộ APIs cốt lõi.
    *   Xây dựng bộ kiểm thử tích hợp (Integration Tests) bằng Postman Collection.

    *Ảnh minh họa:*
    ![Tài liệu Swagger OpenAPI & Postman Tests](file:///D:/smart-logistics-platform/Design%20DB/screenshots/swagger_postman_api.png)

### 2. Phân hệ Frontend Web (Thành viên 2)
*   **Landing Page & Tra cứu nhanh:** 
    *   Thiết kế và xây dựng giao diện Landing Page giới thiệu dịch vụ logistics trực quan.
    *   Tích hợp tính năng **Tra cứu vận đơn** nhanh (hiển thị timeline trạng thái đơn hàng thời gian thực).
    *   Công cụ ước tính cước phí nhanh (Rule-based Calculator) tiện lợi cho khách hàng vãng lai.
    
    *Ảnh minh họa:*
    ![Landing Page & Tính năng tra cứu nhanh](file:///D:/smart-logistics-platform/Design%20DB/screenshots/landing_page_tracking.png)

*   **Giao diện Đăng nhập & Route Guards:**
    *   Xây dựng Form đăng nhập an toàn kết hợp quản lý trạng thái JWT bằng Zustand.
    *   Triển khai **Route Guards** ở phía Frontend để ngăn chặn truy cập trái phép và ẩn/hiển thị các mục menu điều phối dựa trên quyền của tài khoản.
*   **Bảng điều khiển Quản trị (Core Admin Dashboard):**
    *   Hoàn thiện trang quản lý danh mục **Khách hàng** và sổ địa chỉ gửi/nhận.
    *   Trang quản lý mạng lưới **Kho bãi & Phân khu hàng hóa** dành cho Admin.
    *   Màn hình danh sách đơn hàng toàn cục cho phép nhân viên cập nhật nhanh trạng thái đơn hàng và kiểm tra thông tin chi tiết kiện hàng.

    *Ảnh minh họa:*
    ![Bảng điều khiển Quản trị - Quản lý Khách hàng & Kho bãi](file:///D:/smart-logistics-platform/Design%20DB/screenshots/admin_dashboard.png)

### 3. Phân hệ Ứng dụng Di động cho Khách hàng (Thành viên 3)
*   **Auth di động:** Hoàn thành giao diện Đăng nhập, Đăng ký và Quên mật khẩu.
*   **Giao diện Tạo đơn & Tracking:**
    *   Xây dựng luồng tạo đơn hàng chi tiết (lẻ/hàng loạt) tự động điền địa chỉ thông qua Autocomplete API và tính phí trước (Pre-calculation).
    *   Hiển thị mã QR Code vận đơn để hỗ trợ nhân viên quét mã nhận hàng.
    *   Trang quản lý đơn hàng của tôi, xem chi tiết timeline trạng thái di chuyển và hỗ trợ hủy đơn trước khi bốc hàng.

    *Ảnh minh họa:*
    ![Giao diện Mobile App - Đăng nhập & Tạo đơn hàng](file:///D:/smart-logistics-platform/Design%20DB/screenshots/mobile_app_flow.png)

---

## II. ĐÁNH GIÁ TIÊU CHUẨN HOÀN THÀNH (DoD 2 EVALUATION)

> [!IMPORTANT]
> **Đánh giá DoD 2 (Definition of Done):**
> *   [x] Khách hàng thực hiện được toàn bộ luồng đăng ký, đăng nhập và tạo đơn hàng từ cả Web và Customer Mobile App.
> *   [x] Backend tính toán cước phí chính xác, lưu đúng Snapshot thông tin đơn hàng và chuyển đổi địa chỉ sang tọa độ GPS thành công.
> *   [x] Nhân viên có thể quản lý, xem thông tin kho bãi và đơn hàng trên Web Admin.
> *   **Tỷ lệ hoàn thành:** **100%** mục tiêu đề ra cho Sprint Tuần 2.

---


