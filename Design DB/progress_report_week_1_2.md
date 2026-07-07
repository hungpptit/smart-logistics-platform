# BÁO CÁO ĐÁNH GIÁ TIẾN ĐỘ TUẦN 1 & TUẦN 2 (THÀNH VIÊN 1 & 2)
**Dự án:** Smart Logistics Platform (SLP) - Hệ thống điều vận và tối ưu hóa tuyến đường giao hàng tự động.  
**Ngày báo cáo:** 07/07/2026  
**Người đánh giá:** Antigravity (AI Co-pilot)  

---

## I. TỔNG QUAN TIẾN ĐỘ CHUNG (OVERALL STATUS)
Dựa trên việc kiểm tra trực tiếp mã nguồn trong thư mục `backend/` và `frontend/`, lịch sử commits, cùng các tài liệu kế hoạch:
*   **Trạng thái tổng thể:** **ĐẠT TIẾN ĐỘ 100% (ON TRACK)**.
*   **Mức độ hoàn thành công việc:** Cả hai thành viên đã hoàn thành toàn bộ các đầu việc cốt lõi được giao cho Tuần 1 & Tuần 2.
*   **Mức độ bám sát đề tài:** **Bám sát hoàn toàn** các yêu cầu nghiệp vụ và cấu trúc kỹ thuật đề ra trong [Ý tưởng đồ án .md](../Ý tưởng đồ án .md) và [phase 1.md](phase 1.md). Không có sự lệch đề tiêu cực; ngược lại có một số cải tiến tích cực nâng cao tính thực tế của sản phẩm.

---

## II. CHI TIẾT ĐÁNH GIÁ TIẾN ĐỘ THÀNH VIÊN 1 (BACKEND DEVELOPER)

### 1. Kết quả đạt được trong Tuần 1 & Tuần 2
*   **Thiết lập kiến trúc EDA & Database Layer (Tuần 1):**
    *   Khởi tạo dự án Express TypeScript với cấu trúc thư mục chuẩn hóa.
    *   Đóng gói Container Docker cho PostgreSQL + PostGIS và Redis Server.
    *   Thiết kế và đồng bộ thành công **38 bảng cơ sở dữ liệu** thông qua Prisma Migrations lên PostgreSQL.
    *   Xây dựng script `seed.ts` nạp đầy đủ dữ liệu Master (Vai trò, Quyền hạn, Gói cước dịch vụ, Tham số cấu hình AI và chu kỳ GPS).
*   **Xác thực & Phân quyền RBAC (Tuần 2):**
    *   Hoàn thiện luồng Auth: Đăng ký, Đăng nhập, Đăng xuất, Refresh Token (mã hóa mật khẩu bằng bcrypt).
    *   Tích hợp Redis Caching quản lý phiên đăng nhập và blacklist JWT Token khi Logout.
    *   Xây dựng Middleware phân quyền RBAC chặt chẽ cho 4 vai trò: `ADMIN`, `STAFF`, `CUSTOMER`, `SHIPPER`.
*   **APIs Nghiệp vụ Cốt lõi (Tuần 2):**
    *   **Customer & Address Book:** CRUD thông tin khách hàng, quản lý sổ địa chỉ (mỗi khách hàng nhiều địa chỉ, hỗ trợ thiết lập duy nhất một địa chỉ mặc định `isDefault`), kiểm tra phân quyền ngang (Ownership check) đảm bảo khách hàng không xem được thông tin của khách hàng khác.
    *   **Facility & Cargo Zones:** Quản lý bưu cục (cấu trúc cây phân cấp `parentFacilityId`) và phân khu lưu kho (Receiving, Sorting, Storage, Dispatch...). Ràng buộc chặt chẽ: chỉ Admin/Staff thao tác; không cho phép xóa kho nếu có kho con trực thuộc hoặc có tuyến vận tải hoạt động.
    *   **Order & Pricing Engine:**
        *   Tích hợp Nominatim Geocoding API để chuyển đổi địa chỉ thành tọa độ GPS `[Latitude, Longitude]` cùng cơ chế mock fallback an toàn.
        *   Xây dựng bộ tính phí cước tự động dựa trên khoảng cách (Haversine), trọng lượng kiện hàng, loại hình dịch vụ (`EXPRESS`, `STANDARD`, `SAVING`, `COLD_CHAIN`) và phụ phí (hàng dễ vỡ, bảo hiểm/COD).
        *   Quy trình đặt đơn chạy trong Database Transaction: tự động sinh mã đơn/kiện hàng độc nhất, lưu trữ **Snapshot thông tin địa chỉ/liên hệ** tại thời điểm tạo đơn (giúp bảo toàn dữ liệu lịch sử khi khách hàng thay đổi sổ địa chỉ sau này), ghi nhận lịch sử trạng thái `OrderStatusHistory` và thông tin thanh toán mặc định.
*   **API Documentation:** Tài liệu Swagger (tích hợp tại `/api-docs` thông qua `swagger-jsdoc`) và bộ kịch bản kiểm thử API tự động Postman (`velocity_api_collection.json`) đã hoàn thành 100%.

### 2. Điểm nổi bật & Cải tiến (Positive Enhancements)
*   **Chuẩn hóa dữ liệu địa chính Việt Nam:** Thành viên 1 đã chủ động thiết lập thêm các bảng `Province`, `Ward`, `AdministrativeUnit`, và `AdministrativeRegion` trong `schema.prisma` và import dữ liệu hành chính chuẩn Việt Nam từ file SQL.
*   **Address Resolver:** Viết module `address-resolver.ts` tự động phân tách và chuẩn hóa địa chỉ phẳng (`ward`, `district`, `province`) thông qua mã `wardCode` truyền lên, giúp nâng cao độ chính xác khi Geocoding và tính cước thực tế tại Việt Nam.

---

## III. CHI TIẾT ĐÁNH GIÁ TIẾN ĐỘ THÀNH VIÊN 2 (FRONTEND WEB DEVELOPER)

### 1. Kết quả đạt được trong Tuần 1 & Tuần 2
*   **Landing Page & Tra cứu (Tuần 1):**
    *   Thiết kế giao diện Landing Page hiện đại bằng React + Vite + TailwindCSS.
    *   Tích hợp bản đồ Leaflet & MapLibre GL vẽ lộ trình di chuyển và dòng thời gian (timeline) trạng thái chi tiết của gói hàng.
    *   Developer Dashboard giả lập hiển thị phân quyền RBAC.
*   **Bộ tính phí nhanh (Tuần 2):**
    *   Phát triển component `PricingCalculator.tsx` trên Landing Page với thiết kế Glassmorphism sang trọng.
    *   Cho phép khách vãng lai ước tính phí vận chuyển nhanh dựa trên các tùy chọn khoảng cách, trọng lượng, gói dịch vụ và phụ phí đặc biệt, đồng bộ thuật toán tính toán với Backend.
*   **Auth & Phân quyền Client-side (Tuần 2):**
    *   Kết nối Form Đăng nhập/Đăng ký với API thật từ Backend, lưu trữ JWT Token vào LocalStorage và xử lý Token Key Mismatch đồng bộ.
    *   Cài đặt **Route Guards** bảo vệ các trang dashboard quản lý, phân phối quyền hiển thị menu và các tab điều khiển dựa trên vai trò tài khoản (`user.permissions`).
*   **Bảng điều khiển Quản trị Admin Dashboard (Tuần 2):**
    *   Xây dựng giao diện Sidebar và chuyển đổi Tabs linh hoạt cho Staff/Admin.
    *   **Tab Đơn hàng (Order):** Hiển thị danh sách đơn hàng toàn cục (lọc/phân trang), chi tiết thông tin đơn (gồm Address Snapshot), timeline trạng thái thực tế và cập nhật trạng thái đơn (chỉ dành cho Staff/Admin).
    *   **Tab Khách hàng (Customer):** Giao diện quản lý danh sách khách hàng, thông tin chi tiết và quản lý Sổ địa chỉ động (CRUD).
    *   **Tab Kho bãi (Facility):** Hiển thị mạng lưới bưu cục phân cấp, quản lý CRUD bưu cục và Cargo Zones của từng kho.

### 2. Điểm nổi bật & Cải tiến (Positive Enhancements)
*   **Refactor Modular Code (Clean Architecture):** Ở cuối tuần 2, Thành viên 2 đã tiến hành tái cấu trúc mã nguồn. Tránh việc dồn toàn bộ UI logic vào `CustomerTab.tsx` và `FacilityTab.tsx`, các file này đã được phân rã thành các sub-components chuyên biệt đặt trong thư mục `customer/` và `facility/` (ví dụ: `CustomerTable.tsx`, `CustomerModal.tsx`, `AddressModal.tsx`, `FacilityTable.tsx`, `CargoZoneModal.tsx`...). Điều này giúp mã nguồn vô cùng sạch sẽ, dễ bảo trì và dễ dàng phát triển mở rộng ở tuần 3 & 4.

---

## IV. BẢNG ĐỐI CHIẾU MỨC ĐỘ BÁM SÁT THIẾT KẾ GỐC

| Tiêu chuẩn / Yêu cầu gốc | Thực tế triển khai trong Code | Đánh giá sự phù hợp |
| :--- | :--- | :---: |
| **Tech Stack gốc** | Backend: Node + Express + TS + Prisma + Postgres + Redis.<br>Frontend: React + Vite + TailwindCSS.<br>Mobile: Flutter. | **Khớp 100%** |
| **Mô hình Dữ liệu**<br>(38 bảng tại `phase 1.md`) | Đã migrate đầy đủ 38 bảng với đầy đủ quan hệ (1-n, n-n) và ràng buộc toàn vẹn. | **Khớp 100%** (Có cải tiến thêm địa chính VN) |
| **Hệ thống Vai trò (RBAC)** | Phân quyền 4 nhóm: Admin, Staff, Customer, Shipper. Backend check JWT và permissions; Frontend dùng Route Guards ẩn/hiện menu. | **Khớp 100%** |
| **Tọa độ GPS độc lập** | Lưu trữ độc lập `latitude` và `longitude` kiểu Float trong DB, trả về dạng `[Longitude, Latitude]` cho Frontend. | **Khớp 100%** |
| **Tính phí tự động** | Base fare + Surcharge khoảng cách vượt hạn + Surcharge cân nặng vượt hạn + COD/Insurance + Fragile. | **Khớp 100%** |
| **Snapshot thông tin đơn** | Lưu cứng text địa chỉ, tên, điện thoại gửi/nhận tại thời điểm tạo vào dòng bản ghi `Order` để không bị ảnh hưởng bởi cập nhật sau này. | **Khớp 100%** |
| **Cấu trúc Facility cây** | Trường `parentFacilityId` tự tham chiếu trong bảng `Facility` để quản lý Hub/Micro Hub đệ quy. | **Khớp 100%** |

---

## V. ĐÁNH GIÁ CHÊNH LỆCH VÀ RỦI RO (GAP & RISK ANALYSIS)

### 1. Phân tích các Gaps (Chênh lệch)
Hiện tại **không có chênh lệch tiêu cực** làm thay đổi hướng đi của đồ án. Một số thay đổi nhỏ đều là những cải tiến tốt cho hệ thống:
1.  **Hệ thống Geocoding:** Mặc dù ý tưởng đề xuất dùng Google Maps Geocoding API, backend hiện đang sử dụng **Nominatim (OpenStreetMap)** cùng cơ chế mock fallback. Sự điều chỉnh này giúp tiết kiệm chi phí API Key và hoạt động độc lập tốt trong quá trình phát triển (vẫn đảm bảo tính năng đổi địa chỉ sang tọa độ GPS).
2.  **Chuẩn hóa địa chính Việt Nam:** Bổ sung các bảng phân cấp hành chính (Tỉnh, Huyện, Xã) vào Database giúp tối ưu hóa nghiệp vụ điền thông tin địa chỉ tại Việt Nam, giảm thiểu sai sót do người dùng nhập tay tự do.

### 2. Các điểm cần chú ý cho chặng đường tiếp theo (Tuần 3 & Tuần 4)
*   **Real-time Tracking & Socket.io:** Hệ thống Socket.io đã được khởi tạo ở Tuần 1 nhưng chưa được tích hợp sâu vào giao diện Admin. Theo kế hoạch, tính năng này sẽ bùng nổ ở Tuần 3 khi kết nối trực tiếp với Driver Mobile App gửi tọa độ GPS chạy ngầm (Background Location 3-5s/lần) và hiển thị Live GPS trên bản đồ của Admin.
*   **Thuật toán AI Định Tuyến (VRP Solver - GA/ACO):** Đây là "bộ não" của đề tài (giải quyết CVRP và VRPTW). Các tham số toán học cấu hình đã được thiết kế sẵn ở bảng `SystemSettings`. Tuần 4 sẽ là thời điểm quan trọng để Thành viên 1 phát triển lõi giải thuật này và Thành viên 2 tích hợp nút bấm "Kích hoạt định tuyến tự động" trên Web Admin.

---

## VI. KHUYẾN NGHỊ CHO TUẦN KẾ TIẾP (WEEK 3 SPRINT)

Để đảm bảo duy trì tiến độ hoàn hảo hiện tại, các thành viên nên phối hợp thực hiện các đầu việc Tuần 3:
1.  **Thành viên 1 (Backend):** 
    *   Phát triển các APIs thuộc Module 5 (`Shipments`, `ShipmentPackages`) để gom nhiều kiện hàng của các đơn khác nhau vào một chuyến giao vận.
    *   Xây dựng APIs Module 6 & 7 quản lý Đội xe, gán tài xế và thiết lập Tuyến đường thủ công (`Route` và các điểm dừng `RouteStops`).
    *   Hiện thực hóa các Socket.io Rooms để sẵn sàng truyền nhận tọa độ tài xế.
2.  **Thành viên 2 (Frontend):**
    *   Phát triển giao diện quản lý Đội xe, Hồ sơ tài xế và gán xe trên Web Admin.
    *   Xây dựng màn hình lập tuyến chạy thủ công (Kéo thả hoặc chọn các Shipment để tạo tuyến đường, sắp xếp thứ tự điểm dừng).
    *   Tích hợp Leaflet Map hiển thị vị trí thời gian thực của các tài xế (đồng bộ qua Socket.io).
3.  **Thành viên 3 (Mobile - Tham khảo):**
    *   Tích hợp Background Location định vị GPS gửi về server và kết nối các nghiệp vụ tài xế thực địa (quét barcode, chụp ảnh POD ký nhận).

**Kết luận:** Dự án **Smart Logistics Platform** đang có tiến độ phát triển cực kỳ lành mạnh, chất lượng mã nguồn tốt, bám sát thiết kế và định hướng đề tài. Bạn hoàn toàn có thể yên tâm về kết quả của Week 1 và Week 2.
