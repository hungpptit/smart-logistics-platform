# Đề Xuất Thảo Luận Nhóm: Thiết Kế Hệ Thống Quản Lý & Điều Phối Phương Tiện (Fleet Management)

Chào các thành viên trong nhóm,

Dưới đây là tài liệu chi tiết trình bày bài toán và 2 phương án thiết kế hệ thống quản lý phương tiện (đặc biệt là xe tải/xe van giao hàng cồng kềnh ở chặng cuối) để nhóm chúng ta cùng thảo luận, đánh giá ưu/nhược điểm và đưa ra quyết định triển khai cuối cùng.

---

## 1. ĐẶT VẤN ĐỀ (THE PROBLEM)

### 1.1. Hiện trạng hệ thống
*   **Database**: Đã có sẵn cấu trúc quản lý phương tiện (`Vehicle`, `VehicleType`, `DriverVehicleAssignment`).
*   **Phần mềm**: Chưa có API đăng ký/truy vấn phương tiện và chưa có giao diện gán xe cho tài xế.
*   **Hậu quả**: Thuật toán AI định tuyến (`assignment.service.ts`) nếu phát hiện tài xế không có xe hoạt động sẽ cộng điểm phạt rất nặng (`vehiclePenalty = 500,000`), làm thuật toán không thể phân công đơn hàng tối ưu cho họ.

### 1.2. Nghiệp vụ cần bổ sung
1.  **Ràng buộc bằng lái (License Validation)**: Tài xế muốn lái xe nào phải có bằng lái tương ứng (Xe máy -> bằng `A1/A2`, Xe Van & Xe tải 1.5 Tấn -> bằng `B2` trở lên, Container -> bằng `FC`).
2.  **Ràng buộc hạ tầng kho**: Trạm chặng cuối (`HUB`, `MICRO_HUB`) không được đăng ký quản lý xe `CONTAINER` (tránh quá tải hạ tầng đô thị).
3.  **Bài toán tối ưu chi phí mua xe (CAPEX)**: Làm sao để kiểm soát số lượng xe van và xe tải 1.5T ở chặng cuối, tránh việc các bưu cục đăng ký quá nhiều xe dẫn đến xe đắp chiếu nằm bãi gây lãng phí?

---

## 2. CHI TIẾT CÁC PHƯƠNG ÁN THỰC THI

### PHƯƠNG ÁN 1: Giới hạn định mức cứng tại từng Bưu cục (Decentralized Fleet Limit)

*   **Ý tưởng**: Mỗi bưu cục chặng cuối (`HUB`, `MICRO_HUB`) sẽ được cấp một số lượng xe tải/xe van cố định (ví dụ: Hub A tối đa 2 xe Van, 1 xe tải 1.5T). Trưởng bưu cục toàn quyền quản lý và điều phối các xe này cho tài xế của mình.
*   **Cách vận hành**:
    *   Hệ thống có cấu hình định mức xe tối đa cho mỗi loại bưu cục.
    *   Khi Admin bưu cục thêm xe mới (`POST /vehicles`), hệ thống sẽ đếm số lượng xe hiện tại và chặn lại nếu vượt quá định mức cho phép.
*   **Ưu điểm**:
    *   **Vận hành độc lập**: Trưởng bưu cục chủ động điều xe ngay lập tức khi phát sinh đơn hàng khẩn cấp.
    *   **Thiết kế phần mềm đơn giản**: Thuật toán AI định tuyến chỉ cần chạy độc lập tại từng bưu cục để tối ưu hóa tuyến đường cho những tài xế + xe thuộc bưu cục đó.
*   **Nhược điểm**:
    *   **Hiệu suất sử dụng xe chưa tối ưu**: Có thể xảy ra tình trạng Hub A thừa xe nằm không, trong khi Hub B bên cạnh đang quá tải hàng cồng kềnh nhưng không có xe để giao.
*   **Độ phức tạp lập trình**: **Thấp (Dễ triển khai nhanh)**.

---

### PHƯƠNG ÁN 2: Chia sẻ đội xe động từ Tổng kho / Theo cụm (Centralized Dynamic Shared Fleet)

*   **Ý tưởng**: Xe tải lớn và xe van không thuộc sở hữu cố định của bưu cục nhỏ chặng cuối, mà được gom về đỗ tập trung tại **Tổng kho khu vực** hoặc **Bưu cục trung tâm cụm**. Đội xe này sẽ được điều phối động hàng ngày dựa trên sản lượng hàng cồng kềnh thực tế của các bưu cục.
*   **Cách vận hành**:
    *   Hàng ngày, AI sẽ gom các đơn hàng cồng kềnh của cả cụm 4-5 bưu cục lân cận lại.
    *   AI tự động lập lộ trình tối ưu cho xe tải xuất phát từ kho trung tâm -> đi qua các bưu cục chặng cuối để lấy hàng -> đi giao cho khách hàng -> quay lại kho trung tâm.
*   **Ưu điểm**:
    *   **Tối ưu chi phí mua xe cực tốt**: Chỉ cần mua số lượng xe bằng 40-50% so với Phương án 1 mà vẫn phủ được toàn bộ các bưu cục nhờ cơ chế dùng chung động.
    *   **Hiệu suất xe cực cao**: Xe luôn được chất đầy hàng và di chuyển liên tục, không có thời gian chết.
*   **Nhược điểm**:
    *   **Chi phí xăng xe tăng**: Xe tải phải chạy một quãng đường dài không tải/ít tải từ tổng kho đến bưu cục chặng cuối trước khi bắt đầu đi phát lẻ.
    *   **Phối hợp vận hành phức tạp**: Cần sự khớp nối thời gian rất chính xác giữa xe tải trung tâm với nhân viên kho chặng cuối.
*   **Độ phức tạp lập trình**: **Rất cao (Thuật toán AI định tuyến đa cấp Multi-Depot / Multi-Echelon VRP rất khó code)**.

---

## 3. BẢNG SO SÁNH TÓM TẮT

| Tiêu chí | Phương án 1 (Định mức cứng tại Hub) | Phương án 2 (Chia sẻ động tập trung) |
| :--- | :--- | :--- |
| **Chi phí mua xe ban đầu** | Cao (cần mua xe cho từng Hub) | Thấp (mua xe dùng chung cho cả cụm) |
| **Tính chủ động vận hành** | Rất cao (Hub tự quyết định) | Thấp hơn (phụ thuộc điều phối trung tâm) |
| **Quãng đường di chuyển trống** | Ít (xe đỗ ngay tại Hub) | Nhiều hơn (xe đi từ tổng kho đến Hub) |
| **Thời gian giao hàng** | Nhanh hơn (xe xuất phát trực tiếp từ Hub) | Chậm hơn (phải chờ xe từ tổng kho xuống) |
| **Thời gian & Công sức Code** | **Nhanh (1 - 2 ngày)** | **Lâu (1 - 2 tuần)** do thuật toán AI cực kỳ phức tạp |

---

## 4. GỢI Ý CÂU HỎI THẢO LUẬN CHO NHÓM

1.  **Mục tiêu dự án của chúng ta là gì?**
    *   Nếu mục tiêu là hoàn thiện sản phẩm nhanh, đúng hạn và có thuật toán định tuyến hoạt động chuẩn ở mức cơ bản: **Nên chọn Phương án 1**.
    *   Nếu nhóm muốn làm một đề tài mang tính đột phá công nghệ, có tính nghiên cứu sâu về Operations Research/AI tối ưu hóa: **Nên chọn Phương án 2**.
2.  **Khả năng lập trình của nhóm có đủ đáp ứng thuật toán VRP đa cấp của Phương án 2 không?**
3.  **Chúng ta có nên làm theo lộ trình cuốn chiếu?**
    *   *Ví dụ*: Hiện tại code Phương án 1 trước để hệ thống chạy ổn định. Sau đó nếu còn thời gian sẽ nâng cấp thuật toán định tuyến lên Phương án 2.

Chúc nhóm thảo luận hiệu quả và đưa ra lựa chọn phù hợp nhất!
