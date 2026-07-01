# 🚚 Smart Logistics Platform (SLP)

> Hệ thống Quản lý Vận tải & Tối ưu Lộ trình thời gian thực (Real-time Vehicle Routing Problem & Telemetry Engine).

Smart Logistics Platform (SLP) là giải pháp Enterprise-grade hỗ trợ số hóa toàn diện quy trình logistics từ khâu nhận đơn, xử lý kho bãi, gom cụm đơn hàng, tối ưu tuyến đường di chuyển (AI Routing) và theo dõi hành trình thời gian thực của tài xế thông qua thiết bị định vị/Mobile App.

---

## 🏗️ Kiến Trúc Hệ Thống (Tech Stack)

| Phân hệ | Công nghệ sử dụng | Vai trò |
| :--- | :--- | :--- |
| **Backend Core** | Node.js (TypeScript) + Express.js | API Gateway, Quản lý Nghiệp vụ & Điều phối |
| **Database** | PostgreSQL 15 + PostGIS Extension | Lưu trữ dữ liệu quan hệ và tính toán hình học bản đồ (Geospatial) |
| **Realtime Telemetry** | Redis 7 + Socket.io | Lưu cache GPS tần suất cao, đồng bộ realtime vị trí tài xế |
| **ORM Layer** | Prisma ORM (Schema-Driven) | Type-safe Database Mapping & Migration |
| **AI Routing Engine** | OR-Tools / Genetic Algorithm | Giải bài toán tối ưu hóa tuyến đường nhiều điểm đỗ (VRP) |

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
smart-logistics-platform/
├── backend/                  # Mã nguồn Backend API Service (Express + TypeScript)
│   ├── prisma/               # Cấu hình Prisma (Schema & Seeding)
│   │   ├── migrations/       # Nhật ký lịch sử thay đổi Database Schema
│   │   ├── schema.prisma     # File schema tối hậu chứa 38 bảng dữ liệu
│   │   └── seed.ts           # Script nạp dữ liệu Master/Lookup ban đầu
│   ├── src/                  # Mã nguồn TypeScript chính
│   │   ├── controllers/      # Bộ tiếp nhận request và trả response
│   │   ├── services/         # Tầng xử lý logic nghiệp vụ chính
│   │   ├── index.ts          # Điểm khởi chạy server (Express + Socket.io)
│   │   └── ...
│   ├── package.json          # Quản lý dependencies & scripts chạy dự án
│   └── tsconfig.json         # Cấu hình trình biên dịch TypeScript
├── Design DB/                # Tài liệu thiết kế chi tiết 9 Module Database
├── docker-compose.yml        # Orchestration file cho Postgres (PostGIS) & Redis
├── setup.md                  # Tài liệu kiến trúc và tech stack tối hậu
└── README.md                 # Hướng dẫn cài đặt và vận hành này
```

---

## ⚡ Hướng Dẫn Cài Đặt & Chạy Dự Án (Quick Start)

### 📌 Yêu cầu hệ thống tối thiểu:
* **Docker Desktop** (Đã bật và đang chạy)
* **Node.js** (Phiên bản `>= 18.x` hoặc `>= 20.x`)
* **NPM** (Đi kèm Node.js)

---

### Bước 1: Khởi động Hạ tầng Container (Postgres + Redis)

Dự án sử dụng Docker Compose để quản lý cơ sở dữ liệu Postgres (tích hợp PostGIS) và bộ nhớ đệm Redis nhằm đơn giản hóa cài đặt môi trường.

1. Mở Terminal tại thư mục gốc của dự án (`smart-logistics-platform/`).
2. Chạy lệnh dựng container chạy ngầm:
   ```bash
   docker compose up -d
   ```
3. Kiểm tra xem các container đã chạy thành công chưa:
   ```bash
   docker compose ps
   ```
   *Bạn sẽ thấy hai container `slp-postgres` (port `5432`) và `slp-redis` (port `6379`) ở trạng thái Up.*

---

### Bước 2: Cấu hình Môi trường Backend

1. Di chuyển vào thư mục `backend/`:
   ```bash
   cd backend
   ```
2. Copy file cấu hình môi trường mẫu:
   ```bash
   cp .env.example .env
   ```
3. Mở file `.env` vừa tạo và chỉnh sửa các thông số kết nối (đã được cấu hình khớp mặc định với Docker Compose):
   ```env
   # Kết nối Postgres
   DATABASE_URL="postgresql://postgres:admin_password@localhost:5432/smart_logistics_db?schema=public"

   # Kết nối Redis
   REDIS_HOST="localhost"
   REDIS_PORT=6379
   REDIS_PASSWORD="redis_password"
   ```

---

### Bước 3: Cài đặt Dependencies & Khởi Tạo Database

Vẫn ở trong thư mục `backend/`, thực hiện tuần tự các lệnh sau:

1. Cài đặt toàn bộ thư viện cần thiết:
   ```bash
   npm install
   ```
2. Đồng bộ hóa Schema và tạo các bảng trong PostgreSQL:
   ```bash
   npx prisma db push
   ```
   *(Hoặc chạy `npx prisma migrate dev --name init` nếu muốn lưu vết phiên bản migration mới).*
3. Nạp dữ liệu cấu hình mặc định (Master/Lookup Data):
   ```bash
   npx prisma db seed
   ```
   *Lệnh này sẽ tự động nạp các dữ liệu mặc định như: Quyền hạn, Loại xe, Gói cước vận chuyển, Loại kho bãi, và các tham số siêu cấu hình cho thuật toán AI.*

---

### Bước 4: Khởi chạy Server Backend

Khởi chạy server ở chế độ phát triển (Development Mode) tự động reload khi thay đổi code:

```bash
npm run dev
```

* Server API sẽ chạy tại: `http://localhost:3000`
* Server Realtime Socket.io cũng được tích hợp sẵn trên cùng cổng `3000`.

---

### 🔍 Bước 5: Xem & Quản Lý Dữ Liệu Trực Quan (Prisma Studio)

Để duyệt nhanh cơ sở dữ liệu, kiểm tra các bảng và thay đổi dữ liệu mà không cần phần mềm quản trị (DBeaver, pgAdmin):

1. Trong thư mục `backend/`, khởi chạy Prisma Studio:
   ```bash
   npx prisma studio
   ```
2. Mở trình duyệt và truy cập: **`http://localhost:5555`**

---

### 🔄 Hướng dẫn vận hành hàng ngày (Daily Run Guide)

Từ những lần chạy sau, bạn không cần cấu hình lại từ đầu mà chỉ cần bật/tắt nhanh bằng các lệnh sau:

1. **Khởi động nhanh Database & Redis (Docker)**:
   ```bash
   docker compose start
   ```
   *(Cuối ngày khi nghỉ làm việc, tắt các container bằng lệnh `docker compose stop` để giải phóng RAM mà vẫn giữ nguyên dữ liệu).*

2. **Khởi động Backend**:
   ```bash
   cd backend
   npm run dev
   ```

> [!NOTE]
> Bạn chỉ cần chạy lại `npm install` hoặc `npx prisma db push` khi kéo code mới từ Git về (git pull) có cập nhật thư viện mới hoặc sửa đổi cấu trúc bảng.

---

## 🗄️ Danh sách 9 Module Database đã cấu hình

Hệ thống đã được thiết kế hoàn tất với cấu trúc 38 bảng liên kết chặt chẽ:
1. **Module 1: Authentication & Authorization** (Quản lý User, Roles, Permissions chuẩn RBAC).
2. **Module 2: Customers & Addresses** (Thông tin khách hàng B2C/B2B và Sổ địa chỉ chuẩn hóa).
3. **Module 3: Facility Network** (Mạng lưới tổng kho, kho khu vực, trạm giao nhận và phân khu kho).
4. **Module 4: Orders & Services** (Đơn hàng, gói cước dịch vụ và kiện hàng nhỏ lẻ).
5. **Module 5: Shipment Management** (Vận đơn chặng giữa, kiểm soát xuất nhập kho chặng).
6. **Module 6: Fleet & Driver Management** (Tài xế, đội xe, tải trọng xe và GPS thời gian thực).
7. **Module 7: Routing & Dispatch Engine** (Tuyến giao hàng tối ưu, thứ tự điểm dừng và log di chuyển của xe).
8. **Module 8: Tracking, Scan & POD** (Bằng chứng giao hàng POD: ảnh chụp, chữ ký, OTP; nhật ký quét barcode kiểm kho).
9. **Module 9: System Configuration** (Cấu hình tham số AI & nghiệp vụ động, không hard-code).

---

## 💡 Lưu ý cho Lập Trình Viên (Developer Rules)

1. **Thay đổi cấu trúc bảng**: 
   Nếu cần sửa đổi trường thông tin hoặc thêm bảng mới, hãy sửa file [schema.prisma](file:///d:/smart-logistics-platform/backend/prisma/schema.prisma) sau đó chạy lệnh dưới đây để tạo file migration mới:
   ```bash
   npx prisma migrate dev --name <ten_migration_goi_nho>
   ```
2. **Seeding dữ liệu thử nghiệm**:
   Bất kỳ dữ liệu danh mục tĩnh nào cần có sẵn khi chạy hệ thống mới, hãy bổ sung vào file [seed.ts](file:///d:/smart-logistics-platform/backend/prisma/seed.ts) để đồng bộ cho toàn bộ đội ngũ phát triển.
3. **Mã hóa tọa độ**:
   Cột tọa độ địa lý `latitude` và `longitude` trên bảng `addresses` luôn yêu cầu độ chính xác kiểu số thực (`Float` / `Double Precision`) để đảm bảo thuật toán AI Routing và Google Maps hoạt động chính xác.

---

Chúc nhóm **Hưng, Kiều và Quý** xây dựng đồ án thành công xuất sắc! 🚀
