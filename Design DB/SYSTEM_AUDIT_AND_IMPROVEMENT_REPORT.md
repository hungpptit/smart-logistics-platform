# 📋 BÁO CÁO THẨM ĐỊNH LỖI HỆ THỐNG & KẾ HOẠCH NÂNG CẤP
## SMART LOGISTICS PLATFORM (SLP)

* **Ngày lập báo cáo:** 08/08/2026  
* **Đối tượng thẩm định:** Mã nguồn Backend (`order.service.ts`, `shipment.service.ts`, `shipment.routes.ts`), Schema CSDL (`schema.prisma`) và Quy hoạch Mạng lưới Vận chuyển Trung chuyển (Linehaul Multi-Tier Logistics Network).  
* **Trạng thái thẩm định:** 🟢 **ĐÃ XÁC MINH CHÍNH XÁC 100% CẢ 4 VẤN ĐỀ**

---

## 🎯 EXECUTIVE SUMMARY (TÓM TẮT TỔNG QUAN)

Qua quá trình rà soát độc lập mã nguồn dự án và sơ đồ quy hoạch nghiệp vụ, Ban Kỹ thuật xác nhận **cả 4 nhận xét phản biện từ Người Kiểm Thử / Reviewer đều hoàn toàn CHÍNH XÁC và mang tính XÂY DỰNG CAO**.

Các vấn đề được chỉ ra xuất phát từ sự thiếu hụt hàm tự động phân loại vùng hàng (Smart Routing), thiếu Endpoint ghi nhận lịch sử bàn giao giữa 2 bưu cục (`ShipmentTransfer`), bỏ sót trường Kho đích (`destinationFacilityId`) khi tài xế nạp sọt lên xe tải, và chưa thể hiện chặng vận tải Container Liên Miền (Cấp 1 ➔ Cấp 1).

---

## 🔍 CHI TIẾT THẨM ĐỊNH 4 VẤN ĐỀ VÀ PHƯƠNG ÁN KHẮC PHỤC

### 📍 Vấn đề 1: Thiếu Smart Routing tự động trong `assignPackageToZone()`

* **Vị trí mã nguồn:** `backend/src/services/order.service.ts` (Hàm `assignPackageToZone()`, dòng 830 - 984).
* **Kết quả thẩm định:** 🔴 **XÁC NHẬN CHÍNH XÁC**
* **Phân tích hiện trạng:**
  - Hàm `assignPackageToZone()` hiện tại chỉ nhận trực tiếp `zoneId` được chọn thủ công từ giao diện truyền xuống để gán bưu kiện vào phân khu đó.
  - Mã nguồn chưa có thuật toán tự động so sánh `provinceCode` (Mã Tỉnh/Thành) địa chỉ lấy hàng và địa chỉ giao hàng với Bưu cục hiện tại để gợi ý phân loại:
    - **Hàng Nội Tỉnh:** Phân loại vào `ZONE-P-INBOUND` (Trung chuyển nội tỉnh).
    - **Hàng Liên Tỉnh:** Phân loại vào `ZONE-P-INTER-PROVINCE` (Trung chuyển đi kho tỉnh khác).
* **Phương án khắc phục:**
  - Viết bổ sung helper `calculateSmartZone()` trong `order.service.ts`.
  - Tự động tra cứu `provinceCode` nguồn/đích của bưu kiện để trả về mã Phân Khu gợi ý chuẩn xác 100% cho nhân viên kho.

---

### 📍 Vấn đề 2: Thiếu API `POST /shipments/transfer` (Luân chuyển Bưu cục)

* **Vị trí mã nguồn:** `backend/src/routes/shipment.routes.ts`, `shipment.controller.ts`, `shipment.service.ts`
* **Kết quả thẩm định:** 🔴 **XÁC NHẬN CHÍNH XÁC**
* **Phân tích hiện trạng:**
  - Trong Schema CSDL (`schema.prisma` dòng 641), bảng `ShipmentTransfer` đã được thiết kế đầy đủ các trường: `fromFacilityId`, `toFacilityId`, `senderUserId`, `receiverUserId`, `departedAt`, `arrivedAt`, `status`.
  - Tuy nhiên trong hệ thống API Backend hoàn toàn **chưa được viết Route, Controller hay Service** nào để ghi nhận nhật ký xuất kho bàn giao và nhập kho luân chuyển giữa 2 bưu cục.
* **Phương án khắc phục:**
  - Bổ sung Route `POST /shipments/transfer` để tạo phiếu bàn giao luân chuyển giữa Kho đi (`fromFacilityId`) và Kho đến (`toFacilityId`).
  - Bổ sung Route `POST /shipments/transfer/:id/receive` phục vụ Thủ kho bưu cục đích quét nhận kho bàn giao.

---

### 📍 Vấn đề 3: `loadToteIntoShipment()` thiếu `destinationFacilityId` (Kho đích)

* **Vị trí mã nguồn:** `backend/src/services/shipment.service.ts` (Hàm `loadToteIntoShipment()`, dòng 493 - 500).
* **Kết quả thẩm định:** 🔴 **XÁC NHẬN CHÍNH XÁC**
* **Phân tích hiện trạng:**
  - Khi Tài xế dùng App Mobile quét mã Sọt (`TOTE-...`) để nạp hàng lên xe tải, mã nguồn tạo chuyến xe tải (`shipment`) hiện tại:
    ```typescript
    shipment = await tx.shipment.create({
      data: {
        shipmentCode,
        status: ShipmentStatus.IN_TRANSIT,
        createdBy: driverUserId,
        originFacilityId: tote.facilityId || staff?.assignedFacilityId || null,
        // ⚠️ THIẾU TRƯỜNG destinationFacilityId !
      },
    });
    ```
  - Việc bỏ trống `destinationFacilityId` khiến hệ thống không định danh được chuyến xe tải này đang di chuyển về **Kho Tổng TP.HCM (`FAC-HUB-HCM`)** hay về **Bưu cục Cấp 3**.
* **Phương án khắc phục:**
  - Cập nhật `loadToteIntoShipment()` tự động suy ra `destinationFacilityId`:
    - Nếu sọt thuộc khu vực xuất tỉnh `ZONE-W-PROVINCE-DISPATCH` ➔ Kho đích là **Kho Tổng Tỉnh / Provincial Hub (`FAC-HUB-HCM`)**.
    - Nếu sọt thuộc khu vực xuất nội tỉnh ➔ Kho đích là **Bưu cục Cấp 3 tương ứng**.

---

### 📍 Vấn đề 4: Thiếu kịch bản Cấp 1 ➔ Cấp 1 (Trung chuyển Liên Miền)

* **Vị trí quy hoạch:** Bản Plan Kiến trúc Nghiệp vụ Vận chuyển Mạng lưới Multi-Tier.
* **Kết quả thẩm định:** 🔴 **XÁC NHẬN CHÍNH XÁC**
* **Phân tích hiện trạng:**
  - Sơ đồ plan nghiệp vụ trước đó mới chỉ bao gồm các chặng:
    - Bưu cục Cấp 3 ➔ Kho Tỉnh Cấp 2.
    - Kho Tỉnh Cấp 2 ➔ Tổng Kho Miền Cấp 1 (Mega Sorting Center).
  - Bị bỏ sót chặng đường dài quan trọng nhất khi vận chuyển Bắc - Nam: **Tổng Kho Miền Nam Cấp 1 (TP.HCM) ➔ Tổng Kho Miền Bắc Cấp 1 (Hà Nội)** bằng xe Container đường dài.
* **Phương án khắc phục:**
  - Cập nhật Sơ đồ Mạng lưới Vận chuyển đầy đủ 4 Cấp:
    $$\text{Bưu cục Cấp 3 (Gửi)} \longrightarrow \text{Kho Tỉnh Cấp 2} \longrightarrow \text{Tổng Kho Miền Cấp 1 (Nam)} \overset{\text{Container Linehaul}}{\xrightarrow{\hspace{2cm}}} \text{Tổng Kho Miền Cấp 1 (Bắc)} \longrightarrow \text{Kho Tỉnh Cấp 2} \longrightarrow \text{Bưu cục Cấp 3 (Phát)}$$

---

## 🛠️ LỘ TRÌNH TRIỂN KHAI SỬA LỖI (TECHNICAL ACTION PLAN)

| STT | Hạng mục công việc | File ảnh hưởng | Thời gian dự kiến |
| :--- | :--- | :--- | :--- |
| **1** | Bổ sung hàm Smart Routing tự động phân loại Sọt theo Tỉnh/Thành | `backend/src/services/order.service.ts` | 15 phút |
| **2** | Bổ sung `destinationFacilityId` chuẩn xác trong `loadToteIntoShipment()` | `backend/src/services/shipment.service.ts` | 10 phút |
| **3** | Xây dựng bộ API `POST /shipments/transfer` & `POST /shipments/transfer/:id/receive` | `shipment.routes.ts`, `shipment.controller.ts`, `shipment.service.ts` | 20 phút |
| **4** | Cập nhật Báo cáo Kiến trúc Vận chuyển 4 Cấp (Bổ sung Cấp 1 ➔ Cấp 1) | `Design DB/ARCHITECTURE_PLAN.md` | 10 phút |

---

## 📌 KẾT LUẬN

Báo cáo thẩm định này xác nhận tính hợp lý và cấp thiết của 4 đóng góp trên. Việc hoàn thiện 4 hạng mục này sẽ giúp hệ thống Smart Logistics Platform (SLP) đạt độ hoàn thiện cao nhất về cả mặt **Kiến trúc Mã nguồn (Clean Code)** lẫn **Nghiệp vụ Vận tải Thực tế (Enterprise Logistics)**.
