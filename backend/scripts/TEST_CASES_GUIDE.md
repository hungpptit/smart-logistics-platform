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
