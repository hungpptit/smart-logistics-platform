# BÁO CÁO ĐỊNH KỲ GIAI ĐOẠN 1 (TUẦN 1 & TUẦN 2)
## THỰC TẬP TỐT NGHIỆP NGÀNH CÔNG NGHỆ PHẦN MỀM (CNPM)
### Đề tài: Nền tảng điều vận và tối ưu hóa tuyến đường giao hàng tự động (Smart Logistics Platform — SLP)

**HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG — CƠ SỞ TẠI TP. HỒ CHÍ MINH**
**Mã nhóm:** C27  
**Giảng viên hướng dẫn:** ThS. Nguyễn Thị Bích Nguyên  

---

### THÔNG TIN THÀNH VIÊN
1. **Phạm Tuấn Hưng** — MSSV: N22DCCN037 (Vai trò: Backend & AI Engine)
2. **Hồ Thuận Kiều** — MSSV: N22DCCN046 (Vai trò: Mobile App Developer)
3. **Nguyễn Tấn Quý** — MSSV: N22DCCN066 (Vai trò: Frontend Web Developer)

---

## MỤC LỤC
1. [Mở đầu](#mở-đầu)
2. [CLO1 — Vận dụng kiến thức khoa học công nghệ ngành CNPM để xác định giải pháp an toàn thông tin](#clo1)
3. [CLO2 — Áp dụng kỹ thuật, công nghệ và công cụ bảo mật phần mềm để triển khai](#clo2)
4. [CLO3 — Vận dụng kỹ năng giao tiếp hiệu quả trong phát triển dự án](#clo3)
5. [CLO4 — Thể hiện phẩm chất đạo đức và trách nhiệm nghề nghiệp của kỹ sư phần mềm](#clo4)
6. [Phụ lục A: Kết quả thực hiện Tuần 1 & Tuần 2](#phu-luc-a)
7. [Phụ lục B: Kế hoạch thực hiện Tuần 3 & Tuần 4](#phu-luc-b)
8. [Phụ lục C: Phân công nhiệm vụ và kết quả chi tiết của từng thành viên](#phu-luc-c)

---

## MỞ ĐẦU

Báo cáo định kỳ 1 (BCĐK1) được thực hiện trong khuôn khổ học phần **Thực tập tốt nghiệp** ngành **Công nghệ Phần mềm (CNPM)**. Báo cáo tổng kết toàn bộ các hoạt động nghiên cứu, thiết kế, phát triển và tích hợp hệ thống **Smart Logistics Platform (SLP)** trong phạm vi **Tuần 1 và Tuần 2** (từ ngày 04/07/2026 đến ngày 11/07/2026).

Đề tài SLP được nhóm xây dựng nhằm giải quyết bài toán tối ưu hóa chi phí chặng cuối (last-mile delivery) tại một bưu cục giao nhận cuối (final hub), thông qua việc tích hợp các thuật toán AI định tuyến tiên tiến và cơ chế giám sát hành trình thời gian thực. Báo cáo này được cấu trúc đặc thù nhằm ánh xạ trực tiếp và làm rõ mức độ đạt được đối với 4 Chuẩn đầu ra (CLO) của học phần thực tập.

---

<a name="clo1"></a>
## CLO1 — Vận dụng kiến thức khoa học công nghệ ngành CNPM để xác định giải pháp an toàn thông tin

Trong vai trò kỹ sư Công nghệ Phần mềm, việc xác định giải pháp an toàn thông tin (ATTT) được thực hiện ngay từ giai đoạn phân tích thiết kế hệ thống (Security by Design). Nhóm đã vận dụng các kiến thức cốt lõi về **Kiến trúc phần mềm (Software Architecture)**, **Mô hình hóa dữ liệu (Database Design)** và **Đảm bảo chất lượng phần mềm (Software Quality Assurance)** để phân tích các lỗ hổng tiềm ẩn và đưa ra giải pháp bảo vệ tương ứng.

### 1.1. Phân tích nguy cơ an toàn thông tin đối với hệ thống SLP
Hệ thống logistics vận hành với 4 thực thể chính: Quản trị hệ thống (Admin), Nhân viên (Staff), Khách hàng (Customer), và Tài xế giao hàng (Shipper) với luồng dữ liệu luân chuyển liên tục. Nhóm đã phân tích và xác định các lỗ hổng ATTT có nguy cơ cao ở cả 3 tầng (Client - Server - Database):
*   **Tầng Client (Web & Mobile):** Rò rỉ dữ liệu phiên đăng nhập (Session/Token Hijacking), shipper giả mạo tọa độ định vị GPS chặng cuối, hoặc người dùng cố tình can thiệp vào mã nguồn Client để bypass logic.
*   **Tầng Server (API Gateway & Business Logic):** Lỗi xác thực lỏng lẻo, phân quyền không chặt chẽ dẫn đến lỗi leo thang đặc quyền (Privilege Escalation) ngang hoặc dọc; lỗi lộ thông tin chi tiết hệ thống qua log lỗi (Information Leakage).
*   **Tầng Database (Data Layer):** Tấn công SQL Injection thông qua các input form tìm kiếm/lọc đơn hàng; rò rỉ dữ liệu thông tin cá nhân khách hàng (PII) và thông tin COD của đơn hàng.

### 1.2. Giải pháp kỹ thuật phần mềm để đảm bảo an toàn thông tin
Từ các phân tích trên, nhóm đã thiết kế kiến trúc bảo mật tích hợp sâu vào quy trình phát triển phần mềm:
1.  **Thiết kế kiến trúc xác thực tập trung (Token-based Authentication):** Lựa chọn chuẩn **JWT (JSON Web Token)** để thực hiện xác thực không trạng thái (stateless), chia nhỏ token thành Access Token (ngắn hạn) và Refresh Token (dài hạn) lưu trữ an toàn ở Client.
2.  **Mô hình phân quyền đa cấp RBAC kết hợp ABAC:**
    *   **RBAC (Role-Based Access Control):** Enforce vai trò cụ thể tại API Middleware.
    *   **ABAC (Attribute-Based Access Control):** Kiểm tra quyền sở hữu tài nguyên (ví dụ: Shipper chỉ được cập nhật trạng thái của Route được gán trực tiếp cho họ thông qua kiểm tra `driverVehicleAssignmentId`).
3.  **Tích hợp lớp Kiểm duyệt dữ liệu đầu vào (Input Validation & Sanitization):** Sử dụng các Data Transfer Objects (DTOs) kết hợp với validator engine để lọc sạch dữ liệu trước khi đi vào tầng logic nghiệp vụ, ngăn chặn hoàn toàn XSS và SQL Injection.
4.  **Thiết kế cơ sở dữ liệu bảo toàn lịch sử (Soft Delete & Snapshots):** 
    *   Sử dụng cơ chế Soft Delete (cột `deletedAt`) thay vì xóa vật lý để tránh mất mát dữ liệu và giữ lại vết kiểm toán (audit trail).
    *   Áp dụng Snapshot đơn hàng (lưu cứng các thông tin địa chỉ, giá cước, khối lượng tại thời điểm tạo đơn) để đảm bảo tính toàn vẹn dữ liệu, chống lại việc chỉnh sửa thông tin đơn hàng sau khi đã duyệt.

---

<a name="clo2"></a>
## CLO2 — Áp dụng kỹ thuật, công nghệ và công cụ bảo mật phần mềm để triển khai

Nhóm đã hiện thực hóa các giải pháp bảo mật được thiết kế ở CLO1 vào mã nguồn thực tế của dự án SLP trong Tuần 2.

### 2.1. Triển khai Middleware Xác thực & Phân quyền ở Backend
Backend sử dụng Node.js + Express + TypeScript. Nhóm đã cài đặt lớp bảo vệ bảo mật tại `backend/src/middlewares/`:
*   **`authMiddleware` (`auth.middleware.ts`):** Nhận và giải mã JWT từ header `Authorization: Bearer <token>`. Nếu token không hợp lệ hoặc hết hạn, lập tức trả về mã lỗi HTTP `401 Unauthorized` mà không xử lý tiếp.
*   **`rbacMiddleware`:** Nhận danh sách các role được phép truy cập route. Ví dụ, route kích hoạt tối ưu hóa AI chỉ cho phép `ADMIN` hoặc `STAFF` sử dụng:
    ```typescript
    router.post('/optimize', authMiddleware, rbacMiddleware(['ADMIN', 'STAFF']), routingController.optimize);
    ```
*   **Bảo mật mật khẩu người dùng:** Sử dụng thư viện `bcryptjs` với salt rounds = 10 để băm (hash) mật khẩu của tất cả User trước khi lưu vào PostgreSQL.

### 2.2. Triển khai Data Validation và Parameterized Queries
*   **Data Validation:** Tầng Controller sử dụng `class-validator` để validate dữ liệu đầu vào. Mọi request không đúng định dạng (ví dụ: tọa độ vĩ độ không nằm trong khoảng [-90, 90], email không đúng định dạng) sẽ bị loại bỏ ở API Gateway với mã lỗi `400 Bad Request`.
*   **SQL Injection Prevention:** Nhóm sử dụng **Prisma ORM** để tương tác với cơ sở dữ liệu PostgreSQL. Prisma tự động chuyển đổi các truy vấn thành dạng Parameterized Queries, loại bỏ hoàn toàn khả năng bị khai thác SQL Injection thông qua các trường nhập liệu tự do.
*   **Quản lý biến môi trường bí mật:** Toàn bộ các thông tin nhạy cảm như `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GOONG_API_KEY` được đưa vào file `.env` nằm ngoài source code và được cấu hình trong `.gitignore` để tránh bị rò rỉ lên hệ thống quản lý mã nguồn Git.

### 2.3. Triển khai lưu trữ an toàn tại Client
*   **Web Admin (React + Zustand):** Token được lưu trữ trong State Management (Zustand) và được xóa sạch khi người dùng đăng xuất (Logout) hoặc đóng tab (nếu cấu hình session-only).
*   **Mobile App (Flutter):** Sử dụng thư viện `flutter_secure_storage` để lưu trữ mã hóa JWT trên bộ nhớ an toàn của thiết bị di động (Keychain trên iOS và Keystore trên Android), ngăn ngừa các ứng dụng độc hại khác đọc trộm token.

---

<a name="clo3"></a>
## CLO3 — Vận dụng kỹ năng giao tiếp hiệu quả trong phát triển dự án

Đối với một dự án phần mềm có quy mô gồm 39 bảng cơ sở dữ liệu và 3 phân hệ chạy song song (Backend, Web, Mobile), kỹ năng giao tiếp và đồng bộ thông tin đóng vai trò sống còn.

### 3.1. Thiết lập API Contract làm ngôn ngữ giao tiếp chung
Để tránh tình trạng xung đột và lệch pha trong quá trình phát triển độc lập giữa các thành viên:
*   Nhóm đã thiết lập tài liệu API Contract sử dụng công cụ **Swagger UI** tại endpoint `/api-docs`. 
*   Mỗi API endpoint được định nghĩa rõ ràng về: URL, HTTP Method, cấu trúc Request Body (DTO), cấu trúc Response (Success/Error) và các mã lỗi trả về.
*   **Phạm Tuấn Hưng (Backend)** viết JSDoc annotations trong code để Swagger tự động sinh tài liệu. **Nguyễn Tấn Quý (Frontend)** và **Hồ Thuận Kiều (Mobile)** dựa vào tài liệu này để phát triển UI và tích hợp API một cách chính xác mà không cần liên lạc trực tiếp thường xuyên.

### 3.2. Đồng bộ hóa quy trình phát triển qua Git & Daily Sync
*   **Git Workflow:** Nhóm áp dụng mô hình Git Branching chuẩn. Nhánh `main` dùng cho production, nhánh `develop` dùng cho tích hợp chung. Mỗi thành viên phát triển tính năng trên nhánh riêng (ví dụ: `feature/auth-backend`, `feature/create-order-mobile`) và thực hiện Pull Request (PR) khi hoàn thành.
*   **Code Review:** Các PR đều được thảo luận công khai trên hệ thống Git để đóng góp ý kiến tối ưu mã nguồn và kiểm soát chất lượng code trước khi gộp (Merge).
*   **Daily Sync:** Nhóm duy trì kênh chat trực tuyến để báo cáo nhanh hàng ngày theo mô hình Scrum: Hôm qua làm gì? Hôm nay làm gì? Có gặp khó khăn (blockers) gì không? Từ đó giúp giải quyết nhanh các vấn đề về môi trường chạy thử hoặc lỗi bất tương thích API.

---

<a name="clo4"></a>
## CLO4 — Thể hiện phẩm chất đạo đức và trách nhiệm nghề nghiệp của kỹ sư phần mềm

Đạo đức nghề nghiệp của một kỹ sư Công nghệ Phần mềm được nhóm thể hiện qua sự nghiêm túc, tuân thủ pháp luật và có trách nhiệm với sản phẩm mình làm ra.

### 4.1. Tôn trọng quyền riêng tư và bảo vệ dữ liệu người dùng
*   Nhóm ý thức được tầm quan trọng của thông tin địa chỉ và số điện thoại khách hàng. Mọi dữ liệu kiểm thử (Seeded Data) trong Tuần 1 và Tuần 2 đều là dữ liệu giả lập (mock data) tự sinh thông qua script `seed.ts`, tuyệt đối không sử dụng thông tin cá nhân của người dùng thật.
*   Thiết kế hệ thống có cơ chế phân quyền chặt chẽ (đã trình bày ở CLO1 và CLO2) để đảm bảo dữ liệu của khách hàng này không bị rò rỉ sang khách hàng khác.

### 4.2. Tuân thủ bản quyền công nghệ và giấy phép nguồn mở
*   Trong quá trình phát triển, nhóm sử dụng các thư viện nguồn mở phổ biến như Express, Prisma, Flutter SDK, Leaflet, Open Source Routing Machine (OSRM). Nhóm luôn kiểm tra và tuân thủ các điều khoản giấy phép (MIT, Apache 2.0) của các thư viện này.
*   Khi sử dụng **Goong Geocoding API**, nhóm đăng ký tài khoản phát triển chính thức, quản lý quota sử dụng hợp lý và không chia sẻ API Key ra bên ngoài.

### 4.3. Ý thức trách nhiệm và tính kỷ luật trong dự án
*   Mỗi thành viên tự giác hoàn thành các công việc được phân công đúng thời hạn (Definition of Done - DoD) đã cam kết trong kế hoạch 4 tuần.
*   Viết code sạch, có chú thích đầy đủ, tuân thủ các tiêu chuẩn kỹ thuật đã thống nhất trong tài liệu `development_standards.md`.
*   Thiết lập cơ chế xử lý lỗi chặt chẽ tại Backend, đảm bảo hệ thống không bị crash đột ngột làm gián đoạn trải nghiệm của người dùng.

---

<a name="phu-luc-a"></a>
## PHỤ LỤC A: KẾT QUẢ THỰC HIỆN TUẦN 1 & TUẦN 2

### A.1. Kết quả đạt được của Tuần 1 (Nền tảng & Kiến trúc)
*   **Thiết kế DB:** Hoàn thành sơ đồ ERD gồm **39 bảng nghiệp vụ** chia thành 9 phân hệ logic. Migrate thành công lên PostgreSQL thông qua Prisma ORM.
*   **Setup hạ tầng:** Cấu hình thành công Docker Compose chạy PostgreSQL 15 tích hợp PostGIS và Redis 7 làm cache tọa độ GPS.
*   **Khởi tạo mã nguồn:** Tạo cấu trúc dự án chuẩn cho Backend (Express/TS), Web Admin (React + Zustand + Tailwind) và Mobile App (Flutter).
*   **Seed dữ liệu:** Viết file `seed.ts` tự động nạp cấu hình hệ thống, dịch vụ logistics, và tài khoản mẫu cho 4 vai trò: Quản trị hệ thống (Admin), Nhân viên (Staff), Khách hàng (Customer), và Tài xế giao hàng (Shipper).

### A.2. Kết quả đạt được của Tuần 2 (Chức năng cốt lõi & Bảo mật)
*   **Phân hệ Auth:** Cài đặt xong API Login/Register, cơ chế ký/verify JWT Access + Refresh Token, mã hóa bcryptjs và Middleware phân quyền RBAC.
*   **Phân hệ Khách hàng:** Hoàn thành CRUD hồ sơ khách hàng, quản lý sổ địa chỉ giao/nhận.
*   **Phân hệ Kho bãi (Facility):** API quản lý bưu cục cuối và phân chia Cargo Zones (Sorting, Shipping, Receiving).
*   **Phân hệ Đơn hàng (Order):** Tích hợp Goong Geocoding chuyển địa chỉ thành tọa độ Lat/Lng; PricingService tự động tính cước dựa trên khoảng cách và trọng lượng; sinh mã QR vận đơn và lưu trữ Snapshot đơn hàng.
*   **Thuật toán AI (Phát triển sớm):** Triển khai xong lõi K-Means Clustering phân cụm địa lý đơn hàng và Genetic Algorithm (VRP) tối ưu lộ trình với các ràng buộc tải trọng (CVRP) và khung giờ giao nhận (VRPTW).

---

<a name="phu-luc-b"></a>
## PHỤ LỤC B: KẾ HẠCH THỰC HIỆN TUẦN 3 & TUẦN 4

*   **Tuần 3 (Vận đơn & Giám sát Realtime):** Triển khai APIs Shipment, Fleet & Driver; tích hợp Socket.io nhận luồng GPS realtime từ Shipper App Flutter (chạy ngầm); hiển thị vị trí shipper động trên bản đồ Command Center của Web Admin; Shipper quét mã QR check-in điểm dừng và chụp ảnh bằng chứng giao hàng (POD).
*   **Tuần 4 (Tích hợp AI & Dashboard):** Tích hợp thuật toán K-Means + GA VRP vào luồng chạy tự động thông qua endpoint `/routing/optimize`; xây dựng giao diện cấu hình tham số AI cho Admin; hoàn thiện dashboard thống kê số liệu giao hàng; tiến hành kiểm thử tích hợp E2E và tối ưu hiệu năng hệ thống.

---

<a name="phu-luc-c"></a>
## PHỤ LỤC C: PHÂN CÔNG NHIỆM VỤ VÀ KẾT QUẢ CHI TIẾT CỦA TỪNG THÀNH VIÊN (TUẦN 1 & TUẦN 2)

Nhóm C27 thực hiện phân chia công việc theo mô hình chuyên môn hóa kết hợp tích hợp liên tục để đảm bảo tiến độ dự án. Dưới đây là bảng chi tiết các đầu việc đã hoàn thành của từng thành viên:

### C.1. Thành viên 1: Phạm Tuấn Hưng (Backend & AI Routing Developer)

Đảm nhận phát triển toàn bộ kiến trúc Server, Cơ sở dữ liệu và Lõi thuật toán AI tối ưu hóa của hệ thống Smart Logistics Platform (SLP).

*   **Kết quả công việc trong Tuần 1 (Thiết lập Nền tảng & DB Layer):**
    *   **Phân tích & Thiết kế DB:** Thiết kế chi tiết **39 bảng cơ sở dữ liệu** thuộc 9 module nghiệp vụ. Hoàn thành sơ đồ thực thể mối quan hệ ERD.
    *   **Prisma Migration & ORM:** Chạy Prisma Migrations đồng bộ schema lên PostgreSQL. Tích hợp PostGIS (hỗ trợ xử lý tọa độ địa lý) và cấu hình cơ sở dữ liệu cache Redis.
    *   **Dockerization:** Cấu hình thành công container Docker Compose đóng gói PostgreSQL 15, PostGIS và Redis 7 Alpine chạy độc lập trên local.
    *   **Database Seeding:** Viết file `seed.ts` tự động hóa việc nạp cấu hình hệ thống ban đầu, phân quyền vai trò (Roles & Permissions), các gói cước vận chuyển và 4 tài khoản kiểm thử cho 4 vai trò của hệ thống.
*   **Kết quả công việc trong Tuần 2 (Chức năng cốt lõi, Bảo mật & AI):**
    *   **Bảo mật & Phân quyền:** Xây dựng luồng xác thực token-based JWT (Access Token + Refresh Token), mã hóa một chiều mật khẩu bằng `bcryptjs` (salt rounds = 10). Cài đặt Middleware `authMiddleware` và `rbacMiddleware` phân quyền cho 4 vai trò: Quản trị hệ thống (Admin), Nhân viên (Staff), Khách hàng (Customer), và Tài xế giao hàng (Shipper).
    *   **Nghiệp vụ cốt lõi (Core Business APIs):** 
        *   Phát triển APIs CRUD Khách hàng, quản lý sổ địa chỉ (Address Book - 1 khách hàng có nhiều địa chỉ).
        *   Phát triển APIs quản lý Bưu cục (`Facility`) và các khu vực lưu trữ hàng hóa (`CargoZone`).
        *   Phát triển APIs CRUD đơn hàng, kiện hàng (`Packages`), lịch sử trạng thái đơn hàng (`OrderStatusTimeline`).
    *   **Tích hợp & Tính phí:** Tích hợp Goong Geocoding API chuyển đổi địa chỉ thô thành tọa độ GPS (Vĩ độ/Kinh độ). Xây dựng logic tự động tính cước vận chuyển dựa trên khoảng cách, trọng lượng đơn hàng, gói cước và phụ phí. Sinh mã vận đơn tự động dạng QR Code và lưu Snapshot dữ liệu đơn hàng.
    *   **Nghiên cứu & Triển khai thuật toán AI (Hoàn thành sớm):** 
        *   Triển khai lõi K-Means Clustering (`kmeans.service.ts`) phân cụm đơn hàng tự động theo vùng địa lý để phân bổ cho bưu cục chặng cuối.
        *   Triển khai thuật toán Di truyền (Genetic Algorithm - `vrp.service.ts`) giải bài toán điều vận xe tải trọng giới hạn (CVRP) và có khung giờ giao hàng (VRPTW).
    *   **Swagger & Postman:** Viết tài liệu Swagger API chi tiết và chuẩn bị bộ kiểm thử APIs trên Postman để chuyển giao cho Frontend/Mobile tích hợp.

---

### C.2. Thành viên 2: Nguyễn Tấn Quý (Frontend Web Developer)

Đảm nhận phát triển toàn bộ các giao diện người dùng trên nền tảng Web, bao gồm trang Landing Page giới thiệu dịch vụ và hệ thống Web Admin Dashboard quản trị nghiệp vụ.

*   **Kết quả công việc trong Tuần 1 (Khởi tạo & Mock Giao diện):**
    *   **Khởi tạo dự án:** Khởi chạy cấu trúc dự án React + Vite + TailwindCSS đảm bảo tuân thủ tiêu chuẩn code sạch.
    *   **Landing Page v1:** Thiết kế khung giao diện Landing Page, tích hợp bản đồ Leaflet ban đầu hỗ trợ người dùng tra cứu nhanh hành trình của đơn hàng.
    *   **Developer Dashboard:** Xây dựng trang Dashboard nội bộ mô phỏng trực quan cách thức hoạt động của cơ chế phân quyền RBAC.
*   **Kết quả công việc trong Tuần 2 (Hoàn thiện Giao diện & Tích hợp APIs):**
    *   **Hoàn thiện Landing Page:** Phát triển hoàn chỉnh form tính phí cước nhanh (khoảng cách + cân nặng) và hiển thị timeline di chuyển chi tiết khi khách hàng nhập mã vận đơn.
    *   **Giao diện Auth & Security:** Thiết kế trang Đăng nhập hệ thống Admin, cài đặt quản lý trạng thái phiên đăng nhập thông qua Zustand (lưu trữ JWT an toàn) và viết Route Guards chặn các truy cập trái phép. Phân quyền hiển thị Menu bên cạnh (Sidebar) dựa trên vai trò của tài khoản đăng nhập.
    *   **Giao diện Quản trị Nghiệp vụ (Dashboard Tabs):**
        *   Xây dựng màn hình danh sách và chi tiết Khách hàng, cùng giao diện quản lý Sổ địa chỉ tương ứng.
        *   Xây dựng màn hình hiển thị cơ cấu Kho bãi / Bưu cục và quản lý danh sách phân khu hàng hóa (`CargoZone`).
        *   Xây dựng bảng quản trị Đơn hàng toàn cục cho Nhân viên điều phối, hỗ trợ lọc trạng thái, xem chi tiết kiện hàng và cập nhật thủ công trạng thái đơn hàng.

---

### C.3. Thành viên 3: Hồ Thuận Kiều (Mobile Developer)

Đảm nhận phát triển ứng dụng di động dành cho Khách hàng sử dụng Flutter SDK để thực hiện các thao tác đặt hàng, thanh toán và theo dõi lộ trình thời gian thực.

*   **Kết quả công việc trong Tuần 1 (Thiết lập Flutter & Wireframes):**
    *   **Khởi tạo dự án:** Thiết lập cấu trúc dự án Flutter, cấu hình Router điều hướng và các thư viện gọi API (Dio), quản lý trạng thái (Riverpod).
    *   **Thiết kế giao diện (UI Wireframes):** 
        *   Xây dựng giao diện Khách hàng (Đăng ký, Đăng nhập, Form tạo đơn hàng chi tiết).
        *   Xây dựng mockup giao diện Tài xế (Bản đồ danh sách điểm dừng, màn hình giả lập quét mã QR check-in, màn hình ký tên nhận hàng POD và chụp ảnh bằng chứng giao hàng).
*   **Kết quả công việc trong Tuần 2 (Hoàn thiện App Khách hàng & Kết nối API Backend):**
    *   **Luồng Xác thực di động:** Phát triển màn hình Đăng ký, Đăng nhập, Đăng xuất và Khôi phục mật khẩu. Tích hợp thư viện `flutter_secure_storage` để lưu trữ token JWT mã hóa trên bộ nhớ an toàn của thiết bị (Keychain/Keystore).
    *   **Trang chủ Khách hàng:** Giao diện hiển thị danh sách các đơn hàng gần đây, widget tính cước nhanh và phím tắt tạo đơn nhanh.
    *   **Luồng Tạo đơn hàng & Tracking:**
        *   Phát triển form Tạo đơn hàng đơn lẻ và Tạo đơn hàng loạt. Tích hợp công cụ tự động gợi ý địa chỉ qua Goong Autocomplete SDK.
        *   Tích hợp API tính toán cước phí hiển thị thời gian thực khi khách hàng nhập địa chỉ và cân nặng kiện hàng.
        *   Hiển thị mã QR của vận đơn sau khi tạo đơn hàng thành công để khách hàng có thể lưu trữ/in ấn.
        *   Xây dựng màn hình lịch sử đơn hàng, xem chi tiết timeline thay đổi trạng thái của đơn hàng và cho phép khách hàng chủ động bấm hủy đơn hàng khi đơn ở trạng thái chờ lấy.

---

*Báo cáo được trích xuất và đối chiếu trực tiếp từ kho mã nguồn thực tế của dự án tại thời điểm ngày 15/07/2026.*
*Đại diện nhóm thực hiện ký tên xác nhận.*
