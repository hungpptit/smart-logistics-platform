# BẢNG PHÂN CHIA NHIỆM VỤ DỰ ÁN SMART LOGISTICS PLATFORM (SLP) - TUẦN 2

Tài liệu này tập trung phân chia chi tiết các công việc trong **Tuần 2 (Active Sprint)** cho 3 thành viên phát triển.
*(Lưu ý: Tuần 1 đã hoàn thành 100% mục tiêu cốt lõi; Tuần 3 và 4 sẽ được bổ sung sau khi kết thúc Tuần 2).*

*   **Thành viên 1:** Phụ trách APIs Backend và kết nối dịch vụ bên thứ ba cho các phân hệ cốt lõi.
*   **Thành viên 2:** Phụ trách Frontend Web Admin, trang giới thiệu Landing Page và Route Guards bảo vệ.
*   **Thành viên 3:** Phụ trách Mobile App (Flutter) cho Khách hàng, các form nghiệp vụ đăng ký/tạo đơn/tracking.

---

## 📌 ĐÁNH GIÁ KẾT QUẢ ĐÃ HOÀN THÀNH TRONG TUẦN 1

Hệ thống đã hoàn thành **100% mục tiêu cốt lõi** của Tuần 1:
*   **Thiết kế & DB Layer:** Hoàn thiện kiến trúc EDA (Express + Socket.io + Redis + PostgreSQL + PostGIS). Thiết lập sơ đồ ERD và đồng bộ schema **38 bảng** qua Prisma Migrations; viết và chạy thành công script `seed.ts` để nạp dữ liệu mẫu (Roles, Permissions, Accounts).
*   **Backend Core:** Khởi tạo dự án Express TypeScript, đóng gói Docker Compose cho Postgres/PostGIS/Redis và cấu hình WebSockets ban đầu.
*   **Frontend Web:** Khởi tạo React + Vite + TailwindCSS. Xây dựng Landing Page tích hợp bản đồ tra cứu vận đơn/timeline và Developer Dashboard mô phỏng hiển thị quyền RBAC.
*   **Mobile App (Flutter):** Khởi tạo dự án Flutter. Thiết kế xong giao diện Khách hàng (Auth, Tạo đơn chi tiết) và giao diện Tài xế (Bản đồ stops, giả lập quét barcode, chụp ảnh POD và ký xác nhận).

---

## TÓM TẮT VAI TRÒ & PHẠM VI CÔNG VIỆC TRONG TUẦN 2

| Thành viên | Phân vai chính | Công nghệ sử dụng | Phạm vi công việc chính trong Tuần 2 |
| :--- | :--- | :--- | :--- |
| **Thành viên 1** | Backend Developer | Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Redis, Geocoding API | APIs Xác thực (JWT/RBAC), APIs Khách hàng & Sổ địa chỉ, APIs Kho bãi, APIs Đơn hàng & Tính phí tự động. |
| **Thành viên 2** | Frontend Web Developer | React, Vite, TailwindCSS, Zustand, React Query | Web Landing Page (tra cứu/tính phí nhanh), Form Đăng nhập Web Admin, Route Guards phân quyền, UI quản lý Khách hàng, Kho bãi và Đơn hàng. |
| **Thành viên 3** | Mobile Developer | Flutter, Riverpod/Bloc, Dio, Google Maps SDK | App Khách hàng: Auth, Đăng ký, Tạo đơn hàng (lẻ/hàng loạt), Xem danh sách đơn và Timeline trạng thái. |

---

## CHI TIẾT PHÂN CHIA NHIỆM VỤ TUẦN 2 (ACTIVE SPRINT)

**Mục tiêu:** Hoàn thành xác thực phân quyền, quản lý khách hàng, kho bãi và luồng tạo đơn hàng. Sau tuần này, khách hàng có thể tạo đơn hàng từ cả Web và App; nhân viên có thể quản lý đơn hàng và cấu trúc kho trên Web Admin.

#### 📋 Phân chia nhiệm vụ chi tiết:

##### 👤 Thành viên 1: APIs Nghiệp vụ Cốt lõi
- [x] **Xác thực & Phân quyền (RBAC):** Xây dựng APIs Đăng ký, Đăng nhập, Đăng xuất, Refresh Token (mã hóa bcrypt). Viết middleware phân quyền RBAC dựa trên JWT cho 4 vai trò (Admin, Staff, Customer, Shipper).
- [x] **APIs Quản lý Khách hàng & Kho bãi:** 
  - APIs quản lý thông tin khách hàng, sổ địa chỉ (Address Book - mỗi khách hàng có nhiều địa chỉ).
  - APIs quản lý bưu cục (Facility) và phân khu lưu kho hàng hóa (nhận, phân loại, xuất).
- [x] **APIs Đơn hàng & Tính phí:**
  - APIs CRUD đơn hàng, kiện hàng (Packages), timeline trạng thái và lịch sử thanh toán.
  - Tích hợp Geocoding API chuyển đổi địa chỉ gửi/nhận thành tọa độ `[Kinh độ, Vĩ độ]`.
  - Xây dựng công cụ tính phí cước tự động (Rule-based engine: khoảng cách + trọng lượng + gói cước + phụ phí).
  - Sinh mã vận đơn tự động dạng QR Code và lưu Snapshot thông tin đơn hàng tại thời điểm tạo để bảo toàn lịch sử giao dịch.
- [x] **Swagger & Postman:** Viết tài liệu Swagger API chi tiết và tạo bộ kiểm thử Postman để chạy Integration Testing cho các APIs trên.

##### 👤 Thành viên 2: Web Admin & Landing Page
- [x] **Trang Web giới thiệu (Landing Page):** Phát triển giao diện giới thiệu dịch vụ, tích hợp form tra cứu vận đơn nhanh qua mã vận đơn (hiển thị timeline trạng thái) và công cụ tính nhanh cước phí (Rule-based).
- [x] **Giao diện Auth & RBAC Web:** Thiết kế form Đăng nhập, cài đặt Route Guards bảo vệ các trang quản lý và phân quyền hiển thị menu theo vai trò.
- [x] **Giao diện Quản trị Cốt lõi:**
  - Trang quản lý Khách hàng & Sổ địa chỉ (danh sách, chi tiết, cập nhật thông tin).
  - Trang cấu trúc Kho bãi / Bưu cục và phân khu chứa hàng (nhận, phân loại, xuất).
  - Trang danh sách đơn hàng toàn cục cho nhân viên, cập nhật thông tin và kiểm tra trạng thái kiện hàng.

##### 👤 Thành viên 3: Customer Mobile App
- [x] **Xác thực di động:** Màn hình Đăng nhập, Đăng ký và Quên mật khẩu cho Khách hàng.
- [x] **Giao diện Khách hàng:** Trang chủ hiển thị danh sách đơn gần đây, phím tắt Tạo đơn và Tra cứu nhanh.
- [x] **Luồng Tạo đơn & Tracking:**
  - Màn hình tạo đơn hàng lẻ/hàng loạt (điền địa chỉ tự động, tính cước phí trước).
  - Màn hình hiển thị mã QR vận đơn để in/dán.
  - Màn hình đặt lịch hẹn lấy hàng, danh sách đơn hàng cá nhân, xem timeline trạng thái chi tiết, hủy đơn trước khi lấy hàng.

> [!IMPORTANT]
> **Tiêu chuẩn hoàn thành Tuần 2 (DoD 2):**
> * Khách hàng thực hiện được toàn bộ luồng đăng ký, đăng nhập và tạo đơn hàng từ cả Web và Customer Mobile App.
> * Backend tính toán cước phí chính xác, lưu đúng Snapshot thông tin đơn hàng và chuyển đổi địa chỉ sang tọa độ GPS thành công.
> * Nhân viên có thể quản lý, xem thông tin kho bãi và đơn hàng trên Web Admin.

---




