# 📊 BÁO CÁO SO SÁNH THAY ĐỔI CƠ SỞ DỮ LIỆU (DATABASE SCHEMA COMPARISON REPORT)

Báo cáo này chi tiết các điểm thay đổi, sự khác biệt giữa cấu trúc cơ sở dữ liệu mới trong file **`Database_Schema.txt`** (sau khi họp nhóm chỉnh sửa) so với tài liệu mô tả **`database_dictionary.md`** và mã nguồn khởi tạo dữ liệu mẫu **`backend/prisma/seed.ts`** (cũng như file `schema.prisma`).

---

## 📌 1. TỔNG QUAN CÁC THAY ĐỔI LỚN (KEY CHANGES)

Nhìn chung, cấu trúc mới trong `Database_Schema.txt` phản ánh 3 định hướng thiết kế chính sau cuộc họp nhóm:
1. **Đơn giản hóa phân quyền (Simplification of Authorization)**: Chuyển đổi mối quan hệ Vai trò - Người dùng từ Nhiều - Nhiều (Many-to-Many qua bảng trung gian `user_roles`) thành Một - Nhiều (Many-to-One, phân quyền trực tiếp qua trường `role_id` ở bảng `users`).
2. **Rõ ràng hóa các trường tài chính (Financial Fields Re-branding)**: Phân tách rõ ràng giữa **Phí ước tính** (Estimated) tại thời điểm tạo đơn (`orders`) và **Phí thực tế / Cuối cùng** (Final) tại thời điểm thanh toán (`order_payments`).
3. **Cắt giảm các thuộc tính phụ (Metadata Cleanup)**: Loại bỏ nhiều trường mô tả phụ, ghi chú (`note`, `description`) và một số thuộc tính địa chỉ phụ (`address_line_2`, `place_id`, `postal_code`) để tinh gọn dữ liệu.

---

## 🔍 2. CHI TIẾT SỰ KHÁC BIỆT GIỮA CÁC FILE

### 2.1. Các bảng bị loại bỏ
* **Bảng `user_roles`**: 
  * *Hiện trạng trong `database_dictionary.md` & `schema.prisma`*: Tồn tại bảng này để liên kết Nhiều-Nhiều giữa người dùng và vai trò.
  * *Thay đổi trong `Database_Schema.txt`*: Bảng này đã bị **xóa bỏ hoàn toàn**.

### 2.2. Các trường được thêm mới / Thay thế tên trường
| Tên bảng | Trường trong `database_dictionary.md` (Cũ) | Trường trong `Database_Schema.txt` (Mới) | Ý nghĩa & Mục đích thay đổi |
| :--- | :--- | :--- | :--- |
| **`users`** | Không có (Liên kết qua bảng `user_roles`) | `role_id` | Thêm trực tiếp FK sang bảng `roles` để gán cứng 1 vai trò duy nhất cho mỗi user. |
| **`orders`** | `shipping_fee`<br>`insurance_fee`<br>`cod_amount`<br>`total_amount` | `estimated_shipping_fee`<br>`estimated_insurance_fee`<br>`estimated_cod_amount`<br>`estimated_total_amount` | Phân tách rõ đây là các chi phí **tạm tính / ước lượng** khi khởi tạo đơn hàng. |
| **`order_payments`**| `shipping_fee`<br>`insurance_fee`<br>`cod_amount` | `final_shipping_fee`<br>`final_insurance_fee`<br>`final_cod_amount` | Xác định rõ đây là các chi phí **thực tế / cuối cùng** của giao dịch thanh toán. |

### 2.3. Các trường bị loại bỏ (Cleaned up / Removed)
Nhóm đã lược bỏ rất nhiều trường phụ và metadata của các bảng trong cấu trúc mới:
* **`addresses`**: Loại bỏ `address_line_2` (địa chỉ dòng 2), `place_id` (Google/Goong Place ID), `postal_code` (mã bưu chính), và `updated_at`.
* **`customers`**: Loại bỏ `note` (ghi chú) và `updated_at`.
* **`customer_contacts`**: Loại bỏ `note`.
* **`facilities`**: Loại bỏ `note`.
* **`facility_types`**: Loại bỏ `description` (mô tả loại kho).
* **`facility_zones`**: Loại bỏ `updated_at`.
* **`permissions`**: Loại bỏ `module` (phân nhóm module của quyền).
* **`roles`**: Loại bỏ `description` (mô tả vai trò).
* **`services`**: Loại bỏ `description` (mô tả dịch vụ), `pricing_version` (phiên bản bảng giá) và `updated_at`.
* **`shipment_events`**: Loại bỏ `notes` (ghi chú sự kiện).
* **`staff_profiles`**: Loại bỏ `updated_at` (ở cả 2 định nghĩa) và `deleted_at` (ở định nghĩa dòng 237).

---

## ⚠️ 3. ĐIỂM BẤT THƯỜNG TRONG FILE `Database_Schema.txt` (INCONSISTENCIES)

Trong quá trình phân tích file `Database_Schema.txt`, phát hiện một số điểm lỗi soạn thảo cần lưu ý:
1. **Trùng lặp bảng `staff_profiles`**:
   * Bảng này xuất hiện 2 lần trong file: lần đầu ở dòng 30-31 và lần hai ở dòng 237-238.
   * Cấu trúc thuộc tính ở 2 nơi này không đồng nhất:
     * Dòng 31: `id`, `user_id`, `citizen_id`, `assigned_facility_id`, `created_at`, `deleted_at` (Có xóa mềm)
     * Dòng 238: `id`, `user_id`, `citizen_id`, `assigned_facility_id`, `created_at` (Không có xóa mềm)
     * *Khuyến nghị*: Nên giữ lại định nghĩa có `deleted_at` để phục vụ nghiệp vụ nhân sự (khi nhân viên nghỉ việc thì xóa mềm).
2. **Thiếu trường `updated_at` ở nhiều bảng cốt lõi**:
   * Các bảng như `addresses`, `customers`, `facility_zones`, `services`, `staff_profiles` bị mất trường `updated_at`. Điều này sẽ gây khó khăn cho việc kiểm toán dữ liệu (audit trail) và đồng bộ dữ liệu thời gian thực.

---

## 💥 4. ẢNH HƯỞNG TỚI MÃ NGUỒN VÀ FILE SEED (`seed.ts`)

Nếu chúng ta cập nhật database theo schema mới của `Database_Schema.txt`, file `backend/prisma/seed.ts` hiện tại sẽ **bị lỗi biên dịch và không thể chạy được** do các nguyên nhân sau:

### 4.1. Lỗi gán Vai trò (User Roles)
* **Dòng 287-293 trong `seed.ts`**:
  ```typescript
  if (role) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      }
    });
  }
  ```
  👉 **Lỗi**: Bảng `user_roles` (model `UserRole` trong Prisma) không còn tồn tại nữa.
  👉 **Cách sửa**: Gán trực tiếp `roleId` khi tạo `User`:
  ```typescript
  const user = await prisma.user.create({
    data: {
      username: tu.username,
      email: tu.email,
      passwordHash: passwordHash,
      phone: tu.phone,
      status: 'ACTIVE',
      roleId: role.id, // Gán trực tiếp tại đây
    }
  });
  ```

### 4.2. Lỗi do thuộc tính bị loại bỏ trong các bảng Master Data
* **Seeding Roles (Dòng 17)**: Thử ghi trường `description` cho Role, nhưng bảng `roles` mới không còn trường này.
* **Seeding Permissions (Dòng 35-62)**: Thử ghi trường `module` và `description` cho Permission, nhưng bảng `permissions` mới đã loại bỏ `module`.
* **Seeding Facility Types (Dòng 75-81)**: Thử ghi trường `description` cho FacilityType, nhưng bảng `facility_types` mới không còn trường này.
* **Seeding Services (Dòng 111-163)**: Thử ghi trường `pricingVersion` and `description` cho Service, nhưng bảng `services` mới đã loại bỏ hai trường này.

---

## 💡 5. ĐỀ XUẤT HƯỚNG GIẢI QUYẾT (RECOMMENDATIONS)

Để hệ thống hoạt động ổn định và đồng bộ, bạn cùng nhóm nên cân nhắc các hành động sau:

1. **Chuẩn hóa schema trước khi code**: Cập nhật file `backend/prisma/schema.prisma` theo đúng thiết kế mới được thống nhất trong nhóm (chuyển đổi quan hệ User-Role, đổi tên phí thành `estimated_` và `final_`).
2. **Khôi phục một số trường quan trọng**:
   * Nên giữ lại trường `place_id` trong bảng `addresses` vì đây là khóa cực kỳ quan trọng để tích hợp API bản đồ Goong Map/Google Maps (giúp định vị tọa độ từ địa chỉ chuỗi một cách chính xác).
   * Giữ lại `updated_at` cho các bảng chính để phục vụ cập nhật trạng thái đồng bộ frontend-backend.
3. **Cập nhật lại `seed.ts`**: Cắt bỏ các trường đã bị loại bỏ khỏi schema trong lệnh `upsert` hoặc `create` để tránh lỗi Crash khi chạy lệnh seed DB.
