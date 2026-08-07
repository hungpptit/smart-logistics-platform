# 📊 BÁO CÁO DỮ LIỆU SEED TEST AI PHÂN CỤM & VẬN HÀNH CHẶNG CUỐI (TP. THỦ ĐỨC)

> **Mật khẩu dùng chung cho tất cả tài khoản test**: `SlpTest@2026`

---

## 🏢 1. Danh Sách 4 Bưu Cục Chặng Đầu / Chặng Cuối - TP. Thủ Đức

| Mã Bưu cục | Tên Bưu cục | Địa chỉ Thực tế | Vai trò trong Đơn Test | Số Staff | Số Shipper |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `FAC-TD-DANGBI` | **Bưu cục Đặng Văn Bi** | 180 Đặng Văn Bi, Phường Bình Thọ, TP. Thủ Đức | **Bưu cục Nhận Chặng cuối** (Tập kết 50 đơn sẵn sàng AI Routing) | 2 Staff | **3 Shipper** |
| `FAC-TD-LINHTRUNG` | **Bưu cục Linh Trung** | 250 Đường Linh Trung, Phường Linh Trung, TP. Thủ Đức | Kho xuất phát gửi (Cust 1 & 2) | 1 Staff (`stf_linhtrung_1`) | **2 Shipper** |
| `FAC-TD-PHUOCLONG` | **Bưu cục Phước Long** | 85 Đỗ Xuân Hợp, Phường Phước Long B, TP. Thủ Đức | Kho xuất phát gửi (Cust 3 & 4) | 1 Staff (`stf_phuoclong_1`) | **2 Shipper** |
| `FAC-TD-ANPHU` | **Bưu cục An Phú (Kho xa)** | 25 Song Hành, Phường An Phú, TP. Thủ Đức | Kho xuất phát gửi xa (Cust 5) | - | - |
| `FAC-000050` | **Bưu Cục Xuân Sơn** | UBND xã Xuân Sơn, Xã Xuân Sơn, Châu Đức, Bà Rịa - Vũng Tàu | Kho nhận chặng cuối (Giao khu vực Châu Đức / BR-VT) | - | - |

---

## 🚚 2. Luồng Nghiệp Vụ 50 Đơn Hàng Test AI Routing

1. **Hình thức gửi (`pickupType`)**: **`PICKUP`** (Shipper đến lấy hàng tận nơi tại Shop/Địa chỉ Khách hàng).
2. **Kho gửi xuất phát (`originFacilityId`)**: Các Bưu cục khởi tạo (`Bưu cục Linh Trung`, `Bưu cục Phước Long`, `Bưu cục An Phú`).
3. **Kho nhận chặng cuối (`destinationFacilityId`)**: **`Bưu cục Đặng Văn Bi`** (`FAC-TD-DANGBI`).
4. **Trạng thái Đơn hàng & Kiện hàng**: **`AT_HUB` / `ARRIVED_DESTINATION`** (Toàn bộ 50 kiện hàng đã được trung chuyển về nằm sẵn trong Kho Bưu cục Đặng Văn Bi để 3 Shipper xe máy của bưu cục Đặng Văn Bi nhận nhiệm vụ **chạy AI phân cụm lộ trình phát chặng cuối**).

---

## 👤 3. Danh Sách 4 Tài Khoản Nhân Viên Kho (`WAREHOUSE_STAFF`)

| Username | Mật khẩu | Họ và Tên | Mã NV | Bưu cục Công tác |
| :--- | :--- | :--- | :--- | :--- |
| `stf_dangvanbi_1` | `SlpTest@2026` | Trần Văn Khoa (Thủ kho 1) | `STF-TD-01` | Bưu cục Đặng Văn Bi |
| `stf_dangvanbi_2` | `SlpTest@2026` | Lê Thị Xuân (Kiểm kho 2) | `STF-TD-02` | Bưu cục Đặng Văn Bi |
| `stf_linhtrung_1` | `SlpTest@2026` | Phạm Văn Bình (Thủ kho) | `STF-TD-03` | Bưu cục Linh Trung |
| `stf_phuoclong_1` | `SlpTest@2026` | Nguyễn Văn Minh (Thủ kho) | `STF-TD-04` | Bưu cục Phước Long |

---

## 🛵 4. Danh Sách 7 Tài Xế / Shipper & Xe Máy (`DRIVER`)

| Username | Mật khẩu | Họ và Tên | Mã Tài Xế | Biển Số Xe Máy | Bưu cục Quản Lý | Tọa độ Ưu tiên (Lat, Lng) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `shp_dangvanbi_1` | `SlpTest@2026` | Nguyễn Văn Hùng | `DRV-TD-01` | `59-X1 111.01` | Bưu cục Đặng Văn Bi | `10.8490, 106.7620` |
| `shp_dangvanbi_2` | `SlpTest@2026` | Trần Quốc Bảo | `DRV-TD-02` | `59-X1 111.02` | Bưu cục Đặng Văn Bi | `10.8480, 106.7640` |
| `shp_dangvanbi_3` | `SlpTest@2026` | Phạm Hoàng Nam | `DRV-TD-03` | `59-X1 111.03` | Bưu cục Đặng Văn Bi | `10.8510, 106.7610` |
| `shp_linhtrung_1` | `SlpTest@2026` | Lê Văn Đức | `DRV-TD-04` | `59-X1 111.04` | Bưu cục Linh Trung | `10.8570, 106.7740` |
| `shp_linhtrung_2` | `SlpTest@2026` | Vũ Văn Khải | `DRV-TD-05` | `59-X1 111.05` | Bưu cục Linh Trung | `10.8590, 106.7760` |
| `shp_phuoclong_1` | `SlpTest@2026` | Bùi Thanh Tùng | `DRV-TD-06` | `59-X1 111.06` | Bưu cục Phước Long | `10.8240, 106.7590` |
| `shp_phuoclong_2` | `SlpTest@2026` | Đặng Quang Huy | `DRV-TD-07` | `59-X1 111.07` | Bưu cục Phước Long | `10.8260, 106.7610` |

---

## 🛍️ 5. Danh Sách 5 Khách Hàng Gửi Hàng (`CUSTOMER`)

| Username | Mật khẩu | Tên Khách hàng / Shop | Bưu cục Gửi Chặng Đầu | Địa chỉ Lấy Hàng Tận Nơi (`PICKUP`) |
| :--- | :--- | :--- | :--- | :--- |
| `cust_thuduc_1` | `SlpTest@2026` | Bách Hóa Xanh Linh Trung | Bưu cục Linh Trung | 120 Đường Linh Trung, Phường Linh Trung |
| `cust_thuduc_2` | `SlpTest@2026` | Shop Thời Trang Võ Văn Ngân | Bưu cục Linh Trung | 50 Võ Văn Ngân, Phường Linh Chiểu |
| `cust_thuduc_3` | `SlpTest@2026` | Cửa Hàng Điện Tử Phước Long | Bưu cục Phước Long | 42 Đỗ Xuân Hợp, Phường Phước Long B |
| `cust_thuduc_4` | `SlpTest@2026` | Nhà Sách Giáo Dục Tây Hòa | Bưu cục Phước Long | 18 Tây Hòa, Phường Phước Long A |
| `cust_thuduc_5` | `SlpTest@2026` | Nông Sản Sạch An Phú (Kho xa) | Bưu cục An Phú | 15 Song Hành, Phường An Phú |

---

## 🚛 6. Danh Sách Tài Khoản & Phương Tiện Trung Chuyển Liên Kho (Linehaul Heavy Trucks & Hub Staff)

> **Mật khẩu dùng chung cho tất cả tài khoản test**: `SlpTest@2026`

### 🏢 6.1. Nhân Viên Kho Trung Chuyển Tỉnh & Mega Sorter (`WAREHOUSE_STAFF`)

| Username | Mật khẩu | Họ và Tên | Mã NV | Kho / Bưu Cục Công Tác |
| :--- | :--- | :--- | :--- | :--- |
| `stf_sorter_south_1` | `SlpTest@2026` | Trần Văn Thắng | `STF-HUB-01` | **Tổng Kho Miền Nam (Sorting Center Q.12)** |
| `stf_hub_hcm_1` | `SlpTest@2026` | Đặng Hoàng Lâm | `STF-HUB-02` | **Kho Tổng TP. Hồ Chí Minh (Provincial Hub Tân Bình)** |
| `stf_hub_brvt_1` | `SlpTest@2026` | Vũ Đức Anh | `STF-HUB-03` | **Bưu Cục Xuân Sơn (Kho Tỉnh Bà Rịa - Vũng Tàu)** |

### 🚛 6.2. Tài Xế Xe Tải Trung Chuyển Đường Dài (`LINEHAUL_TRANSFER` Driver & Heavy Trucks)

| Username | Mật khẩu | Họ và Tên Tài Xế | Mã Tài Xế | Biển Số Xe Tải | Tải Trọng Max | Kho Quản Lý | Bằng Lái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `drv_linehaul_hcm` | `SlpTest@2026` | Phạm Quốc Hùng | `DRV-LH-01` | **`50H-888.01`** | **15 Tấn** | Kho Tổng TP. Hồ Chí Minh (Tân Bình) | Bằng C |
| `drv_linehaul_dongnai` | `SlpTest@2026` | Nguyễn Tấn Đạt | `DRV-LH-02` | **`60C-999.02`** | **10 Tấn** | Tổng Kho Miền Nam (Q.12) | Bằng C |
| `drv_linehaul_brvt` | `SlpTest@2026` | Trần Hoàng Nam | `DRV-LH-03` | **`72C-777.03`** | **8 Tấn** | Bưu Cục Xuân Sơn (BR-VT) | Bằng C |

---

## 🧹 7. Lệnh Dọn Dẹp Dữ Liệu Test (Clear Data) Khi Cần

```bash
cd backend
npx tsx prisma/clear_test_data.ts
```

