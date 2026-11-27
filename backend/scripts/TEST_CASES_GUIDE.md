# Hướng dẫn Test Từng Kịch Bản Quy Trình Giao Nhận Hàng

> **Thư mục chạy lệnh**: `d:\smart-logistics-platform\backend`
>
> **Lưu ý chung**:
> - Hệ thống đăng nhập qua **`username`** (xác thực tại `src/services/auth.service.ts`), không dùng email ở trường `username`.
> - Mật khẩu mặc định của bộ tài khoản test khu vực Thủ Đức (seed từ `prisma/seed_thuduc_test_data.ts`): `SlpTest@2026`.
> - Trên **Windows PowerShell 5.1**, dùng `;` hoặc `; if ($?) { ... }` thay cho `&&`.

---

## Case 1: Cùng Phường/Xã (Nội bộ Bưu cục Tăng Nhơn Phú)

Quy trình: `Người gửi (P. Tăng Nhơn Phú)` ➔ `Bưu cục Cấp 3 (FAC-TD-TANGNHONPHU)` ➔ `Người nhận (P. Tăng Nhơn Phú)`

### 1. Script Clear trước & Nạp data Case 1

```powershell
cd d:\smart-logistics-platform\backend
npm run db:clean; if ($?) { npm run db:seed-case1 }
```

*(Hoặc chạy từng dòng: `npm run db:clean` rồi `npm run db:seed-case1`.)*

- **Script clear**: `prisma/reset_all_test_data.ts`
- **Script nạp**: `scripts/seed_case1_test_orders.ts`
- **Dữ liệu tạo ra**:
  - Đơn hàng: `ORD-CASE1-0001` (`READY_FOR_PICKUP`, `PICKUP`, `COD 250.000đ`, phí ship `18.000đ`, phí bảo hiểm `2.000đ`, người gửi trả phí `SENDER`)
  - Kiện hàng: `ORD-CASE1-0001-PKG-01` (`0.5 kg`)
  - Bưu cục nguồn & đích: `FAC-TD-TANGNHONPHU` (*Bưu cục Tăng Nhơn Phú - TP. Thủ Đức*)
  - Địa chỉ lấy: `29 Đường Lê Văn Việt, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh` (*Kho 1*)
  - Địa chỉ giao: `120 Man Thiện, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh` (Người nhận: *Nguyễn Thị Thu Hà* - `0912345678`)

### 2. Danh sách tài khoản dùng để test Case 1

#### Nhân viên kho phụ trách đơn hàng (`FAC-TD-TANGNHONPHU`)
- **`username`**: `stf_tangnhonphu_1` | **Mật khẩu**: `SlpTest@2026`
- Thông tin hồ sơ: `STF-TD-05` — *Vũ Văn Hoàng (Kho Tăng Nhơn Phú)* | Vai trò: `STAFF` (`WAREHOUSE_STAFF`) | SĐT: `0901000005` | Email: `StaffTangNhonPhu@gmail.com`
- *(Tài khoản tổng không gắn kho riêng nếu cần xem toàn hệ thống từ `prisma/seed.ts`: `admin` / `AdminPassword123`, `staff` / `StaffPassword123`)*

#### Khách hàng đặt đơn (`ORD-CASE1-0001`)
- **`username`**: `cust_thuduc_1` | **Mật khẩu**: `SlpTest@2026`
- Thông tin hồ sơ: `CUST-TD-01` — *Bách Hóa Xanh Linh Trung* | SĐT: `0903000001` | Email: `cust_thuduc_1@gmail.com`

#### Shipper của Bưu cục Tăng Nhơn Phú (`HUB_DELIVERY`)
- **Shipper 1**:
  - **`username`**: `shp_tangnhonphu_1` | **Mật khẩu**: `SlpTest@2026`
  - Hồ sơ: `DRV-TD-08` — *Đỗ Văn Nam* | Xe: `59-X1 111.08` (`VEH-DRV-TD-08`) | SĐT: `0902000008`
- **Shipper 2**:
  - **`username`**: `shp_tangnhonphu_2` | **Mật khẩu**: `SlpTest@2026`
  - Hồ sơ: `DRV-TD-09` — *Trịnh Hoàng Long* | Xe: `59-X1 111.09` (`VEH-DRV-TD-09`) | SĐT: `0902000009`
- *Ghi chú chia tuyến (`src/services/routing/routing.service.ts`)*: Case 1 chỉ có 1 đơn nên khi chạy AI tối ưu chia tuyến sẽ gán cho 1 shipper `HUB_DELIVERY`, shipper còn lại giữ làm dự phòng (`TARGET_RESERVE_K = 1`). Tài khoản `Phong` (`DRV-000002`, loại `ON_DEMAND`) tại kho này sẽ bị loại khỏi batch chia tuyến bưu cục.

#### Tài xế trung chuyển (`LINEHAUL_TRANSFER`)
- **Không có / Không sử dụng** trong Case 1 vì điểm gửi và điểm nhận thuộc cùng Phường Tăng Nhơn Phú (`originFacilityId == destinationFacilityId == FAC-TD-TANGNHONPHU`), đơn xử lý trọn quy trình nội bộ tại Bưu cục cấp 3.

### 3. Lệnh Clear sau khi test xong Case 1

Clear sạch toàn bộ đơn hàng, kiện hàng, sọt, vận đơn, lộ trình để chuẩn bị test case tiếp theo:

```powershell
cd d:\smart-logistics-platform\backend
npm run db:clean
```

- *Nếu trong lúc test có phát sinh giao dịch thanh toán online (`payment_transactions` / `refund_transactions`) làm `npm run db:clean` vướng khóa ngoại `onDelete: Restrict`, chạy lệnh dọn 2 bảng giao dịch trước rồi clear*:

```powershell
npx tsx -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); (async()=>{ await p.refundTransaction.deleteMany({}); await p.paymentTransaction.deleteMany({}); })().finally(()=>p.$disconnect())"; npm run db:clean
```

- *Trường hợp chỉ muốn xóa các đơn phát sinh ngoài 5 đơn demo gốc*: `npm run db:clean-case1`

---

## Case 2: Khác Phường/Xã Cùng Tỉnh/TP (Tăng Nhơn Phú ➔ Kho Tổng TP.HCM ➔ Linh Trung)

Quy trình trung chuyển chuẩn 3 cấp (`3 - 2 - 3` tại `src/services/shipment.service.ts`):  
`Người gửi (3 điểm tại P. Tăng Nhơn Phú)` ➔ `Bưu cục Nguồn Cấp 3 (FAC-TD-TANGNHONPHU)` ➔ `Kho Tổng Tỉnh Cấp 2 (FAC-HUB-HCM)` ➔ `Bưu cục Đích Cấp 3 (FAC-TD-LINHTRUNG)` ➔ `Người nhận (10 điểm tại P. Linh Xuân)`

### 1. Script Clear trước & Nạp data Case 2

```powershell
cd d:\smart-logistics-platform\backend
npm run db:clean; if ($?) { npm run db:seed-case2 }
```

*(Hoặc chạy từng dòng: `npm run db:clean` rồi `npm run db:seed-case2`. Đảm bảo PostgreSQL đang chạy ở `localhost:5432`.)*

- **Script clear**: `prisma/reset_all_test_data.ts`
- **Script nạp**: `scripts/seed_case2_test_orders.ts`
- **Dữ liệu tạo ra (10 đơn hàng `READY_FOR_PICKUP`, `PICKUP`, `COD`, người gửi trả phí `SENDER`, bảo hiểm `3.000đ`/đơn)**:
  - **Bưu cục nguồn (`originFacility`)**: `FAC-TD-TANGNHONPHU` (*Bưu cục Tăng Nhơn Phú - TP. Thủ Đức*)
  - **Kho tổng trung gian**: `FAC-HUB-HCM` (*Kho Tổng TP. Hồ Chí Minh (Provincial Hub)* — `102 Trường Chinh, P. 12, Q. Tân Bình`)
  - **Bưu cục đích (`destinationFacility`)**: `FAC-TD-LINHTRUNG` (*Bưu cục Linh Trung - TP. Thủ Đức*)
  - **Nhóm 1 — Lấy tại `PTIT HCM 1` (`97 Man Thiện, Phường Tăng Nhơn Phú`)**:
    - `ORD-CASE2-0001` (`0.8 kg`, COD `350.000đ`, ship `22.000đ`) ➔ `120 Đường Linh Trung, P. Linh Xuân` (*Nguyễn Thị Mai Anh*)
    - `ORD-CASE2-0002` (`0.5 kg`, COD `450.000đ`, ship `22.000đ`) ➔ `45 Đường Lê Văn Chí, P. Linh Xuân` (*Trần Đình Trọng*)
    - `ORD-CASE2-0003` (`1.2 kg`, COD `620.000đ`, ship `28.000đ`) ➔ `78 Đường Hoàng Diệu 2, P. Linh Xuân` (*Lê Hoàng Nam*)
    - `ORD-CASE2-0004` (`0.6 kg`, COD `280.000đ`, ship `22.000đ`) ➔ `15 Đường Số 5, KP. 2, P. Linh Xuân` (*Phạm Ngọc Hân*)
  - **Nhóm 2 — Lấy tại `kho 2` (`số 185 Đình Phong Phú, Phường Tăng Nhơn Phú`)**:
    - `ORD-CASE2-0005` (`1.5 kg`, COD `890.000đ`, ship `32.000đ`) ➔ `210 Quốc Lộ 1K, P. Linh Xuân` (*Vũ Minh Tuấn*)
    - `ORD-CASE2-0006` (`3.5 kg`, COD `1.150.000đ`, ship `55.000đ`) ➔ `32 Đường Số 7, Linh Trung, P. Linh Xuân` (*Đặng Thu Trang*)
    - `ORD-CASE2-0007` (`2.2 kg`, COD `380.000đ`, ship `40.000đ`) ➔ `88 Đường Kha Vạn Cân, P. Linh Xuân` (*Hoàng Quốc Việt*)
  - **Nhóm 3 — Lấy tại `Kho 3` (`4 Đường D1, Phường Tăng Nhơn Phú`)**:
    - `ORD-CASE2-0008` (`1.1 kg`, COD `520.000đ`, ship `28.000đ`) ➔ `102 Đường Linh Trung, P. Linh Xuân` (*Bùi Thị Thu Thảo*)
    - `ORD-CASE2-0009` (`0.7 kg`, COD `490.000đ`, ship `22.000đ`) ➔ `15 Đường Võ Văn Ngân, P. Linh Xuân` (*Ngô Thành Đạt*)
    - `ORD-CASE2-0010` (`0.5 kg`, COD `230.000đ`, ship `22.000đ`) ➔ `60 Đường Chương Dương, P. Linh Xuân` (*Dương Kim Ngân*)

### 2. Danh sách tài khoản dùng để test Case 2

> Mật khẩu chung cho toàn bộ tài khoản khu vực Thủ Đức / HCM bên dưới: **`SlpTest@2026`** (đăng nhập bằng **`username`**).

#### Khách hàng đặt đơn (`ORD-CASE2-0001` .. `0010`)
- **`username`**: `cust_thuduc_1` (`CUST-TD-01` — *Bách Hóa Xanh Linh Trung*, SĐT `0903000001`)

#### Chặng 1 — Bưu cục Nguồn (`FAC-TD-TANGNHONPHU`)
- **Nhân viên kho nguồn**: `stf_tangnhonphu_1` (`STF-TD-05` — *Vũ Văn Hoàng (Kho Tăng Nhơn Phú)*)
- **Shipper lấy hàng (`HUB_DELIVERY`)**:
  - `shp_tangnhonphu_1` (`DRV-TD-08` — *Đỗ Văn Nam*, Xe `59-X1 111.08` / `VEH-DRV-TD-08`)
  - `shp_tangnhonphu_2` (`DRV-TD-09` — *Trịnh Hoàng Long*, Xe `59-X1 111.09` / `VEH-DRV-TD-09`)
  - *Ghi chú chia tuyến (`routing.service.ts`)*: với 10 đơn và `MAX_ORDERS_PER_BATCH_DRIVER = 25`, `TARGET_RESERVE_K = 1`, AI sẽ gán gom 10 đơn cho 1 tài xế batch và giữ 1 tài xế dự phòng.

#### Chặng 2 & 3 — Xe tải Trung chuyển Liên kho (`LINEHAUL_TRANSFER`) & Kho Tổng TP.HCM (`FAC-HUB-HCM`)
- **Nhân viên Kho Tổng TP.HCM (`FAC-HUB-HCM`)**:
  - `stf_hub_hcm_1` (`STF-HUB-02` — *Đặng Hoàng Lâm (Thủ kho Kho Tổng TP.HCM Tân Bình)*)
- **Tài xế xe tải trung chuyển (`LINEHAUL_TRANSFER`, gắn `FAC-HUB-HCM`)**:
  - `drv_linehaul_hcm` (`DRV-LH-01` — *Phạm Quốc Hùng*, Xe `50H-888.01` / `VEH-DRV-LH-01`)
  - `drv_linehaul_hcm_2` (`DRV-LH-04` — *Nguyễn Văn Minh*, Xe `50H-999.88` / `VEH-DRV-LH-04`)

#### Chặng 4 — Bưu cục Đích (`FAC-TD-LINHTRUNG`)
- **Nhân viên kho đích**: `stf_linhtrung_1` (`STF-TD-03` — *Phạm Văn Bình (Kho Linh Trung)*)
- **Shipper giao hàng (`HUB_DELIVERY`)**:
  - `shp_linhtrung_1` (`DRV-TD-04` — *Lê Văn Đức*, Xe `59-X1 111.04` / `VEH-DRV-TD-04`)
  - `shp_linhtrung_2` (`DRV-TD-05` — *Vũ Văn Khải*, Xe `59-X1 111.05` / `VEH-DRV-TD-05`)

*(Tài khoản tổng xem toàn hệ thống nếu cần: `admin` / `AdminPassword123`, `staff` / `StaffPassword123`.)*

### 3. Kịch bản thao tác chuẩn End-to-End cho Case 2

1. **Lấy hàng & Bàn giao về `FAC-TD-TANGNHONPHU`**:
   - Web (`stf_tangnhonphu_1`): vào AI Điều phối chia tuyến **`PICKUP`** tại Tăng Nhơn Phú ➔ gán chuyến `RT-...` cho Shipper (`shp_tangnhonphu_1` hoặc `shp_tangnhonphu_2`).
   - Mobile (Shipper lấy hàng): nhận tuyến `RT-...`, lấy đủ 10 đơn (`PICKED_UP`), mở **`HIỆN MÃ QR CHUYẾN`** (`RT-...`) khi về bưu cục.
   - Web (`stf_tangnhonphu_1` ➔ **Phân Loại Hàng Vào Zone Kho**): quét mã `RT-...` để mở bảng đối soát ➔ quét từng kiện `ORD-CASE2-0001`..`0010` ➔ hệ thống tự gợi ý **`ZONE-W-PROVINCE-DISPATCH`** (*Khu Xuất Hàng Đi Kho Tỉnh / TP*, sọt `TOTE-ZONE-W-PROVINCE-DISPATCH-001`) ➔ khi đủ `10/10`, chuyến `RT-...` tự động chốt `COMPLETED` và giải phóng Shipper.
2. **Trung chuyển Chặng 1 (`FAC-TD-TANGNHONPHU` ➔ `FAC-HUB-HCM`)**:
   - Mobile (`drv_linehaul_hcm` hoặc `drv_linehaul_hcm_2`): quét mã sọt `TOTE-ZONE-W-PROVINCE-DISPATCH-001` để bốc sọt lên xe (hệ thống tự gán điểm đến là `FAC-HUB-HCM`, tạo chuyến `SH-LH-...` / `RT-LH-...`).
   - Web (`stf_tangnhonphu_1` ➔ **Quét Kho** `ToteScanTab` ➔ tab **`Xuất Kho Trung Chuyển (In Transit)`**): quét mã `SH-...` từ QR chuyến xe trên app tài xế để xác nhận xuất bến (`IN_TRANSIT`).
3. **Nhập Kho Tổng & Phân loại Nội tỉnh tại `FAC-HUB-HCM`**:
   - Web (`stf_hub_hcm_1` ➔ **Quét Kho** ➔ tab **`Nhập Kho Bưu Cục Phát / Kho Tỉnh (Destination Hub)`**): quét `SH-...` để tiếp nhận hàng vào Kho Tổng TP.HCM (`AT_HUB`). (Tài xế linehaul chốt hoàn thành chặng 1 nếu xong tuyến.)
   - Web (`stf_hub_hcm_1` ➔ **Phân Loại Hàng Vào Zone Kho**): quét từng kiện `ORD-CASE2-0001`..`0010` ➔ do cùng TP.HCM, hệ thống tự gợi ý **`ZONE-P-INTRA-PROVINCE`** (*Khu Phân Loại & Chia Tuyến Nội Tỉnh*, sọt `TOTE-ZONE-P-INTRA-PROVINCE-001`). *(Chuyến `PICKUP` đã chốt trước đó nên hàng trung chuyển quét thẳng bình thường, không cần `RT-...`.)*
4. **Trung chuyển Chặng 2 (`FAC-HUB-HCM` ➔ `FAC-TD-LINHTRUNG`)**:
   - Mobile (`drv_linehaul_hcm` hoặc `drv_linehaul_hcm_2`): quét nạp sọt `TOTE-ZONE-P-INTRA-PROVINCE-001` lên xe ➔ tuyến đi `FAC-TD-LINHTRUNG`.
   - Web (`stf_hub_hcm_1` ➔ **`Xuất Kho Trung Chuyển (In Transit)`**): quét `SH-...` xác nhận xuất kho (`IN_TRANSIT`).
   - Web (`stf_linhtrung_1` ➔ **`Nhập Kho Bưu Cục Phát / Kho Tỉnh (Destination Hub)`**): quét `SH-...` nhập hàng vào Bưu cục Linh Trung (`AT_HUB`). (Tài xế linehaul chốt hoàn thành chặng 2.)
5. **Giao hàng Chặng cuối (`FAC-TD-LINHTRUNG`)**:
   - Web (`stf_linhtrung_1`): chia tuyến giao hàng **`DELIVERY`** tại Bưu cục Linh Trung cho Shipper (`shp_linhtrung_1` hoặc `shp_linhtrung_2`).
   - Mobile (Shipper giao hàng): nhận tuyến giao 10 điểm tại P. Linh Xuân ➔ giao từng đơn (`DELIVERED`) ➔ bấm **`CHỐT HOÀN THÀNH CHUYẾN ĐI`**.

### 4. Lệnh Clear sau khi test xong Case 2

Clear sạch toàn bộ đơn hàng, kiện hàng, sọt, vận đơn, lộ trình để chuẩn bị test case tiếp theo:

```powershell
cd d:\smart-logistics-platform\backend
npm run db:clean
```

- *Nếu trong lúc test có phát sinh giao dịch thanh toán online (`payment_transactions` / `refund_transactions`) làm `npm run db:clean` vướng khóa ngoại `onDelete: Restrict`, chạy lệnh dọn 2 bảng giao dịch trước rồi clear*:

```powershell
npx tsx -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); (async()=>{ await p.refundTransaction.deleteMany({}); await p.paymentTransaction.deleteMany({}); })().finally(()=>p.$disconnect())"; npm run db:clean
```

- *Trường hợp chỉ muốn xóa các đơn phát sinh ngoài 5 đơn demo gốc*: `npm run db:clean-case2`
