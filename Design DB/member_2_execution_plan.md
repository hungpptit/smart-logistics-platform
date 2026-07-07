# KẾ HOẠCH TRIỂN KHAI CHI TIẾT CHO THÀNH VIÊN 2 - TUẦN 2 (FRONTEND WEB DEV)

Tài liệu này vạch ra lộ trình thực hiện từng bước (Step-by-step), danh sách các component cần tạo mới/chỉnh sửa và các hướng dẫn kỹ thuật chi tiết để Thành viên 2 hoàn thành 100% nhiệm vụ trong **Tuần 2**.

---

## 🎯 MỤC TIÊU CỐT LÕI
Hoàn thành 3 phân hệ chính phía Frontend Web:
1.  **Trang Web giới thiệu (Landing Page):** Bổ sung công cụ tính phí cước nhanh (Quick Pricing Calculator) bên cạnh chức năng tra cứu vận đơn thời gian thực.
2.  **Giao diện Auth & Phân quyền (RBAC/Route Guards):** Hoàn thiện luồng đăng nhập thực tế kết nối với API Backend, tự động lưu JWT token vào LocalStorage/Cookie, bảo vệ các trang quản lý.
3.  **Bảng điều khiển Quản trị (Web Admin Dashboard):** Giao diện dành riêng cho `ADMIN` và `STAFF` để quản trị:
    *   Danh sách đơn hàng toàn cục & cập nhật trạng thái đơn hàng.
    *   Danh sách & Chi tiết thông tin Khách hàng (Sổ địa chỉ).
    *   Danh sách & Tạo mới Kho bãi (Facilities), Phân khu lưu kho (Cargo Zones).

---

## 🛠️ CẤU TRÚC THƯ MỤC CẦN TRIỂN KHAI
Các file cần tạo mới (🆕) hoặc chỉnh sửa (✏️) trong thư mục `frontend/src/`:

```text
frontend/src/
├── components/
│   ├── ServicesGrid.tsx (✏️ - Đồng bộ thông tin dịch vụ)
│   └── PricingCalculator.tsx (🆕 - Bộ tính phí cước nhanh)
├── features/
│   ├── auth/
│   │   └── components/
│   │       └── AuthModal.tsx (✏️ - Kết nối API thực và xử lý phân vai)
│   ├── dashboard/
│   │   └── components/
│   │       ├── AdminDashboard.tsx (🆕 - Bảng điều khiển quản trị tổng)
│   │       ├── CustomerTab.tsx (🆕 - Quản lý Khách hàng & Sổ địa chỉ)
│   │       ├── FacilityTab.tsx (🆕 - Quản lý Kho bãi & Phân khu)
│   │       └── OrderTab.tsx (🆕 - Quản lý Đơn hàng & Cập nhật trạng thái)
│   └── tracking/
│       └── components/
│           └── MapcnMap.tsx (✏️ - Hỗ trợ hiển thị vị trí động)
└── App.tsx (✏️ - Tích hợp Router ảo / Phân phối Tab điều khiển chính)
```

---

## 📋 LỘ TRÌNH THỰC HIỆN TỪNG BƯỚC (STEP-BY-STEP PLAN)

### BƯỚC 1: BỘ TÍNH PHÍ NHANH (QUICK PRICING CALCULATOR) - [✅ HOÀN THÀNH 100%]
*   **Mục tiêu:** Cho phép khách hàng vãng lai ước tính phí vận chuyển ngay tại Landing Page.
*   **Yêu cầu kỹ thuật:**
    *   Tạo file `src/components/PricingCalculator.tsx`. (Hoàn thành - Thiết kế Glassmorphism sang trọng)
    *   Các tham số đầu vào: Khoảng cách (km), Trọng lượng (kg), Gói dịch vụ (`EXPRESS`, `STANDARD`, `SAVING`, `COLD_CHAIN`), Tùy chọn (Bảo hiểm hàng hóa, Khai giá trị COD, Hàng dễ vỡ). (Hoàn thành)
    *   Áp dụng đúng công thức tính phí từ Backend để hiển thị kết quả trực quan (từng loại phí chi tiết). (Hoàn thành)

### BƯỚC 2: KẾT NỐI API AUTH & PHÂN QUYỀN ĐỘNG (RBAC) - [✅ HOÀN THÀNH 100%]
*   **Mục tiêu:** Thay thế dữ liệu Auth Mock bằng API thật kết nối tới Backend.
*   **Yêu cầu kỹ thuật:**
    *   Cập nhật `AuthModal.tsx` để gửi request đăng nhập/đăng ký tới backend. (Hoàn thành)
    *   Khi đăng nhập thành công, lưu Token vào LocalStorage. (Hoàn thành - Đã sửa lỗi mismatch `accessToken` giúp đồng bộ chính xác token).
    *   Đọc thông tin profile và danh sách quyền hạn (permissions) hiển thị lên giao diện quản trị. (Hoàn thành)
    *   Bảo vệ dashboard bằng kiểm tra vai trò: chỉ `ADMIN`, `STAFF` hoặc `CUSTOMER` mới hiển thị các tab/nhiệm vụ tương ứng. (Hoàn thành)

### BƯỚC 3: XÂY DỰNG BẢNG ĐIỀU KHIỂN QUẢN TRỊ (ADMIN DASHBOARD) - [✅ HOÀN THÀNH 100%]
*   **Mục tiêu:** Cung cấp giao diện quản trị toàn diện cho nội bộ (Staff/Admin) và Khách hàng.
*   **Yêu cầu kỹ thuật:**
    *   Tạo file `src/features/dashboard/components/AdminDashboard.tsx` tích hợp Sidebar/Tabs linh hoạt. (Hoàn thành)
    *   **Tab Đơn hàng (Order Management):**
        *   Hiển thị danh sách toàn bộ đơn hàng trong hệ thống (phân trang/lọc trạng thái). (Hoàn thành)
        *   Chi tiết đơn hàng: Timeline trạng thái thực, thông tin Snapshot lúc tạo, bản đồ trực quan. (Hoàn thành)
        *   Chức năng cập nhật trạng thái đơn hàng (Dành cho `STAFF`/`ADMIN`). (Hoàn thành)
    *   **Tab Khách hàng (Customer Management):**
        *   Hiển thị danh sách khách hàng, phân loại Loại khách hàng (Individual/Business). (Hoàn thành - Tích hợp tại `CustomerTab.tsx`)
        *   Xem chi tiết thông tin và sổ địa chỉ đã lưu (gồm các địa chỉ có `wardCode` chuẩn hóa). (Hoàn thành - Có form CRUD địa chỉ và danh sách địa chỉ động)
    *   **Tab Kho bãi (Facility Management):**
        *   Hiển thị danh sách kho bãi (Tổng kho, Hub, Micro Hub). (Hoàn thành - Tích hợp tại `FacilityTab.tsx`)
        *   Tạo mới Kho bãi (có form nhập địa chỉ và tìm kiếm tọa độ/wardCode). (Hoàn thành - Có form thêm/sửa thông tin kho bãi và địa chỉ)
        *   Xem phân khu lưu kho (Cargo Zones) của từng kho bãi và thêm phân khu mới. (Hoàn thành - Quản lý CRUD Cargo Zones động)

---

## 💎 TIÊU CHUẨN THIẾT KẾ VÀ TRẢI NGHIỆM NGƯỜI DÙNG (UX/UI)
1.  **Về màu sắc & Typography:** Sử dụng các biến màu CSS từ `index.css` (primary `#ff3b30`, dark background `#0a0a0c`, glass card border `#ffffff0d`). font chữ Geist tối giản, sang trọng.
2.  **Hiệu ứng chuyển động (Micro-animations):** Hover effects trên các button, tabs chuyển mượt mà.
3.  **Tương thích Mobile (Responsive):** Màn hình Dashboard Admin tự co giãn tốt khi xem trên các thiết bị.

---

## 📝 BẢNG TỔNG HỢP TIẾN ĐỘ THÀNH VIÊN 2 (WEEK 2 SUMMARY)
| Phân hệ | File | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| Landing Page | `src/components/PricingCalculator.tsx` | Done | Tích hợp tính phí nhanh bằng công thức thực |
| Auth & RBAC | `src/context/AuthContext.tsx` | Done | Sửa lỗi key accessToken, bảo vệ routing |
| Admin - Orders | `src/features/dashboard/components/OrderTab.tsx` | Done | Bảng danh sách đơn hàng, xem chi tiết, update trạng thái |
| Admin - Customers | `src/features/dashboard/components/CustomerTab.tsx` | Done | Xem thông tin KH, quản lý Sổ địa chỉ (CRUD) |
| Admin - Facilities | `src/features/dashboard/components/FacilityTab.tsx` | Done | Xem mạng lưới kho bãi, quản lý Cargo Zones (CRUD) |
| Admin - Dashboard | `src/features/dashboard/components/AdminDashboard.tsx` | Done | Khung Sidebar chuyển Tab động, đo lường Metrics |

