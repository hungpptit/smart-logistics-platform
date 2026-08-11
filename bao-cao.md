**BỘ KHOA HỌC VÀ CÔNG NGHỆ  
HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG  
CƠ SỞ TẠI THÀNH PHỐ HỒ CHÍ MINH  
**\--------------------------------

**BÁO CÁO ĐỊNH KỲ THỰC TẬP TỐT NGHIỆP ĐẠI HỌC**

**_Đề tài: “Xây dựng hệ thống điều vận và tối ưu hóa tuyến đường giao hàng tự động (smart logistics platform — slp)”_**

| **Người hướng dẫn :** | **ThS. NGUYỄN THỊ BÍCH NGUYÊN** |     |     |
| --- | --- |     |     | --- | --- |
| **Sinh viên 1 :** | **PHẠM TUẤN HƯNG** | **MSSV:** | **N22DCCN037** |
| **Sinh viên 2 :** | **HỒ THUẬN KIỀU** | **MSSV:** | **N22DCCN046** |
| **Sinh viên 3 :** | **NGUYỄN TẤN QUÝ** | **MSSV:** | **N22DCCN066** |
| **Lớp :** | **D22CQCNPM01-N** |     |     |
| **Ngành :** | **CÔNG NGHỆ THÔNG TIN** |     |     |

**TP. HCM, tháng 8/2026**

MỤC LỤC

[MỤC LỤC ii](#_Toc237006796)

[LỜI CẢM ƠN v](#_Toc237006797)

[DANH MỤC CÁC KÝ HIỆU VÀ CHỮ VIẾT TẮT vi](#_Toc237006798)

[DANH MỤC CÁC BẢNG viii](#_Toc237006799)

[DANH MỤC CÁC HÌNH VẼ x](#_Toc237006800)

[KẾ HOẠCH THỰC HIỆN CÔNG VIỆC NHÓM xi](#_Toc237006801)

[MỞ ĐẦU 13](#_Toc237006802)

[CHƯƠNG 1: TỔNG QUAN VÀ CƠ SỞ LÝ THUYẾT 14](#_Toc237006803)

[1.1 Tổng quan đề tài 14](#_Toc237006804)

[1.1.1. Tính cấp thiết và Lý do chọn đề tài 14](#_Toc237006805)

[1.1.2 Mục tiêu nghiên cứu và Xây dựng hệ thống 14](#_Toc237006806)

[1.1.3. Đối tượng và Phạm vi nghiên cứu 15](#_Toc237006807)

[1.2. Cơ sở lý thuyết và Thuật toán cốt lõi 15](#_Toc237006808)

[1.2.1. Bài toán Tối ưu Tuyến đường giao hàng 15](#_Toc237006809)

[1.2.2. Xử lý Dữ liệu Địa lý Không gian (Geospatial Data & PostGIS) 16](#_Toc237006810)

[1.2.3. Truyền nhận Dữ liệu Thời gian thực (Real-time Telemetry Engine) 17](#_Toc237006811)

[1.3. Nền tảng Công nghệ và Công cụ sử dụng 17](#_Toc237006812)

[CHƯƠNG 2: KHẢO SÁT HIỆN TRẠNG VÀ PHÂN TÍCH YÊU CẦU 19](#_Toc237006813)

[2.1. Khảo sát hiện trạng quy trình vận tải và logistics 19](#_Toc237006814)

[2.1.1. Hiện trạng thực tế tại các doanh nghiệp giao vận 19](#_Toc237006815)

[2.1.2. Đánh giá ưu điểm và hạn chế của hiện trạng 19](#_Toc237006816)

[2.2. Phân tích các đối tượng sử dụng hệ thống 19](#_Toc237006817)

[2.2.1. Quản trị viên hệ thống (Admin) 19](#_Toc237006818)

[2.2.2. Nhân viên điều phối và quản lý kho (Staff) 20](#_Toc237006819)

[2.2.3. Khách hàng / Chủ hàng (Customer) 20](#_Toc237006820)

[2.2.4. Tài xế giao hàng (Shipper) 20](#_Toc237006821)

[2.3. Phân tích yêu cầu chức năng và Biểu đồ Use Case 21](#_Toc237006822)

[2.3.1. Sơ đồ Use Case tổng quan của hệ thống 21](#_Toc237006823)

[2.3.2. Phân rã chức năng theo từng phân hệ 23](#_Toc237006824)

[2.3.3. Mô tả chi tiết kịch bản sử dụng (Use Case Specification) 23](#_Toc237006825)

[2.4. Yêu cầu phi chức năng và Yêu cầu chất lượng hệ thống 25](#_Toc237006826)

[2.4.1. Yêu cầu về hiệu năng và tốc độ xử lý 25](#_Toc237006827)

[2.4.2. Yêu cầu về độ tin cậy và tính sẵn sàng 25](#_Toc237006828)

[2.4.3. Yêu cầu về bảo mật và phân quyền 25](#_Toc237006829)

[CHƯƠNG 3: THIẾT KẾ HỆ THỐNG 26](#_Toc237006830)

[3.1. Thiết kế Kiến trúc Hệ thống Tổng quan (System Architecture) 26](#_Toc237006831)

[3.1.1. Mô tả tổng quan về kiến trúc 26](#_Toc237006832)

[3.1.2. Sơ đồ Kiến trúc hệ thống 27](#_Toc237006833)

[3.1.3. Mô tả nhiệm vụ chi tiết của các thành phần trong kiến trúc 27](#_Toc237006834)

[3.2. Sơ đồ Phân rã Chức năng (Business Function Diagram - BFD) 29](#_Toc237006835)

[3.2.1. Mô tả tổng quan sơ đồ phân rã 29](#_Toc237006836)

[3.2.2. Sơ đồ Phân rã Chức năng 29](#_Toc237006837)

[3.2.3. Mô tả chi tiết các phân hệ chức năng 29](#_Toc237006838)

[3.3. Sơ đồ Dòng Dữ liệu (Data Flow Diagram - DFD) 31](#_Toc237006839)

[3.3.1. Mô hình DFD Mức ngữ cảnh (Mức 0) 31](#_Toc237006840)

[3.3.2. Mô hình DFD Mức 1 (Phân rã chi tiết) 32](#_Toc237006841)

[3.4. Sơ đồ Tuần tự cho các Luồng Nghiệp vụ Chính (Sequence Diagram) 33](#_Toc237006842)

[3.4.1. Luồng 1: Kích hoạt Tối ưu hóa và Lập lộ trình giao hàng tự động 33](#_Toc237006843)

[3.4.2. Luồng 2: Cập nhật Tọa độ Định vị và Giám sát Thời gian thực 34](#_Toc237006844)

[3.5. Thiết kế Cơ sở Dữ liệu 34](#_Toc237006845)

[3.5.1. Mô hình Quan hệ Thực thể (ERD - Entity Relationship Diagram) 34](#_Toc237006846)

[3.5.2. Sơ đồ Quan hệ Bảng (Database Diagram) 35](#_Toc237006847)

[3.5.3. Cấu trúc các bảng dữ liệu chi tiết 36](#_Toc237006848)

[CHƯƠNG 4: TRIỂN KHAI VÀ CÀI ĐẶT HỆ THỐNG 58](#_Toc237006849)

[4.1. Môi trường triển khai & Đóng gói hạ tầng (Docker, Docker Compose) 58](#_Toc237006850)

[4.1.1. Tổng quan mô hình triển khai hạ tầng Container 58](#_Toc237006851)

[4.1.2. Sơ đồ Kiến trúc đóng gói hạ tầng Container 58](#_Toc237006852)

[4.1.3. Chi tiết cấu hình các Container và Thông số Hạ tầng 59](#_Toc237006853)

[4.1.4. Quy trình khởi chạy hạ tầng Container 59](#_Toc237006854)

[4.2. Thiết kế & Triển khai Giao diện Người dùng (UI/UX) 60](#_Toc237006855)

[4.2.1. Giao diện Đăng nhập và Xác thực Hệ thống 60](#_Toc237006856)

[4.2.2. Giao diện Trang chủ Báo cáo Thống kê Tổng quan (Admin Dashboard) 60](#_Toc237006857)

[4.2.3. Giao diện Quản lý Đơn hàng và Nhập Xuất kho 61](#_Toc237006858)

[4.2.4. Giao diện Kích hoạt Tối ưu Phân tuyến Thuật toán AI (AI Routing Center) 62](#_Toc237006859)

[4.2.5. Giao diện Bản đồ Giám sát Trung tâm Thời gian thực (Real-time GIS Command Center) 63](#_Toc237006860)

[4.2.6. Giao diện Khách hàng: Đặt đơn & Tra cứu Hành trình Vận đơn 64](#_Toc237006861)

[4.2.7. Giao diện Ứng dụng Di động cho Tài xế: Tiếp nhận Ca & Dẫn đường (Driver Mobile App) 64](#_Toc237006862)

[4.2.8. Giao diện Ứng dụng Di động cho Tài xế: Quét mã QR & Ký nhận Giao hàng (PoD Scanner) 65](#_Toc237006863)

[4.3. Triển khai & Cài đặt các Mô-đun Xử lý Trọng tâm 66](#_Toc237006864)

[4.3.1. Phân hệ Gom cụm AI & Giải bài toán Định tuyến Phương tiện (Clustering AI & VRP Engine) 66](#_Toc237006865)

[4.3.2. Phân hệ Truyền nhận & Đồng bộ Định vị Thời gian thực (Real-time Telemetry Engine) 69](#_Toc237006866)

[4.4. Đánh giá và Kiểm thử Hệ thống 69](#_Toc237006867)

[4.4.1. Môi trường và Phương pháp luận Kiểm thử 69](#_Toc237006868)

[4.4.2. Kịch bản và Kết quả Kiểm thử Chức năng (Functional Testing) 69](#_Toc237006869)

[4.4.3. Đánh giá Hiệu năng Bài toán Tối ưu Lộ trình (VRP Performance Benchmark) 70](#_Toc237006870)

[4.4.4. Đánh giá Độ trễ Truyền nhận Định vị Thời gian thực (Real-time Latency Benchmark) 71](#_Toc237006871)

[4.4.5. Đánh giá Tổng quan Kết quả Kiểm thử 72](#_Toc237006872)

[CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN 73](#_Toc237006873)

[5.1. Kết quả đạt được 73](#_Toc237006874)

[5.1.1. Về mặt Lý thuyết và Nghiên cứu Học thuật 73](#_Toc237006875)

[5.1.2. Về mặt Thực tiễn và Xây dựng Phần mềm 73](#_Toc237006876)

[5.2. Hạn chế của hệ thống 74](#_Toc237006877)

[5.3. Hướng phát triển trong tương lai 74](#_Toc237006878)

[KẾT LUẬN, KIẾN NGHỊ 76](#_Toc237006879)

[1\. Kết luận 76](#_Toc237006880)

[2\. Kiến nghị 76](#_Toc237006881)

[TÀI LIỆU THAM KHẢO 78](#_Toc237006882)

LỜI CẢM ƠN

Để hoàn thành được quyển báo cáo đồ án tốt nghiệp với đề tài "Hệ thống điều vận và tối ưu hóa tuyến đường giao hàng tự động (Smart Logistics Platform)", nhóm C27 xin gửi lời cảm ơn chân thành và sâu sắc nhất tới các tập thể và cá nhân đã giúp đỡ, động viên nhóm C27 trong suốt quá trình học tập, nghiên cứu và thực hiện đề tài.

Trước hết, nhóm C27 xin trân trọng cảm ơn Ban Giám đốc Học viện Công nghệ Bưu chính Viễn thông (PTIT) cùng toàn thể Quý Thầy/Cô giáo trong Khoa Công nghệ Thông tin đã tận tình giảng dạy, truyền đạt những kiến thức chuyên môn quý báu cùng các kỹ năng nghề nghiệp làm nền tảng vững chắc cho nhóm C27 trong suốt những năm tháng học tập tại Học viện.

Đặc biệt, nhóm C27 xin được gửi lời cảm ơn sâu sắc nhất tới Cô ThS. Nguyễn Thị Bích Nguyên, người đã trực tiếp định hướng, tận tình chỉ bảo, động viên và dành nhiều thời gian quý báu để định hướng cho nhóm C27 từ những ngày đầu lên ý tưởng, thiết kế kiến trúc hệ thống cho đến khi hoàn thành sản phẩm phần mềm và quyển báo cáo này.

Nhóm C27 cũng xin gửi lời cảm ơn chân thành đến gia đình, bạn bè và các đồng nghiệp đã luôn ủng hộ, chia sẻ khó khăn và tạo mọi điều kiện tốt nhất về cả vật chất lẫn tinh thần trong suốt thời gian thực hiện đề tài.

Dù đã cố gắng nỗ lực hết sức để ứng dụng các công nghệ mới và hoàn thiện sản phẩm một cách chỉn chu nhất, song do giới hạn về mặt thời gian và kinh nghiệm thực tế nên quyển báo cáo khó tránh khỏi những hạn chế và thiếu sót. Nhóm C27 rất mong nhận được những ý kiến đóng góp, chỉ bảo quý báu của Quý Thầy/Cô trong Hội đồng đánh giá để đề tài của nhóm C27 được hoàn thiện hơn và có tính ứng dụng cao hơn trong thực tiễn.

Nhóm C27 xin kính chúc Quý Thầy/Cô giáo luôn mạnh khỏe, hạnh phúc và gặt hái được nhiều thành công trong sự nghiệp cao quý "trồng người"!

_Nhóm C27 xin chân thành cảm ơn!_

_TP. Hồ Chí Minh , ngày 8 tháng 8 năm 2026_

**Nhóm sinh viên thực hiện**

DANH MỤC CÁC KÝ HIỆU VÀ CHỮ VIẾT TẮT

|     |     |     |
| --- | --- | --- |
| **Từ viết tắt** | **Thuật ngữ Tiếng Anh Đầy đủ** | **Giải nghĩa Tiếng Việt** |
| **3NF** | Third Normal Form | Dạng chuẩn hóa thứ ba trong thiết kế Cơ sở Dữ liệu |
| **AI** | Artificial Intelligence | Trí tuệ Nhân tạo |
| **API** | Application Programming Interface | Giao diện Lập trình Ứng dụng |
| **BFD** | Business Function Diagram | Sơ đồ Phân rã Chức năng Nghiệp vụ |
| **COD** | Cash On Delivery | Dịch vụ Tiền thu hộ khi giao hàng |
| **CVRP** | Capacitated Vehicle Routing Problem | Bài toán Định tuyến Phương tiện có Ràng buộc Tải trọng |
| **DFD** | Data Flow Diagram | Sơ đồ Dòng Dữ liệu |
| **EDA** | Event-Driven Architecture | Kiến trúc Hướng Sự kiện |
| **ERD** | Entity Relationship Diagram | Mô hình Quan hệ Thực thể |
| **ETA** | Estimated Time of Arrival | Thời gian Dự kiến Đến nơi / Cập bến |
| **FK** | Foreign Key | Khóa Ngoại trong Cơ sở Dữ liệu |
| **GA** | Genetic Algorithm | Thuật toán Di truyền (Thuật toán Tiến hóa) |
| **GIS** | Geographic Information System | Hệ thống Thông tin Địa lý / Bản đồ số |
| **GiST** | Generalized Search Tree | Cấu trúc cây chỉ mục tìm kiếm dữ liệu địa lý không gian |
| **GPS** | Global Positioning System | Hệ thống Định vị Toàn cầu |
| **IoT** | Internet of Things | Internet Kết nối Mọi vật |
| **JWT** | JSON Web Token | Chuỗi mã xác thực an toàn định dạng JSON |
| **K8s** | Kubernetes | Nền tảng tự động hóa triển khai và co giãn Container |
| **OBD-II** | On-Board Diagnostics II | Cổng đọc dữ liệu chuẩn đoán hành trình phương tiện |
| **ORM** | Object-Relational Mapping | Mô hình Ánh xạ Đối tượng - Quan hệ |
| **OSRM** | Open Source Routing Machine | Bộ máy tính toán tuyến đường giao thông mã nguồn mở |
| **PK** | Primary Key | Khóa Chính trong Cơ sở Dữ liệu |
| **PoD** | Proof of Delivery | Chứng từ / Bằng chứng Xác nhận Giao hàng |
| **PTIT** | Posts and Telecommunications Institute of Technology | Học viện Công nghệ Bưu chính Viễn thông |
| **QR Code** | Quick Response Code | Mã phản hồi nhanh (Mã QR 2D) |
| **REST** | Representational State Transfer | Kiểu kiến trúc dịch vụ phần mềm truyền tải dữ liệu |
| **SLP** | Smart Logistics Platform | Hệ thống Nền tảng Logistics Thông minh |
| **UK** | Unique Key | Khóa Duy nhất trong Cơ sở Dữ liệu |
| **UI** | User Interface | Giao diện Người dùng |
| **UX** | User Experience | Trải nghiệm Người dùng |
| **UUID** | Universally Unique Identifier | Chuỗi định danh duy nhất toàn cầu (128-bit) |
| **VRP** | Vehicle Routing Problem | Bài toán Định tuyến Phương tiện / Tối ưu Tuyến đường |
| **VRPTW** | Vehicle Routing Problem with Time Windows | Bài toán Định tuyến Phương tiện có Ràng buộc Cửa sổ Thời gian |
| **WGS 84** | World Geodetic System 1984 | Hệ tọa độ chuẩn trắc địa toàn cầu năm 1984 |

DANH MỤC CÁC BẢNG

[Bảng 1. Nền tảng Công nghệ và Công cụ sử dụng 16](#_Toc237006083)

[Bảng 2. Mô tả nhiệm vụ chi tiết của các thành phần trong kiến trúc 26](#_Toc237006084)

[Bảng 3. Mô tả chi tiết các phân hệ trong sơ đồ phân rã chức năng (BFD) 28](#_Toc237006085)

[Bảng 4. Mô tả chi tiết các luồng dữ liệu trong Sơ đồ DFD Mức ngữ cảnh (Mức 0) 30](#_Toc237006086)

[Bảng 5. Mô tả chi tiết các tiến trình xử lý trong Sơ đồ DFD Mức 1 31](#_Toc237006087)

[Bảng 6. Cấu trúc bảng users (Tài khoản Người dùng) 35](#_Toc237006088)

[Bảng 7. Cấu trúc bảng roles (Danh mục Vai trò) 36](#_Toc237006089)

[Bảng 8. Cấu trúc bảng permissions (Danh mục Quyền hạn) 36](#_Toc237006090)

[Bảng 9. Cấu trúc bảng role_permissions (Phân quyền Vai trò) 36](#_Toc237006091)

[Bảng 10. Cấu trúc bảng customers (Thông tin Khách hàng) 37](#_Toc237006092)

[Bảng 11. Cấu trúc bảng addresses (Danh bạ Địa chỉ & Tọa độ) 38](#_Toc237006093)

[Bảng 12. Cấu trúc bảng customer_addresses (Địa chỉ Khách hàng) 38](#_Toc237006094)

[Bảng 13. Cấu trúc bảng facility_types (Loại hình Bưu cục) 39](#_Toc237006095)

[Bảng 14. Cấu trúc bảng facilities (Mạng lưới Bưu cục Kho bãi) 39](#_Toc237006096)

[Bảng 15. Cấu trúc bảng facility_zones (Phân khu Kho bãi) 40](#_Toc237006097)

[Bảng 16. Cấu trúc bảng services (Bảng giá & Gói Dịch vụ) 41](#_Toc237006098)

[Bảng 17. Cấu trúc bảng orders (Quản lý Đơn hàng) 42](#_Toc237006099)

[Bảng 18. Cấu trúc bảng packages (Kiện hàng Chi tiết) 43](#_Toc237006100)

[Bảng 19. Cấu trúc bảng order_payments (Thanh toán Đơn hàng) 44](#_Toc237006101)

[Bảng 20. Cấu trúc bảng order_status_history (Nhật ký Trạng thái Đơn) 45](#_Toc237006102)

[Bảng 21. Cấu trúc bảng shipments (Quản lý Vận đơn Giao hàng) 45](#_Toc237006103)

[Bảng 22. Cấu trúc bảng shipment_packages (Kiện hàng thuộc Vận đơn) 46](#_Toc237006104)

[Bảng 23. Cấu trúc bảng shipment_transfers (Chuyển giao Vận đơn giữa các Bưu cục) 46](#_Toc237006105)

[Bảng 24. Cấu trúc bảng staff (Thông tin Nhân viên & Tài xế) 47](#_Toc237006106)

[Bảng 25. Cấu trúc bảng staff_driver_types (Đa loại hình Tài xế - Mới) 48](#_Toc237006107)

[Bảng 26. Cấu trúc bảng vehicles (Quản lý Phương tiện Giao hàng) 48](#_Toc237006108)

[Bảng 27. Cấu trúc bảng vehicle_types (Loại Phương tiện) 49](#_Toc237006109)

[Bảng 28. Cấu trúc bảng driver_vehicle_assignments (Phân công Tài xế Lái xe) 49](#_Toc237006110)

[Bảng 29. Cấu trúc bảng driver_locations (Tọa độ Định vị Mới nhất của Tài xế) 50](#_Toc237006111)

[Bảng 30. Cấu trúc bảng routes (Lộ trình Chuyến xe) 50](#_Toc237006112)

[Bảng 31. Cấu trúc bảng route_stops (Chi tiết Điểm dừng Lộ trình) 51](#_Toc237006113)

[Bảng 32. Cấu trúc bảng dispatch_tasks (Nhiệm vụ Điều phối Giao chuyến) 52](#_Toc237006114)

[Bảng 33. Cấu trúc bảng route_optimizations (Nhật ký Chạy AI Routing) 52](#_Toc237006115)

[Bảng 34. Cấu trúc bảng route_adjustment_logs (Nhật ký Sự cố Điều chỉnh Chuyến) 53](#_Toc237006116)

[Bảng 35. Cấu trúc bảng tracking_events (Nhật ký Hành trình Đơn hàng) 53](#_Toc237006117)

[Bảng 36. Cấu trúc bảng barcode_scans (Nhật ký Quét Mã QR Code / Barcode) 54](#_Toc237006118)

[Bảng 37. Cấu trúc bảng delivery_proofs (Bằng chứng Giao hàng - PoD Cập nhật) 54](#_Toc237006119)

[Bảng 38. Cấu trúc bảng system_settings (Tham số Cấu hình Hệ thống) 55](#_Toc237006120)

[Bảng 39. Các Bảng Đơn vị Hành chính Việt Nam 56](#_Toc237006121)

[Bảng 40. Danh mục các Dịch vụ Container và Thông số Cấu hình Hạ tầng 58](#_Toc237006122)

[Bảng 41. So sánh Phương pháp Tính Ma trận Khoảng cách và Thời gian Di chuyển 66](#_Toc237006123)

[Bảng 42. Kịch bản Kiểm thử Chức năng Hệ thống 68](#_Toc237006124)

[Bảng 43. Thử nghiệm Hiệu năng Thuật toán AI Routing VRP với quy mô số lượng điểm giao tăng dần 70](#_Toc237006125)

[Bảng 44. Đánh giá Độ trễ Cập nhật Định vị Real-time Socket.io & Redis 70](#_Toc237006126)

[Bảng 45. Đánh giá đối chiếu kết quả đạt được so với mục tiêu ban đầu 72](#_Toc237006127)

# DANH MỤC CÁC HÌNH VẼ

[Hình 1. Sơ đồ Use Case tổng quan của hệ thống 21](#_Toc237006164)

[Hình 2. Sơ đồ kiến trúc hệ thống tổng quan 26](#_Toc237006165)

[Hình 3. Sơ đồ phân rã chức năng tổng quan 28](#_Toc237006166)

[Hình 4. Sơ đồ Dòng Dữ liệu Mức ngữ cảnh (DFD Mức 0) 30](#_Toc237006167)

[Hình 5. Sơ đồ Dòng Dữ liệu Mức 1 31](#_Toc237006168)

[Hình 6. Sơ đồ Tuần tự luồng Kích hoạt Tối ưu và Lập lộ trình giao hàng 32](#_Toc237006169)

[Hình 7. Sơ đồ Tuần tự luồng Cập nhật Tọa độ Định vị và Giám sát Thời gian thực 33](#_Toc237006170)

[Hình 8. Mô hình Quan hệ Thực thể Tổng quan 34](#_Toc237006171)

[Hình 9. Sơ đồ Mô hình Triển khai Hạ tầng Container 57](#_Toc237006172)

[Hình 10. Giao diện Đăng nhập Hệ thống (Login Screen) 59](#_Toc237006173)

[Hình 11. Giao diện Trang chủ Báo cáo Thống kê Tổng quan (Dashboard Admin) 60](#_Toc237006174)

[Hình 12. Giao diện Quản lý Đơn hàng và Nhập Xuất kho (Order Management) 61](#_Toc237006175)

[Hình 13. Giao diện Kích hoạt Tối ưu Phân tuyến Thuật toán AI (AI Routing Center) 62](#_Toc237006176)

[Hình 14. Giao diện Bản đồ Giám sát Tài xế Thời gian thực (GIS Command Center) 63](#_Toc237006177)

[Hình 15. Giao diện ứng dụng di động Tài xế - Danh sách Chuyến đi và Dẫn đường 64](#_Toc237006178)

[Hình 16. Giao diện ứng dụng di động Tài xế - Quét mã QR và Ký nhận Giao hàng 65](#_Toc237006179)

[Hình 17. Sơ đồ Luồng xử lý của Bộ giải toán Tối ưu Lộ trình AI VRP Engine 67](#_Toc237006180)

[Hình 18. Sơ đồ Luồng Truyền nhận Tọa độ Định vị Real-time 68](#_Toc237006181)

KẾ HOẠCH THỰC HIỆN CÔNG VIỆC NHÓM

**Phân công chi tiết công việc theo tuần**

| **Tuần** | **Thành viên 1 - Phạm Tuấn Hưng (Backend + AI)** | **Thành viên 2 - Hồ Thuận Kiều (Mobile App)** | **Thành viên 3 - Nguyễn Tấn Quý (Frontend Web)** |
| --- | --- | --- | --- |
| **Tuần 1** | Thiết kế 39 bảng DB, viết schema.prisma, Prisma Migrations, seed.ts, cấu hình Docker Compose, khởi tạo Express/TypeScript | Khởi tạo Flutter project, cấu hình navigation (main.dart), thiết kế wireframe màn hình Auth + tạo đơn + bản đồ stops + quét QR + POD | Khởi tạo React + Vite + TailwindCSS, xây dựng Landing Page cơ bản + bản đồ tra cứu, Developer Dashboard RBAC |
| **Tuần 2** | APIs Auth (JWT/bcrypt/RBAC), Customer CRUD, Facility & Cargo Zone, Order/Package/Pricing/Geocoding (Goong), Swagger docs, Postman Collection | Auth di động (đăng nhập/đăng ký/quên MK), luồng tạo đơn lẻ/hàng loạt + Goong Autocomplete, màn hình QR vận đơn, timeline trạng thái, hủy đơn | Form đăng nhập + Route Guards + Zustand JWT, Tab Khách hàng, Tab Facility, Tab Đơn hàng toàn cục trên Admin Dashboard |
| **Tuần 3** _(kế hoạch)_ | APIs Shipment, Fleet & Driver, Route/RouteStop thủ công, Socket.io Gateway GPS, locationWorker Redis→DB | App Tài xế: nhận tuyến, check-in điểm dừng, GPS background 3-5s/lần, quét barcode, chụp ảnh POD, ký điện tử | Bản đồ Command Center realtime (Leaflet/MapLibre), marker tài xế cập nhật vị trí động, Tab Shipment & Fleet |
| **Tuần 4** _(kế hoạch)_ | Tích hợp AI Routing (/routing/optimize), System Settings API, tối ưu truy vấn DB + index PostGIS | Offline cache, retry API khi mất mạng, tối ưu GPS background pin, E2E testing toàn luồng | Dashboard thống kê (Recharts), nút kích hoạt AI Routing, tối ưu Lazy Loading + Skeleton UI |

**Tổng hợp trách nhiệm theo phân hệ (Giai đoạn 1)**

|     |     |
| --- | --- |
| **Phân hệ** | **Người chịu trách nhiệm chính** |
| Database Design (39 bảng), Prisma Schema, Migration, Seed | Phạm Tuấn Hưng |
| Backend API (Auth, Customer, Facility, Order, Driver, Routing, Settings) | Phạm Tuấn Hưng |
| AI Engine (K-Means, Genetic Algorithm VRP, AssignmentService) | Phạm Tuấn Hưng |
| Pricing Service (Rule-based Fee Engine) | Phạm Tuấn Hưng |
| Geocoding Integration (Goong API) | Phạm Tuấn Hưng |
| Web Landing Page + Tính cước nhanh + Tra cứu vận đơn | Nguyễn Tấn Quý |
| Web Admin Dashboard (Login, Customer Tab, Facility Tab, Order Tab) | Nguyễn Tấn Quý |
| Bản đồ realtime, Marker GPS, Command Center (Tuần 3) | Nguyễn Tấn Quý |
| Customer Mobile App (Auth, Tạo đơn, QR, Timeline, Hủy đơn) | Hồ Thuận Kiều |
| Shipper Mobile App (Lộ trình, Check-in, Quét QR, POD, GPS ngầm) | Hồ Thuận Kiều |

MỞ ĐẦU

Trong nền kinh tế số hiện đại, sự bùng nổ của Thương mại Điện tử và dịch vụ giao hàng theo yêu cầu đã tạo ra áp lực vô cùng to lớn đối với ngành giao nhận vận tải (Logistics). Trong đó, khâu giao hàng chặng cuối - giai đoạn vận chuyển hàng hóa từ kho bưu cục tới tận tay người nhận - được đánh giá là công đoạn tốn kém chi phí nhất nhưng lại có hiệu suất thấp nhất nếu quản lý theo phương thức thủ công. Việc nhân viên kho phải đọc địa chỉ chia đơn bằng mắt, tài xế tự sắp xếp lộ trình di chuyển theo cảm tính và trung tâm điều hành thiếu công cụ giám sát thời gian thực chính là những nguyên nhân hàng đầu dẫn đến việc lãng phí nhiên liệu, trễ khung giờ hẹn của khách hàng và làm tăng chi phí vận hành.

Nhận thức được những bất cập thực tế đó, đề tài **"Hệ thống điều vận và tối ưu hóa tuyến đường giao hàng tự động (Smart Logistics Platform - SLP)"** được nghiên cứu và phát triển nhằm mang đến một giải pháp số hóa toàn diện quy trình giao nhận chặng cuối. Hệ thống kết hợp giữa các thuật toán Trí tuệ Nhân tạo (gom cụm địa lý AI, thuật toán di truyền giải bài toán tối ưu tuyến đường VRP thỏa mãn tải trọng xe và giờ hẹn khách) với công nghệ bản đồ số và kiến trúc xử lý luồng dữ liệu thời gian thực (Socket.io và Redis Cache). Giải pháp cung cấp đầy đủ các công cụ đa nền tảng gồm Web Quản trị cho bộ phận điều hành, ứng dụng di động cho tài xế và hạ tầng container ảo hóa, giúp tối ưu hóa quãng đường di chuyển và nâng cao năng suất giao nhận.

Quyển báo cáo được bố cục thành 5 chương chính: Chương 1 trình bày tổng quan và cơ sở lý thuyết; Chương 2 phân tích khảo sát hiện trạng và yêu cầu hệ thống; Chương 3 tập trung vào thiết kế kiến trúc, sơ đồ dòng dữ liệu và cơ sở dữ liệu; Chương 4 trình bày chi tiết việc triển khai cài đặt các mô-đun trọng tâm, giao diện và kết quả kiểm thử hiệu năng; cuối cùng Chương 5 tổng kết các kết quả đạt được, chỉ ra hạn chế và đề xuất hướng phát triển trong tương lai.

Dù đã cố gắng hoàn thiện đề tài với tinh thần nghiêm túc và cầu thị, song do giới hạn về thời gian và nguồn lực nên hệ thống khó tránh khỏi những thiếu sót nhất định. Nhóm rất mong nhận được những ý kiến đóng góp quý báu của Quý Thầy/Cô và các bạn để sản phẩm ngày càng hoàn thiện hơn

# CHƯƠNG 1: TỔNG QUAN VÀ CƠ SỞ LÝ THUYẾT

## 1.1 Tổng quan đề tài

### 1.1.1. Tính cấp thiết và Lý do chọn đề tài

Trong nền kinh tế số hiện đại, Thương mại Điện tử (E-commerce) và dịch vụ giao vận theo yêu cầu (On-demand Delivery) đang phát triển với tốc độ bùng nổ. Sự gia tăng đột biến về lượng đơn hàng đặt ra thách thức vô cùng to lớn đối với các doanh nghiệp Logistics trong khâu vận hành chặng cuối (Last-mile Delivery) — khâu chiếm tới 40% - 50% tổng chi phí vận tải nhưng lại có hiệu suất thấp nhất nếu quản lý thủ công.

Tại hầu hết các bưu cục và kho trung chuyển quy mô vừa và nhỏ hiện nay, quy trình điều phối vận tải vẫn tồn tại nhiều hạn chế:

- - **Phân chia đơn hàng thủ công:** Nhân viên kho hoặc tài xế phải tự đọc địa chỉ bằng mắt để sàng lọc và phân khu vực. Điều này tốn thời gian, dễ gây ra tình trạng phân chia chồng chéo, tài xế di chuyển đan xen địa bàn của nhau.
    - **Lập lộ trình di chuyển cảm tính:** Tài xế tự quyết định thứ tự các điểm giao dựa trên kinh nghiệm cá nhân. Cách làm này khó đáp ứng được các ràng buộc phức tạp như giới hạn tải trọng của xe (Capacitated) hay khung giờ hẹn chính xác của khách hàng (Time Windows), dẫn đến chi phí nhiên liệu tăng cao và tỷ lệ giao hàng thất bại lớn.
    - **Thiếu công cụ giám sát thời gian thực (Real-time Tracking):** Trung tâm điều hành khó nắm bắt chính xác vị trí thực tế của từng tài xế trên đường, việc cập nhật tiến độ chủ yếu qua gọi điện hoặc báo cáo thủ công cuối ngày.

Xuất phát từ những bất cập thực tế đó, đề tài **"Hệ thống điều vận và tối ưu hóa tuyến đường giao hàng tự động (Smart Logistics Platform - SLP)"** được nghiên cứu và phát triển. Đề tài áp dụng các thuật toán Trí tuệ Nhân tạo (AI Clustering, Genetic Algorithm / Meta-heuristic VRP) kết hợp với công nghệ bản đồ số và kiến trúc xử lý luồng dữ liệu thời gian thực (Real-time Telemetry Engine), nhằm tự động hóa toàn bộ quy trình từ khâu gom cụm đơn tại kho đến khâu dẫn đường tối ưu ngoài thực địa.

### 1.1.2 Mục tiêu nghiên cứu và Xây dựng hệ thống

a. Mục tiêu tổng quát

Xây dựng một giải pháp phần mềm tổng thể (Enterprise-grade Logistics Platform) hỗ trợ số hóa toàn diện quy trình điều phối vận tải chặng cuối: tự động hóa khâu gom cụm đơn hàng, giải bài toán tối ưu hóa tuyến đường giao hàng đa ràng buộc và giám sát hành trình tài xế thời gian thực trên bản đồ số trực quan.

b. Mục tiêu cụ thể

1.  **Tự động gom cụm đơn hàng (Clustering AI):** Ứng dụng các thuật toán gom cụm mật độ (DBSCAN / K-Means) kết hợp Geocoding để chuyển đổi địa chỉ văn bản thành tọa độ địa lý, tự động phân chia hàng ngàn đơn hàng rải rác thành các vùng giao hàng tối ưu cho từng tài xế.
2.  **Giải bài toán lập lộ trình đa ràng buộc (VRP Solver Engine):** Xây dựng bộ giải toán VRP thỏa mãn đồng thời hai ràng buộc cứng khắt khe:
    - CVRP (Capacitated VRP): Tổng khối lượng/thể tích đơn hàng không vượt quá tải trọng tối đa của phương tiện.
    - VRPTW (VRP with Time Windows): Tài xế đến giao/nhận hàng nằm trong đúng "cửa sổ thời gian" hẹn trước của khách hàng.
3.  **Trung tâm điều hành trực quan thời gian thực (Real-time Command Center):** Xây dựng màn hình giám sát GIS Dashboard cho phép bộ phận điều phối theo dõi chính xác vị trí tài xế (tần suất cập nhật 3–5 giây/lần), trạng thái hoàn thành từng cờ hiệu điểm giao (Marker Status) mà không gây nghẽn hệ thống.
4.  **Ứng dụng di động cho Tài xế (Mobile App Shipper):** Cung cấp công cụ nhận ca, bản đồ điều hướng tối ưu chuỗi điểm dừng và quét mã QR Code cập nhật trạng thái đơn kèm bằng chứng giao hàng (PoD - Proof of Delivery).

### 1.1.3. Đối tượng và Phạm vi nghiên cứu

- **Đối tượng nghiên cứu:**
    - Thuật toán gom cụm dữ liệu không gian (DBSCAN, K-Means).
    - Thuật toán Heuristic / Meta-Heuristic (Genetic Algorithm - Di truyền, Tabu Search, OR-Tools) giải bài toán định tuyến phương tiện VRP.
    - Các giải pháp xử lý luồng dữ liệu truyền dẫn tần suất cao (Socket.io WebSockets, Redis In-Memory Cache Pub/Sub).
    - Mô hình lưu trữ và truy vấn dữ liệu địa lý không gian (PostgreSQL 15 tích hợp mở rộng PostGIS).
- **Phạm vi nghiên cứu:**
    - Phạm vi nghiệp vụ: Tập trung vào bài toán Điều vận & Tối ưu hóa tuyến đường giao hàng chặng cuối (Last-mile Logistics).
    - Phạm vi dữ liệu thực nghiệm: Dữ liệu tọa độ địa lý mô phỏng và thực tế tại các khu vực đô thị (TP. Hồ Chí Minh / Hà Nội) tích hợp dịch vụ Bản đồ số (Mapbox / Google Maps / OpenStreetMap).

## 1.2. Cơ sở lý thuyết và Thuật toán cốt lõi

### 1.2.1. Bài toán Tối ưu Tuyến đường giao hàng

a. Phát biểu bài toán

Bài toán Định tuyến Phương tiện (Vehicle Routing Problem - VRP) là bài toán tối ưu hóa tổ hợp thuộc nhóm NP-hard nổi tiếng trong Khoa học Máy tính và Vận tải học. Mục tiêu của VRP là tìm ra tập hợp các tuyến đường có tổng chi phí di chuyển (quãng đường hoặc thời gian) là nhỏ nhất cho một đội xe xuất phát từ một hoặc nhiều kho (Depots) đến phục vụ danh sách các khách hàng rải rác, sau đó quay trở về kho.

b. Biến thể VRP trong hệ thống SLP

Trong hệ thống Smart Logistics Platform, bài toán VRP thực tế được mở rộng tích hợp hai biến thể ràng buộc cứng (Hard Constraints):

**Trong đó các ràng buộc bắt buộc bao gồm:**

1.  **Ràng buộc Tải trọng Phương tiện (Capacitated VRP - CVRP):** 
    - Khối lượng đơn hàng tại điểm giao
    - Sức chứa/Tải trọng tối đa của xe
    - Tổng tải trọng đơn hàng trên một chuyến không được vượt quá tải trọng của xe.
2.  **Ràng buộc Khung giờ hẹn (VRP with Time Windows - VRPTW):**
    - Cửa sổ thời gian (Time Window) cho phép giao hàng tại điểm.
    - Thời điểm xe cập bến điểm giao. Nếu xe đến trước, tài xế phải chờ; nếu đến sau, đơn hàng coi như vi phạm ràng buộc (thất bại).

c. Phương pháp giải toán (Genetic Algorithm & Penalty Function)

Do bài toán VRP với CVRP + VRPTW là bài toán NP-hard không thể giải chính xác bằng đại số trong thời gian thực với số lượng điểm lớn, hệ thống áp dụng Thuật toán Di truyền (Genetic Algorithm) tích hợp Hàm phạt (Penalty Function):

- **Mã hóa nhiễm sắc thể (Chromosome Representation):** Chuỗi thứ tự danh sách các đơn hàng đại diện cho một phương án lộ trình.
- **Hàm thích nghi (Fitness Function):**  Bất kỳ phương án nào quá tải hoặc trễ giờ sẽ bị gán điểm phạt cao, dẫn đến việc bị tự động loại bỏ qua các thế hệ chọn lọc (Selection), lai ghép (Crossover) và đột biến (Mutation).

### 1.2.2. Xử lý Dữ liệu Địa lý Không gian (Geospatial Data & PostGIS)

a. Định dạng dữ liệu không gian

Hệ thống xử lý hai chuẩn dữ liệu địa lý cốt lõi:

- Point (Điểm): Đại diện cho tọa độ GPS của Kho (Depot), Điểm giao hàng (Delivery Spot) hoặc Tọa độ di chuyển thời gian thực của Tài xế (Latitude, Longitude).
- LineString / MultiLineString: Đại diện cho tuyến đường di chuyển hình học (Routing Geometry) nối liền chuỗi các điểm giao.

b. Hệ tọa độ WGS 84 (EPSG:4326) và PostGIS Indexing

- Dữ liệu vị trí sử dụng chuẩn toàn cầu WGS 84 (EPSG:4326).
- Hệ thống lưu trữ dữ liệu hình học trực tiếp bằng kiểu dữ liệu GEOMETRY trong PostgreSQL tích hợp PostGIS.
- Spatial Indexing (Gián đoạn chỉ mục GIST): Để tối ưu tốc độ truy vấn các điểm giao thuộc một bán kính hoặc vùng polygon mà không cần quét toàn bộ đĩa (Full Table Scan), PostGIS sử dụng chỉ mục GiST (Generalized Search Tree) dựa trên cấu trúc cây R-Tree, giúp các truy vấn tìm kiếm hàng xóm gần nhất (KNN - K-Nearest Neighbors) đạt tốc độ mili-giây.

### 1.2.3. Truyền nhận Dữ liệu Thời gian thực (Real-time Telemetry Engine)

a. Thách thức nghẽn I/O trong hệ thống Logistics

Với hàng trăm tài xế di chuyển ngoài đường, ứng dụng di động sẽ gửi tọa độ định vị định kỳ mỗi 3–5 giây. Nếu mỗi sự kiện định vị đều ghi trực tiếp vào Cơ sở dữ liệu quan hệ (PostgreSQL), đĩa cứng sẽ lập tức bị nghẽn (I/O Bottleneck), làm giảm hiệu năng toàn bộ hệ thống.

b. Giải pháp Kiến trúc Hướng sự kiện (EDA) với Socket.io & Redis

Hệ thống SLP giải quyết bài toán này thông qua mô hình In-Memory Telemetry Pipeline

1.  **WebSocket / Socket.io:** Thiết lập kênh kết nối song công (Full-duplex) duy trì liên tục giữa Mobile App và Server với chi phí Overhead cực nhỏ.
2.  **Redis In-Memory Caching:** Tọa độ GPS mới nhất của tài xế được lưu tạm vào bộ nhớ đệm Redis (tốc độ đọc/ghi < 1 ms).
3.  **Socket Rooms & Pub/Sub:** Server chỉ phát sóng (Broadcast) tọa độ từ Redis tới các tài khoản Admin/Khách hàng đang mở màn hình giám sát chuyến xe đó, triệt tiêu hoàn bộ nghẽn ghi đĩa SQL.

## 1.3. Nền tảng Công nghệ và Công cụ sử dụng

Dự án Smart Logistics Platform được thiết kế theo kiến trúc Modular Monolith / Microservices-ready, phân chia rõ ràng giữa các phân hệ

Bảng . Nền tảng Công nghệ và Công cụ sử dụng

|     |     |     |
| --- | --- | --- |
| **Phân hệ** | **Công nghệ lựa chọn** | **Vai trò & Lý do lựa chọn** |
| Backend Core API | Node.js (v20+) + Express.js + TypeScript | Xây dựng RESTful API Gateway, quản lý luồng nghiệp vụ. TypeScript đảm bảo tính Type-safe, giảm thiểu lỗi runtime. Node.js xử lý bất đồng bộ I/O cực mạnh. |
| ORM Layer | Prisma ORM | Schema-driven ORM giúp quản lý 38 bảng dữ liệu một cách chặt chẽ, tự động sinh Migration và cung cấp Type-safe Database Client. |
| Cơ sở dữ liệu chính | PostgreSQL 15 + PostGIS Extension | Lưu trữ persistent toàn bộ dữ liệu quan hệ (Đơn hàng, Khách hàng, Chuyến xe) và thực hiện các tính toán địa lý hình học chuyên sâu. |
| Bộ nhớ đệm & Realtime | Redis 7 + Socket.io Server | Lưu trữ cache tọa độ GPS tần suất cao, quản lý phiên đăng nhập và đóng vai trò Pub/Sub Message Broker cho luồng dữ liệu thời gian thực. |
| Web Admin Center | React 18 + TypeScript + Vite + TailwindCSS | Xây dựng giao diện Trung tâm Điều hành mượt mà, render bản đồ tương tác (Leaflet / Mapbox GL) hiệu năng cao nhờ Vite bundler. |
| Mobile App Shipper | Flutter / React Native | Ứng dụng di động đa nền tảng cho tài xế, tích hợp Background GPS Location Service, Camera QR Code Scanner và Offline Caching. |
| AI Routing Engine | Python (v3.11) + Google OR-Tools / GA | Phân hệ tính toán độc lập đảm nhận các tác vụ gom cụm AI (DBSCAN) và giải bài toán tối ưu tuyến đường VRP phức tạp. |
| Hạ tầng Container | Docker & Docker Compose | Đóng gói môi trường chạy chuẩn hóa cho PostgreSQL (PostGIS) và Redis, giúp việc triển khai (Deployment) nhất quán và nhanh chóng. |

# CHƯƠNG 2: KHẢO SÁT HIỆN TRẠNG VÀ PHÂN TÍCH YÊU CẦU

## 2.1. Khảo sát hiện trạng quy trình vận tải và logistics

### 2.1.1. Hiện trạng thực tế tại các doanh nghiệp giao vận

Trong mô hình vận chuyển hàng hóa truyền thống tại các bưu cục và kho trung chuyển, quy trình làm việc thường trải qua các bước thủ công sau:

1.  **Khâu tiếp nhận và phân loại hàng hóa tại kho:** Hàng hóa sau khi gom về kho sẽ được nhân viên đọc địa chỉ trên từng gói hàng bằng mắt thường, sau đó sắp xếp thủ công vào từng khu vực tương ứng với từng tài xế. Quy trình này tốn nhiều thời gian, dễ gây nhầm lẫn và phụ thuộc nhiều vào kinh nghiệm thuộc đường của nhân viên kho.
2.  **Khâu lập lộ trình giao hàng:** Tài xế tự sắp xếp thứ tự các điểm dừng theo thói quen cá nhân. Việc này khiến cho quãng đường di chuyển không được tối ưu, dễ dẫn đến tình trạng hai tài xế chạy chồng chéo trên cùng một tuyến đường, hoặc tài xế không kịp giao hàng đúng khung giờ đã hẹn trước với khách hàng.
3.  **Khâu giám sát và theo dõi tiến độ:** Quản lý bưu cục không có công cụ trực quan để biết chính xác tài xế đang ở vị trí nào ngoài đường. Việc cập nhật tiến độ giao hàng chủ yếu qua điện thoại hoặc báo cáo giấy vào cuối ngày, dẫn đến việc xử lý các sự cố phát sinh (như hư xe, khách vắng nhà, tắc đường) bị chậm trễ.

### 2.1.2. Đánh giá ưu điểm và hạn chế của hiện trạng

- **Ưu điểm:** Quy trình đơn giản, không đòi hỏi chi phí đầu tư ban đầu vào hệ thống công nghệ thông tin phức tạp.
- **Hạn chế:**
    - Chi phí nhiên liệu và chi phí nhân công cao do quãng đường di chuyển bị lãng phí.
    - Năng suất giao hàng thấp, giới hạn số lượng đơn hàng một tài xế có thể xử lý trong ngày.
    - Tỷ lệ giao hàng thất bại cao do không quản lý được khung giờ hẹn của khách hàng.
    - Trải nghiệm của khách hàng chưa tốt do không theo dõi được vị trí thực tế của đơn hàng.

## 2.2. Phân tích các đối tượng sử dụng hệ thống

Hệ thống được thiết kế để phục vụ 4 nhóm đối tượng người dùng chính:

### 2.2.1. Quản trị viên hệ thống (Admin)

Quản trị viên là người nắm quyền cao nhất trong hệ thống, chịu trách nhiệm quản lý toàn bộ tài khoản và cấu hình các thông số vận hành:

- **Quản lý người dùng:** Thêm mới, sửa đổi, khóa hoặc cấp quyền cho các tài khoản Quản lý kho, Nhân viên điều phối và Tài xế.
- **Quản lý danh sách khách hàng:** Xem lịch sử đặt đơn, theo dõi tỷ lệ giao hàng thành công hoặc đánh dấu các tài khoản khách hàng vi phạm.
- **Cấu hình tham số Trí tuệ Nhân tạo:** Điều chỉnh các thông số toán học phục vụ việc tự động chia đơn và tối ưu đường đi:
    - _Bán kính phân cụm đơn hàng:_ Khoảng cách tối đa (ví dụ 2 km hoặc 5 km) để hệ thống tự động gom các đơn hàng gần nhau vào cùng một vùng giao.
    - _Kích thước quần thể:_ Số lượng phương án đường đi được khởi tạo đồng thời để thuật toán chọn lọc.
    - _Số thế hệ tối đa:_ Số lần lặp lại quá trình tìm kiếm đường đi tối ưu.
    - _Tỷ lệ lai ghép và tỷ lệ đột biến:_ Tỷ lệ trao đổi và thay đổi ngẫu nhiên thứ tự các điểm giao để tìm ra đường đi ngắn nhất.
- **Cấu hình hạ tầng:** Điều chỉnh chu kỳ gửi tọa độ định vị từ ứng dụng di động của tài xế về máy chủ (ví dụ 3 giây hoặc 5 giây một lần) và quản lý mã kết nối dịch vụ bản đồ số.
- **Báo cáo thống kê:** Xem biểu đồ tổng quan về doanh thu, hiệu suất làm việc của đội ngũ tài xế và tỷ lệ đơn hàng hoàn tất.

### 2.2.2. Nhân viên điều phối và quản lý kho (Staff)

Nhân viên là người trực tiếp vận hành quy trình giao nhận hàng ngày tại bưu cục:

- **Quản lý đơn hàng:** Tiếp nhận đơn từ khách hàng, nhập kho, xuất kho và cập nhật trạng thái đơn hàng.
- **Kích hoạt tự động phân tuyến:** Thực hiện thao tác bấm lệnh để hệ thống tự động gom cụm đơn hàng và lập lộ trình di chuyển tối ưu cho tất cả tài xế trong ca làm việc.
- **Giám sát thời gian thực:** Theo dõi bản đồ trung tâm điều phối để biết vị trí thực tế của từng tài xế và tiến độ hạ các cờ hiệu điểm giao hàng.
- **Điều phối và xử lý sự cố:** Can thiệp thủ công khi có sự cố phát sinh ngoài thực địa (chuyển đơn sang cho tài xế khác, hủy chuyến hoặc điều chỉnh lại thứ tự giao).

### 2.2.3. Khách hàng / Chủ hàng (Customer)

Khách hàng bao gồm cả người gửi hàng và người nhận hàng:

- **Người gửi hàng:** Tạo đơn hàng mới, in mã mã vạch/mã phản hồi nhanh (QR Code) dán lên gói hàng, đặt lịch hẹn yêu cầu tài xế đến lấy hàng tận nơi.
- **Người nhận hàng:** Tra cứu hành trình đơn hàng bằng mã vận đơn, theo dõi vị trí di chuyển thực tế của tài xế trên bản đồ số khi đơn hàng chuyển sang trạng thái đang đi giao.

### 2.2.4. Tài xế giao hàng (Shipper)

Tài xế là người trực tiếp di chuyển ngoài thực địa để lấy hàng và giao hàng:

- **Nhận ca và lộ trình:** Xem danh sách các đơn hàng cần giao được sắp xếp sẵn theo thứ tự di chuyển ngắn nhất.
- **Sử dụng bản đồ điều hướng:** Bản đồ tự động vạch tuyến đường đi ngắn nhất từ vị trí hiện tại đến điểm giao tiếp theo.
- **Cập nhật trạng thái đơn hàng:** Quét mã vạch/mã phản hồi nhanh trên gói hàng để xác nhận đã lấy hàng hoặc đã giao hàng thành công (có chụp ảnh minh chứng và lưu vị trí tọa độ lúc ký nhận).

## 2.3. Phân tích yêu cầu chức năng và Biểu đồ Use Case

### 2.3.1. Sơ đồ Use Case tổng quan của hệ thống

Sơ đồ bên dưới mô tả mối quan hệ giữa 4 nhóm tác nhân với các chức năng chính của hệ thống Smart Logistics Platform:

Hình . Sơ đồ Use Case tổng quan của hệ thống

### 2.3.2. Phân rã chức năng theo từng phân hệ

a. Phân hệ Quản trị và Cấu hình (Dành cho Quản trị viên)

- **Chức năng Quản lý Tài khoản:** Tạo mới, chỉnh sửa, cấp quyền hạn hoặc khóa tài khoản của Nhân viên và Tài xế.
- **Chức năng Cấu hình Thuật toán:** Cho phép tùy chỉnh bán kính phân cụm địa lý, các chỉ số chọn lọc di truyền (kích thước quần thể, số thế hệ lặp, tỷ lệ đột biến).
- **Chức năng Cấu hình Đồng bộ Định vị:** Thiết lập khoảng thời gian (3 giây, 5 giây) để máy chủ nhận tọa độ định vị từ ứng dụng tài xế.

b. Phân hệ Điều phối và Giám sát Kho (Dành cho Nhân viên)

- **Chức năng Quản lý Đơn hàng:** Tiếp nhận đơn, phân loại đơn, thay đổi trạng thái nhập kho/xuất kho.
- **Chức năng Lập lộ trình tự động:** Gửi dữ liệu đơn hàng sang bộ giải thuật toán để tự động chia đơn và sắp xếp chuỗi điểm dừng ngắn nhất cho tài xế.
- **Chức năng Giám sát Bản đồ Trung tâm:** Hiển thị vị trí thực của tất cả tài xế và trạng thái hoàn thành từng điểm giao dưới dạng các cờ hiệu trên bản đồ số.

c. Phân hệ Ứng dụng Di động (Dành cho Tài xế)

- **Chức năng Xem Danh sách Chuyến đi:** Hiển thị thứ tự các đơn hàng từ điểm số 1 đến điểm số N đã được tối ưu.
- **Chức năng Bản đồ Điều hướng:** Chỉ đường từng chặng từ vị trí hiện tại của tài xế tới nhà khách hàng.
- **Chức năng Xử lý Đơn hàng:** Quét mã phản hồi nhanh (QR Code) bằng máy ảnh điện thoại, chụp ảnh xác thực giao hàng thành công hoặc ghi nhận lý do giao thất bại.

d. Phân hệ Tra cứu và Đặt hàng (Dành cho Khách hàng)

- **Chức năng Tạo Đơn:** Nhập thông tin người gửi, người nhận, kích thước/trọng lượng hàng hóa và khung giờ hẹn giao.
- **Chức năng Theo dõi Thực tế:** Xem trực tiếp xe của tài xế đang di chuyển trên bản đồ khi tài xế chuẩn bị đến giao hàng.

### 2.3.3. Mô tả chi tiết kịch bản sử dụng (Use Case Specification)

Dưới đây là kịch bản chi tiết cho 2 chức năng quan trọng nhất của hệ thống:

**Kịch bản 1**: Kích hoạt Tối ưu và Lập lộ trình giao hàng tự động

- **Tên chức năng:** Kích hoạt Tối ưu và Lập lộ trình giao hàng tự động.
- **Tác nhân thực hiện:** Nhân viên điều phối (Staff).
- **Mô tả ngắn:** Nhân viên bấm nút kích hoạt trên giao diện quản trị để hệ thống gom cụm các đơn hàng đang có trong kho và tìm đường đi ngắn nhất cho đội ngũ tài xế.
- **Điều kiện tiên quyết:** Nhân viên đã đăng nhập thành công vào hệ thống; kho có các đơn hàng ở trạng thái "Chờ giao".
- **Luồng sự kiện chính:**
    1.  Nhân viên truy cập vào màn hình "Điều phối giao hàng" và chọn bưu cục cần xử lý.
    2.  Nhân viên bấm nút **"Tối ưu hóa tuyến đường"**.
    3.  Máy chủ tiếp nhận yêu cầu, chuyển đổi địa chỉ các đơn hàng thành tọa độ địa lý.
    4.  Hệ thống chạy thuật toán gom cụm để phân chia các đơn hàng vào vùng quản lý của từng tài xế dựa trên bán kính cấu hình.
    5.  Thuật toán tiến hóa di truyền tính toán chuỗi lộ trình thỏa mãn cả tải trọng xe và khung giờ hẹn của khách hàng.
    6.  Hệ thống lưu kết quả lộ trình vào cơ sở dữ liệu và hiển thị chuỗi cờ hiệu tuyến đường trên bản đồ trực quan của nhân viên.
    7.  Hệ thống tự động gửi thông báo ca làm việc mới tới ứng dụng di động của các tài xế liên quan.
- **Ngoại lệ:**
    1.  Nếu địa chỉ đơn hàng không xác định được tọa độ: Hệ thống sẽ đánh dấu đơn hàng "Lỗi địa chỉ" và thông báo cho nhân viên chỉnh sửa thủ công.
    2.  Nếu tổng số đơn vượt quá khả năng chở của đội xe hiện tại: Hệ thống sẽ cảnh báo các đơn hàng chưa xếp được lịch và đề xuất thêm tài xế.

**Kịch bản 2**: Cập nhật Tọa độ Định vị và Giám sát Thời gian thực

- **Tên chức năng:** Cập nhật Tọa độ Định vị và Giám sát Thời gian thực.
- **Tác nhân thực hiện:** Tài xế giao hàng (Shipper) và Hệ thống.
- **Mô tả ngắn:** Ứng dụng di động của tài xế tự động gửi tọa độ vị trí thực tế về máy chủ để hiển thị lên bản đồ trung tâm điều hành.
- **Điều kiện tiên quyết:** Tài xế đã bật ứng dụng di động, cho phép truy cập vị trí và đang trong ca làm việc.
- **Luồng sự kiện chính:**
    1.  Sau mỗi khoảng thời gian cấu hình (3 giây), ứng dụng di động tự động lấy tọa độ định vị toàn cầu của thiết bị.
    2.  Ứng dụng gửi luồng dữ liệu tọa độ về máy chủ thông qua kênh kết nối mạng liên tục.
    3.  Máy chủ tiếp nhận dữ liệu và lưu ngay vào bộ nhớ đệm tạm thời (bộ nhớ truy xuất nhanh) để tránh gây chậm cơ sở dữ liệu chính.
    4.  Máy chủ lập tức phát tín hiệu tọa độ mới tới màn hình bản đồ trung tâm điều hành của nhân viên đang theo dõi tài xế đó.
    5.  Biểu tượng xe của tài xế trên bản đồ tự động di chuyển mượt mà đến vị trí mới.
- **Ngoại lệ:** Nếu điện thoại tài xế mất kết nối mạng, ứng dụng sẽ tự động lưu tạm các tọa độ vào bộ nhớ trong của máy và đồng bộ lại toàn bộ khi có mạng trở lại.

## 2.4. Yêu cầu phi chức năng và Yêu cầu chất lượng hệ thống

### 2.4.1. Yêu cầu về hiệu năng và tốc độ xử lý

- **Tốc độ tính toán lộ trình:** Thời gian để thuật toán phân cụm và tìm đường đi tối ưu cho 100 đơn hàng không được vượt quá 10 giây.
- **Tốc độ cập nhật vị trí:** Độ trễ từ lúc điện thoại tài xế gửi tọa độ đến khi bản đồ trung tâm hiển thị biểu tượng di chuyển không vượt quá 2 giây.
- **Thời gian phản hồi giao diện:** Các thao tác tra cứu, tải danh sách đơn hàng phải phản hồi dưới 1 giây.

### 2.4.2. Yêu cầu về độ tin cậy và tính sẵn sàng

- **Hoạt động liên tục:** Hệ thống phải đảm bảo hoạt động ổn định 24/7 với độ sẵn sàng đạt 99.9%.
- **Xử lý sự cố kết nối:** Khi bị mất kết nối mạng đột ngột, ứng dụng di động không được làm mất dữ liệu trạng thái đơn hàng hoặc tọa độ định vị của tài xế.

### 2.4.3. Yêu cầu về bảo mật và phân quyền

- **Xác thực người dùng:** Tất cả các truy cập vào hệ thống phải thông qua cơ chế mã hóa xác thực an toàn (sử dụng chuỗi mã xác thực kèm thời hạn).
- **Phân quyền dữ liệu:**
    - Tài xế chỉ được xem danh sách đơn hàng và thông tin khách hàng thuộc chuyến đi của mình.
    - Nhân viên chỉ được thao tác trong phạm vi bưu cục mình quản lý.
    - Thông tin cá nhân và số điện thoại của khách hàng phải được bảo mật, tránh rò rỉ ra bên ngoài.

# CHƯƠNG 3: THIẾT KẾ HỆ THỐNG

## 3.1. Thiết kế Kiến trúc Hệ thống Tổng quan (System Architecture)

### 3.1.1. Mô tả tổng quan về kiến trúc

Hệ thống Nền tảng Logistics Thông minh được thiết kế theo Mô hình Kiến trúc Hướng Sự kiện (Event-Driven Architecture) tích hợp với Mô hình Khối Chức năng Độc lập (Modular Architecture). Kiến trúc này giúp hệ thống đáp ứng tốt khả năng mở rộng, đảm bảo tính sẵn sàng cao và xử lý mượt mà luồng dữ liệu định vị toàn cầu (GPS) tần suất cao từ hàng trăm tài xế di chuyển đồng thời ngoài thực địa mà không gây nghẽn hệ thống.

Kiến trúc tổng quan được chia thành 4 tầng xử lý chính:

1.  **Tầng Giao diện Người dùng (Client Layer):** Bao gồm Ứng dụng Web dành cho Quản trị viên/Nhân viên điều phối và Ứng dụng Di động dành cho Tài xế giao hàng.
2.  **Tầng Xử lý Nghiệp vụ & Cổng API (Backend API & Business Layer):** Tiếp nhận các yêu cầu REST API, quản lý quy trình nghiệp vụ, xác thực phân quyền, duy trì kết nối truyền dữ liệu thời gian thực và xử lý thuật toán tối ưu.
3.  **Tầng Dữ liệu & Bộ nhớ đệm (Data & Cache Layer):** Lưu trữ toàn bộ dữ liệu quan hệ, dữ liệu địa lý hình học không gian và bộ nhớ tạm thời cho luồng định vị.
4.  **Tầng Hạ tầng & Đóng gói Container (Infrastructure Layer):** Đóng gói và vận hành máy chủ cơ sở dữ liệu trên hạ tầng ảo hóa.

### 3.1.2. Sơ đồ Kiến trúc hệ thống

Hình . Sơ đồ kiến trúc hệ thống tổng quan

### 3.1.3. Mô tả nhiệm vụ chi tiết của các thành phần trong kiến trúc

**Bảng 3.1: Mô tả nhiệm vụ chi tiết của các thành phần trong kiến trúc**

Bảng . Mô tả nhiệm vụ chi tiết của các thành phần trong kiến trúc

|     |     |     |     |
| --- | --- | --- | --- |
| **Tầng Kiến trúc** | **Tên Thành phần** | **Công nghệ Sử dụng** | **Vai trò & Nhiệm vụ Chi tiết** |
| **Tầng Giao diện** | Ứng dụng Web Điều hành | React.js, TypeScript, Vite, TailwindCSS | Cung cấp giao diện Trung tâm Điều hành trực quan cho Quản trị viên và Nhân viên. Hiển thị bản đồ giám sát tài xế, quản lý đơn hàng, và kích hoạt lệnh tối ưu lộ trình. |
|     | Ứng dụng Di động Tài xế | Flutter / React Native | Chạy trên thiết bị di động của tài xế. Tự động thu thập tọa độ định vị toàn cầu ngầm (Background GPS), hiển thị danh sách đơn hàng đã tối ưu, bản đồ dẫn đường và quét mã QR Code ký nhận. |
| **Tầng Nghiệp vụ** | Máy chủ Cổng API Chính | Node.js, Express.js, TypeScript | Đóng vai trò làm trung tâm tiếp nhận tất cả các yêu cầu từ giao diện. Thực hiện xác thực phân quyền, quản lý quy trình nhập/xuất kho, gọi giao diện kết nối cơ sở dữ liệu. |
|     | Máy chủ Thời gian thực | Socket.io Server | Quản lý các kênh kết nối mạng song công (Full-duplex WebSockets). Tiếp nhận luồng định vị từ tài xế và phát sóng tức thì tới màn hình quản trị mà không cần tải lại trang. |
|     | Bộ giải Toán AI | Python, Google OR-Tools | Chạy độc lập để thực hiện 2 công đoạn tính toán nặng: Gom cụm các đơn hàng gần nhau theo bán kính (Clustering) và Giải bài toán tối ưu lộ trình đa ràng buộc (CVRP & VRPTW). |
| **Tầng Dữ liệu** | Cơ sở Dữ liệu Chính | PostgreSQL 15 tích hợp mở rộng PostGIS | Lưu trữ lâu dài 38 bảng dữ liệu quan hệ (Khách hàng, Đơn hàng, Chuyến xe, Tài xế). Mở rộng PostGIS hỗ trợ tính toán khoảng cách và chỉ mục dữ liệu không gian. |
|     | Bộ nhớ đệm Truy xuất Nhanh | Redis 7 (In-Memory Database) | Lưu trữ tạm thời tọa độ định vị mới nhất của tài xế với tốc độ truy xuất cực nhanh (< 1 ms), giúp triệt tiêu tình trạng nghẽn ghi đĩa trên cơ sở dữ liệu chính. |
| **Tầng Hạ tầng** | Hạ tầng Container | Docker & Docker Compose | Đóng gói toàn bộ bộ máy Cơ sở dữ liệu PostgreSQL (PostGIS) và Bộ nhớ đệm Redis thành các container độc lập, đảm bảo hệ thống chạy ổn định trên mọi môi trường. |

## 3.2. Sơ đồ Phân rã Chức năng (Business Function Diagram - BFD)

### 3.2.1. Mô tả tổng quan sơ đồ phân rã

Sơ đồ Phân rã Chức năng (BFD) thể hiện cấu trúc cây phân cấp toàn bộ các chức năng từ mức tổng quan đến các chức năng tiểu mục chi tiết của hệ thống Smart Logistics Platform. Hệ thống bao gồm 5 Phân hệ Chức năng Chính được chia nhỏ thành 16 Chức năng Con.

### 3.2.2. Sơ đồ Phân rã Chức năng

Hình . Sơ đồ phân rã chức năng tổng quan

### 3.2.3. Mô tả chi tiết các phân hệ chức năng

Bảng . Mô tả chi tiết các phân hệ trong sơ đồ phân rã chức năng (BFD)

|     |     |     |     |
| --- | --- | --- | --- |
| **STT** | **Phân hệ Chức năng Chính** | **Tên Chức năng Con** | **Nội dung Mô tả Chi tiết** |
| **1** | **Quản trị & Cấu hình** | 1.1 Quản lý Người dùng & Phân quyền | Thêm mới, chỉnh sửa thông tin, khóa tài khoản và phân cấp quyền sử dụng cho Nhân viên, Tài xế. |
| 1.2 Quản lý Danh sách Khách hàng | Theo dõi danh sách khách hàng, lịch sử đặt đơn và tỷ lệ giao hàng thành công/thất bại. |
| 1.3 Cấu hình Tham số Thuật toán AI | Điều chỉnh bán kính phân cụm đơn hàng, kích thước quần thể, tỷ lệ lai ghép và tỷ lệ đột biến di truyền. |
| 1.4 Cấu hình Chu kỳ Định vị GPS | Cấu hình thời gian giãn cách giữa các lần gửi tọa độ từ ứng dụng di động về máy chủ (3s - 5s). |
| 1.5 Xem Báo cáo Thống kê Tổng quan | Cung cấp biểu đồ thống kê doanh thu, số lượng đơn hàng hoàn tất và hiệu suất làm việc của tài xế. |
| **2** | **Quản lý Đơn & Kho** | 2.1 Tiếp nhận & Quản lý Đơn hàng | Tiếp nhận đơn từ người gửi, quản lý danh sách đơn hàng và trạng thái hiện tại (Chờ giao, Đang giao, Đã hoàn tất). |
| 2.2 Quản lý Nhập / Xuất kho | Quản lý lưu kho tại bưu cục trung chuyển, xác nhận hàng hóa sẵn sàng xuất kho để đi giao. |
| 2.3 Tạo Đơn & In Mã QR Code | Tạo đơn hàng mới lẻ/hàng loạt và tự động sinh mã QR Code tương ứng dán lên gói hàng. |
| **3** | **Tối ưu Phân tuyến** | 3.1 Chuyển đổi Địa chỉ thành Tọa độ | Tự động chuyển đổi chuỗi địa chỉ văn bản thành kinh độ và vĩ độ địa lý thông qua dịch vụ bản đồ. |
| 3.2 Tự động Gom cụm Đơn hàng | Áp dụng thuật toán trí tuệ nhân tạo gom các đơn hàng rải rác gần nhau vào cùng một vùng giao của từng tài xế. |
| 3.3 Lập Lộ trình Tối ưu Đa ràng buộc | Tìm chuỗi điểm dừng ngắn nhất cho tài xế, thỏa mãn đồng thời tải trọng của xe và khung giờ hẹn của khách hàng. |
| **4** | **Điều hành & Giám sát** | 4.1 Bản đồ Giám sát Trung tâm | Hiển thị giao diện bản đồ trực quan theo dõi vị trí của tất cả tài xế và các cờ hiệu điểm giao hàng. |
| 4.2 Đồng bộ & Phát sóng Tọa độ | Tiếp nhận tọa độ từ ứng dụng di động, lưu vào bộ nhớ đệm Redis và phát sóng tức thì lên bản đồ điều phối. |
| 4.3 Điều phối & Xử lý Sự cố | Cho phép nhân viên điều phối can thiệp chuyển đơn thủ công cho tài xế khác khi có sự cố phát sinh ngoài thực địa. |
| **5** | **Ứng dụng Di động** | 5.1 Tiếp nhận Ca & Lộ trình | Tài xế đăng nhập ứng dụng di động để xem danh sách các đơn hàng và lộ trình di chuyển đã được tối ưu. |
| 5.2 Bản đồ Điều hướng Dẫn đường | Tích hợp bản đồ chỉ đường từ vị trí hiện tại của tài xế đến nhà của khách hàng. |
| 5.3 Quét QR & Xác nhận Giao hàng | Quét mã QR trên gói hàng để chuyển trạng thái đơn, chụp ảnh minh chứng và ghi nhận tọa độ lúc ký nhận. |

## 3.3. Sơ đồ Dòng Dữ liệu (Data Flow Diagram - DFD)

### 3.3.1. Mô hình DFD Mức ngữ cảnh (Mức 0)

Sơ đồ DFD Mức ngữ cảnh thể hiện cái nhìn tổng thể về phạm vi hệ thống, xác định 4 tác nhân ngoài tác động và các luồng dữ liệu vào/ra chính của hệ thống Smart Logistics Platform.

Hình . Sơ đồ Dòng Dữ liệu Mức ngữ cảnh (DFD Mức 0)

Bảng . Mô tả chi tiết các luồng dữ liệu trong Sơ đồ DFD Mức ngữ cảnh (Mức 0)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **STT** | **Tác nhân Nguồn** | **Tác nhân Đích** | **Tên Luồng Dữ liệu** | **Nội dung Dữ liệu Trao đổi Chi tiết** |
| **1** | Quản trị viên | Hệ thống | Tham số cấu hình | Thông tin tài khoản mới, phân quyền sử dụng, bán kính phân cụm đơn hàng, chỉ số di truyền và chu kỳ gửi GPS. |
| **2** | Hệ thống | Quản trị viên | Báo cáo thống kê | Biểu đồ tổng quan doanh thu, số đơn hoàn thành, tỷ lệ giao trễ và nhật ký hệ thống. |
| **3** | Nhân viên điều phối | Hệ thống | Yêu cầu nghiệp vụ kho | Thông tin đơn hàng nhập kho, yêu cầu xuất kho và Lệnh kích hoạt phân tuyến tự động. |
| **4** | Hệ thống | Nhân viên điều phối | Dữ liệu điều phối | Danh sách đơn hàng tại bưu cục và giao diện bản đồ trực quan hiển thị vị trí thực của tài xế. |
| **5** | Khách hàng | Hệ thống | Yêu cầu đặt đơn & Tra cứu | Thông tin người gửi, người nhận, kích thước/trọng lượng gói hàng, mã vận đơn cần tra cứu. |
| **6** | Hệ thống | Khách hàng | Kết quả tra cứu | Mã QR vận đơn, trạng thái xử lý đơn hàng và vị trí di chuyển thực của tài xế khi đơn đang giao. |
| **7** | Tài xế giao hàng | Hệ thống | Dữ liệu thực địa | Luồng tọa độ kinh độ/vĩ độ định vị (3 giây/lần), mã QR xác nhận và ảnh chụp bằng chứng giao hàng. |
| **8** | Hệ thống | Tài xế giao hàng | Thông tin lộ trình | Chuỗi các điểm giao hàng đã xếp thứ tự tối ưu và bản đồ điều hướng đường đi. |

### 3.3.2. Mô hình DFD Mức 1 (Phân rã chi tiết)

Sơ đồ DFD Mức 1 phân rã Hệ thống trung tâm thành 5 Tiến trình Xử lý Chính kết hợp với 4 Kho Dữ liệu Lưu trữ.

Hình . Sơ đồ Dòng Dữ liệu Mức 1

Bảng . Mô tả chi tiết các tiến trình xử lý trong Sơ đồ DFD Mức 1

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Tiến trình** | **Tiến trình Xử lý** | **Dữ liệu Đầu vào** | **Dữ liệu Đầu ra** | **Kho Dữ liệu Tương tác** |
| **1.0** | Quản lý Người dùng & Cấu hình | Yêu cầu cấp quyền, tham số cấu hình AI/GPS từ Quản trị viên. | Thông báo tạo tài khoản thành công, thiết lập tham số hệ thống. | **D1: Người dùng & Phân quyền** |
| **2.0** | Quản lý Đơn hàng & Kho Bãi | Thông tin đặt đơn từ Khách hàng; Lệnh nhập/xuất kho từ Nhân viên. | Mã vạch/QR Code vận đơn, danh sách đơn hàng đã phân loại theo kho. | **D2: Đơn hàng & Vận đơn** |
| **3.0** | Xử lý Tối ưu & Lập Lộ trình | Lệnh tối ưu từ Nhân viên; Danh sách đơn hàng từ D2; Tải trọng xe. | Chuỗi lộ trình di chuyển tối ưu thỏa mãn tải trọng và giờ hẹn. | Đọc từ **D2**, Ghi vào **D3: Lộ trình & Chuyến xe** |
| **4.0** | Định vị & Giám sát Realtime | Luồng tọa độ GPS từ ứng dụng di động của Tài xế gửi về. | Dữ liệu vị trí phát sóng lên màn hình bản đồ của Nhân viên và Khách hàng. | Ghi/Đọc từ **D4: Bộ nhớ đệm Tọa độ GPS** |
| **5.0** | Quản lý Ca & Ký nhận Giao hàng | Ảnh xác thực, mã QR quét từ Tài xế khi đến nhà khách hàng. | Trạng thái đơn hàng chuyển sang "Giao thành công" hoặc "Giao thất bại". | Đọc từ **D3**, Cập nhật vào **D2: Đơn hàng & Vận đơn** |

## 3.4. Sơ đồ Tuần tự cho các Luồng Nghiệp vụ Chính (Sequence Diagram)

### 3.4.1. Luồng 1: Kích hoạt Tối ưu hóa và Lập lộ trình giao hàng tự động

Mô tả luồng xử lý khi Nhân viên bấm nút "Tối ưu hóa" trên giao diện Web: Máy chủ API truy vấn đơn hàng, gửi dữ liệu sang Bộ giải toán AI (Python), cập nhật lộ trình vào Cơ sở dữ liệu và gửi thông báo tới ứng dụng của Tài xế.

Hình . Sơ đồ Tuần tự luồng Kích hoạt Tối ưu và Lập lộ trình giao hàng

### 3.4.2. Luồng 2: Cập nhật Tọa độ Định vị và Giám sát Thời gian thực

Mô tả luồng xử lý luồng tọa độ GPS từ điện thoại tài xế gửi về máy chủ mỗi 3 giây: Tọa độ được ghi trực tiếp vào Bộ nhớ đệm Redis để tránh nghẽn đĩa, sau đó phát sóng tức thì lên màn hình Trung tâm Điều hành của Nhân viên.

Hình . Sơ đồ Tuần tự luồng Cập nhật Tọa độ Định vị và Giám sát Thời gian thực

## 3.5. Thiết kế Cơ sở Dữ liệu

### 3.5.1. Mô hình Quan hệ Thực thể (ERD - Entity Relationship Diagram)

a. Mô tả tổng quan về mô hình thực thể

Cơ sở dữ liệu của hệ thống Smart Logistics Platform được thiết kế theo chuẩn hóa Form 3NF (Third Normal Form) nhằm đảm bảo tính toàn vẹn dữ liệu, triệt tiêu sự dư thừa thông tin và tối ưu hóa cho các truy vấn địa lý không gian.

Hệ thống bao gồm **9 Phân hệ Thực thể Cốt lõi**:

1.  **Phân hệ Xác thực & Phân quyền:** Quản lý tài khoản người dùng, vai trò và bảng phân quyền chi tiết.
2.  **Phân hệ Khách hàng & Địa chỉ:** Lưu trữ thông tin người gửi/người nhận và danh bạ địa chỉ kèm tọa độ định vị toàn cầu (Kinh độ/Vĩ độ).
3.  **Phân hệ Mạng lưới Bưu cục & Kho bãi:** Quản lý sơ đồ cây phân cấp bưu cục (Kho tổng, Bưu cục quận/huyện) và các phân khu kho (Khu nhận, Khu phân loại, Khu xuất hàng).
4.  **Phân hệ Dịch vụ & Đơn hàng:** Lưu trữ thông tin chi tiết gói hàng, kích thước, khối lượng, cước phí và lịch hẹn lấy hàng.
5.  **Phân hệ Quản lý Vận đơn:** Quản lý mã vận đơn, danh sách kiện hàng gom trong vận đơn và nhật ký luân chuyển hàng giữa các bưu cục.
6.  **Phân hệ Đội xe & Tài xế:** Quản lý danh sách phương tiện (xe tải, xe máy), thông tin tài xế, bằng lái và lịch phân công tài xế điều khiển phương tiện.
7.  **Phân hệ Điều hành & Tối ưu Lộ trình:** Lưu trữ lộ trình di chuyển tối ưu do bộ giải toán Trí tuệ Nhân tạo (AI Engine) khởi tạo, thứ tự các điểm dừng và nhật ký điều chỉnh sự cố.
8.  **Phân hệ Theo dõi, Mã vạch & Ký nhận:** Lưu vết hành trình đơn hàng, nhật ký quét mã vạch/mã QR Code và chứng từ giao hàng thành công (ảnh chụp, chữ ký điện tử).
9.  **Phân hệ Cấu hình Hệ thống & Đơn vị Hành chính:** Lưu cấu hình các chỉ số di truyền AI, chu kỳ GPS và danh mục 63 tỉnh/thành phố, quận/huyện, phường/xã Việt Nam.

b. Sơ đồ Quan hệ Thực thể Tổng quan (ERD Diagram)

Hình . Mô hình Quan hệ Thực thể Tổng quan

### 3.5.2. Sơ đồ Quan hệ Bảng (Database Diagram)

Mô hình Cơ sở Dữ liệu thể hiện mối liên kết chặt chẽ giữa các bảng thông qua Khóa chính (Primary Key - PK) và Khóa ngoại (Foreign Key - FK), đồng thời tích hợp các Chỉ mục Không gian (Spatial Indexing) để hỗ trợ truy vấn địa lý tốc độ cao:

1.  **Khóa Chính (PK):** Đều sử dụng kiểu dữ liệu định danh duy nhất toàn cầu UUID (Universally Unique Identifier) giúp tránh xung đột dữ liệu khi phân tán máy chủ.
2.  **Khóa Ngoại (FK) & Ràng buộc Toàn vẹn:** Được cấu hình các chính sách ON DELETE RESTRICT (ngăn xóa dữ liệu đang được tham chiếu) hoặc ON DELETE CASCADE (xóa nối tiếp dữ liệu con khi dữ liệu cha bị xóa).
3.  **Tối ưu hóa Chỉ mục (Indexing Strategy):**
    - **Chỉ mục B-Tree:** Đánh trên các trường tìm kiếm thường xuyên như status (trạng thái đơn), order_code (mã vận đơn), phone, email.
    - **Chỉ mục Không gian PostGIS (GiST Index):** Đánh trực tiếp trên cặp tọa độ (latitude, longitude) của Bưu cục, Điểm giao hàng và Vị trí tài xế, giúp tìm kiếm các điểm dừng gần nhất (KNN) đạt tốc độ truy xuất dưới 1ms.

### 3.5.3. Cấu trúc các bảng dữ liệu chi tiết

Dưới đây là bản mô tả chi tiết các bảng dữ liệu trọng tâm nhất đại diện cho 9 phân hệ của hệ thống Smart Logistics Platform:

**PHÂN HỆ 1: XÁC THỰC VÀ PHÂN QUYỀN (AUTHENTICATION & AUTHORIZATION)**

_Mô tả: Lưu trữ thông tin tài khoản đăng nhập chung của hệ thống._

Bảng . Cấu trúc bảng users (Tài khoản Người dùng)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh duy nhất của tài khoản. |
| username | VARCHAR(50) | **UK** | Không | Tên đăng nhập vào hệ thống. |
| password_hash | TEXT | \-  | Không | Mật khẩu đã mã hóa an toàn (Bcrypt). |
| status | ENUM | \-  | Không | Trạng thái tài khoản (ACTIVE, LOCKED, DISABLED). |
| role_id | UUID | **FK** | Không | Vai trò được gán (Tham chiếu roles.id). |
| created_at | TIMESTAMPTZ | \-  | Không | Thời điểm khởi tạo tài khoản. |

_Mô tả: Lưu danh mục các vai trò người dùng (Admin, Manager, Staff, Driver, Customer)._

Bảng . Cấu trúc bảng roles (Danh mục Vai trò)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh duy nhất của vai trò. |
| role_code | VARCHAR(30) | **UK** | Không | Mã ký hiệu vai trò (VD: ROLE_ADMIN, ROLE_DRIVER). |
| role_name | VARCHAR(100) | \-  | Không | Tên hiển thị đầy đủ của vai trò. |
| created_at | TIMESTAMPTZ | \-  | Không | Thời điểm tạo vai trò. |

_Mô tả: Lưu danh mục tất cả các quyền thao tác chi tiết trên hệ thống._

Bảng . Cấu trúc bảng permissions (Danh mục Quyền hạn)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh duy nhất của quyền. |
| permission_code | VARCHAR(50) | **UK** | Không | Mã quyền hạn (VD: ORDER_CREATE, ROUTE_OPTIMIZE). |
| permission_name | VARCHAR(100) | \-  | Không | Tên mô tả chi tiết của quyền hạn. |
| created_at | TIMESTAMPTZ | \-  | Không | Thời điểm khởi tạo quyền. |

_Mô tả: Bảng trung gian nối giữa Vai trò và Quyền hạn._

Bảng . Cấu trúc bảng role_permissions (Phân quyền Vai trò)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| role_id | UUID | **PK, FK** | Không | Mã vai trò (Tham chiếu roles.id). |
| permission_id | UUID | **PK, FK** | Không | Mã quyền hạn (Tham chiếu permissions.id). |

**PHÂN HỆ 2: KHÁCH HÀNG VÀ ĐỊA CHỈ (CUSTOMERS & ADDRESSES)**

_Mô tả: Lưu thông tin chi tiết của khách hàng cá nhân hoặc doanh nghiệp gửi hàng._

Bảng . Cấu trúc bảng customers (Thông tin Khách hàng)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh khách hàng. |
| user_id | UUID | **FK, UK** | Không | Tài khoản đăng nhập (Tham chiếu users.id). |
| customer_code | VARCHAR(30) | **UK** | Không | Mã quản lý khách hàng (VD: CUST_001). |
| full_name | VARCHAR(150) | \-  | Không | Họ và tên khách hàng hoặc Đại diện. |
| phone | VARCHAR(20) | \-  | Có  | Số điện thoại liên hệ. |
| email | VARCHAR(255) | Index | Có  | Thư điện tử của khách hàng. |
| customer_type | ENUM | \-  | Không | Loại khách hàng (INDIVIDUAL Cá nhân, BUSINESS Doanh nghiệp). |
| company_name | VARCHAR(255) | \-  | Có  | Tên công ty (nếu là khách hàng doanh nghiệp). |
| tax_code | VARCHAR(30) | \-  | Có  | Mã số thuế doanh nghiệp. |
| created_at | TIMESTAMPTZ | \-  | Không | Thời điểm tạo hồ sơ khách hàng. |

_Mô tả: Lưu chi tiết thông tin địa chỉ văn bản và tọa độ địa lý không gian (Kinh độ, Vĩ độ)._

Bảng . Cấu trúc bảng addresses (Danh bạ Địa chỉ & Tọa độ)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh địa chỉ. |
| address_line_1 | VARCHAR(255) | \-  | Không | Địa chỉ chi tiết (Số nhà, tên đường). |
| ward_code | VARCHAR(20) | **FK** | Có  | Mã Phường / Xã (Tham chiếu wards.code). |
| country | VARCHAR(100) | \-  | Không | Quốc gia (Mặc định: Vietnam). |
| place_id | VARCHAR(255) | \-  | Có  | Mã vị trí từ dịch vụ bản đồ số (Google/Goong Maps). |
| latitude | DOUBLE | Index | Không | Vĩ độ địa lý (Latitude). |
| longitude | DOUBLE | Index | Không | Kinh độ địa lý (Longitude). |
| created_at | TIMESTAMPTZ | \-  | Không | Thời điểm lưu địa chỉ. |

_Mô tả: Quản lý sổ địa chỉ riêng của từng khách hàng._

Bảng . Cấu trúc bảng customer_addresses (Địa chỉ Khách hàng)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh liên kết địa chỉ. |
| customer_id | UUID | **FK** | Không | Mã khách hàng (Tham chiếu customers.id). |
| address_id | UUID | **FK** | Không | Mã địa chỉ (Tham chiếu addresses.id). |
| address_type | ENUM | \-  | Không | Loại địa chỉ (HOME Nhà, OFFICE Văn phòng, WAREHOUSE Kho). |
| is_default | BOOLEAN | \-  | Không | Đánh dấu địa chỉ mặc định khi đặt đơn. |
| contact_name | VARCHAR(150) | \-  | Có  | Tên người đại diện nhận/gửi tại địa chỉ này. |
| contact_phone | VARCHAR(20) | \-  | Có  | Số điện thoại đại diện tại địa chỉ này. |
| created_at | TIMESTAMPTZ | \-  | Không | Thời điểm tạo liên kết địa chỉ. |

**PHÂN HỆ 3: MẠNG LƯỚI BƯU CỤC VÀ KHO BÃI (FACILITY NETWORK)**

_Mô tả: Phân loại cơ sở logistics (Kho tổng, Bưu cục phân loại, Trạm giao hàng)._

Bảng . Cấu trúc bảng facility_types (Loại hình Bưu cục)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh loại hình bưu cục. |
| type_code | VARCHAR(30) | **UK** | Không | Mã phân loại (VD: SORTING_HUB, DELIVERY_HUB). |
| type_name | VARCHAR(100) | \-  | Không | Tên hiển thị đầy đủ của loại bưu cục. |
| created_at | TIMESTAMPTZ | \-  | Không | Thời điểm tạo loại bưu cục. |

_Mô tả: Lưu danh sách bưu cục, tọa độ vị trí Hub và sơ đồ cây phân cấp kho._

Bảng . Cấu trúc bảng facilities (Mạng lưới Bưu cục Kho bãi)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh bưu cục. |
| facility_code | VARCHAR(30) | **UK** | Không | Mã bưu cục (VD: HUB_DISTRICT_1). |
| facility_name | VARCHAR(255) | \-  | Không | Tên đầy đủ của bưu cục / kho trung chuyển. |
| facility_type_id | UUID | **FK** | Không | Loại bưu cục (Tham chiếu facility_types.id). |
| parent_facility_id | UUID | **FK** | Có  | Bưu cục cấp trên quản lý trực tiếp. |
| manager_user_id | UUID | **FK** | Có  | Trưởng bưu cục / Quản lý kho (Tham chiếu users.id). |
| province_code | VARCHAR(20) | **FK** | Có  | Mã tỉnh/thành phố trực thuộc. |
| address_id | UUID | **FK** | Có  | Địa chỉ chi tiết bưu cục (Tham chiếu addresses.id). |
| operating_status | ENUM | Index | Không | Trạng thái bưu cục (ACTIVE, MAINTENANCE...). |
| opened_at | DATE | \-  | Không | Ngày chính thức đi vào hoạt động. |

_Mô tả: Quản lý các khu vực chi tiết bên trong kho bãi bưu cục._

Bảng . Cấu trúc bảng facility_zones (Phân khu Kho bãi)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh phân khu kho. |
| facility_id | UUID | **FK** | Không | Bưu cục chủ quản (Tham chiếu facilities.id). |
| zone_code | VARCHAR(30) | \-  | Không | Mã phân khu (VD: ZONE_A, RECEIVING_01). |
| zone_name | VARCHAR(100) | \-  | Không | Tên phân khu kho. |
| zone_type | ENUM | \-  | Không | Chức năng phân khu (RECEIVING, SORTING, SHIPPING...). |
| capacity | INT | \-  | Có  | Sức chứa tối đa số lượng gói hàng tại phân khu. |

**PHÂN HỆ 4: DỊCH VỤ VÀ ĐƠN HÀNG (ORDERS & SERVICES)**

_Mô tả: Quản lý các gói dịch vụ giao hàng, định mức cước phí nền và đơn giá._

Bảng . Cấu trúc bảng services (Bảng giá & Gói Dịch vụ)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh gói dịch vụ. |
| service_code | VARCHAR(30) | **UK** | Không | Mã dịch vụ (VD: EXPRESS_SAME_DAY, STANDARD). |
| service_name | VARCHAR(100) | \-  | Không | Tên hiển thị dịch vụ giao hàng. |
| base_price | DECIMAL(12,2) | \-  | Không | Cước phí nền cơ bản (VNĐ). |
| free_distance_km | FLOAT | \-  | Không | Khoảng cách được miễn phí theo phí nền (km). |
| price_per_km | DECIMAL(12,2) | \-  | Không | Đơn giá phát sinh trên mỗi km vượt định mức. |
| free_weight_kg | FLOAT | \-  | Không | Trọng lượng được miễn phí theo cước nền (kg). |
| price_per_kg | DECIMAL(12,2) | \-  | Không | Đơn giá phát sinh trên mỗi kg vượt định mức. |
| estimated_delivery_hours | INT | \-  | Không | Thời gian dự kiến hoàn thành giao hàng (giờ). |

_Mô tả: Bảng trung tâm lưu trữ toàn bộ thông tin đơn hàng vận chuyển._

Bảng . Cấu trúc bảng orders (Quản lý Đơn hàng)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh đơn hàng. |
| customer_id | UUID | **FK** | Không | Mã khách hàng tạo đơn (Tham chiếu customers.id). |
| order_code | VARCHAR(30) | **UK** | Không | Mã vận đơn tra cứu công khai. |
| status | ENUM | Index | Không | Trạng thái vòng đời đơn hàng. |
| service_id | UUID | **FK** | Không | Mã dịch vụ sử dụng (Tham chiếu services.id). |
| scheduled_pickup_at | TIMESTAMPTZ | \-  | Có  | Lịch hẹn khách yêu cầu tài xế đến lấy hàng. |
| pickup_address_text | TEXT | \-  | Không | Địa chỉ đầy đủ nơi lấy hàng. |
| pickup_latitude | DOUBLE | \-  | Không | Vĩ độ điểm lấy hàng. |
| pickup_longitude | DOUBLE | \-  | Không | Kinh độ điểm lấy hàng. |
| receiver_name | VARCHAR(150) | \-  | Không | Họ tên người nhận. |
| receiver_phone | VARCHAR(20) | \-  | Không | Số điện thoại người nhận. |
| delivery_address_text | TEXT | \-  | Không | Địa chỉ đầy đủ nơi giao hàng. |
| delivery_latitude | DOUBLE | \-  | Không | Vĩ độ điểm giao hàng. |
| delivery_longitude | DOUBLE | \-  | Không | Kinh độ điểm giao hàng. |
| estimated_shipping_fee | DECIMAL(12,2) | \-  | Không | Cước phí vận chuyển ước tính. |
| estimated_insurance_fee | DECIMAL(12,2) | \-  | Không | Phí bảo hiểm hàng hóa ước tính. |
| estimated_cod_amount | DECIMAL(12,2) | \-  | Không | Số tiền thu hộ COD ước tính. |
| origin_facility_id | UUID | **FK** | Có  | Bưu cục phụ trách khâu lấy hàng. |
| destination_facility_id | UUID | **FK** | Có  | Bưu cục phụ trách khâu giao hàng. |
| created_at | TIMESTAMPTZ | \-  | Không | Thời điểm đặt đơn. |

_Mô tả: Quản lý kích thước, thể tích, trọng lượng của từng kiện hàng trong đơn._

Bảng . Cấu trúc bảng packages (Kiện hàng Chi tiết)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh kiện hàng. |
| order_id | UUID | **FK** | Không | Đơn hàng chủ quản (Tham chiếu orders.id). |
| package_code | VARCHAR(30) | **UK** | Không | Mã QR/mã vạch dán trực tiếp lên kiện hàng. |
| description | TEXT | \-  | Có  | Mô tả tên vật phẩm, nội dung hàng hóa. |
| declared_value | DECIMAL(12,2) | \-  | Có  | Giá trị hàng hóa khai giá để tính bảo hiểm. |
| weight | DECIMAL(8,2) | \-  | Không | Khối lượng thực tế (kg). |
| length | DECIMAL(6,2) | \-  | Không | Chiều dài kiện hàng (cm). |
| width | DECIMAL(6,2) | \-  | Không | Chiều rộng kiện hàng (cm). |
| height | DECIMAL(6,2) | \-  | Không | Chiều cao kiện hàng (cm). |
| volume | DECIMAL(10,4) | \-  | Không | Thể tích quy đổi (m^3). |
| is_fragile | BOOLEAN | \-  | Không | Cờ đánh dấu hàng dễ vỡ. |
| current_facility_id | UUID | **FK** | Có  | Bưu cục hiện tại đang chứa kiện hàng này. |
| current_zone_id | UUID | **FK** | Có  | Phân khu kho hiện tại chứa kiện hàng này. |

_Mô tả: Quản lý hình thức thanh toán cước phí và người trả phí._

Bảng . Cấu trúc bảng order_payments (Thanh toán Đơn hàng)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh giao dịch thanh toán. |
| order_id | UUID | **FK, UK** | Không | Đơn hàng tương ứng (Tham chiếu orders.id). |
| final_shipping_fee | DECIMAL(12,2) | \-  | Không | Cước phí vận chuyển chính thức. |
| final_cod_amount | DECIMAL(12,2) | \-  | Không | Tiền COD thu hộ chính thức. |
| fee_payer | ENUM | \-  | Không | Người thanh toán cước (SENDER Người gửi, RECEIVER Người nhận). |
| payment_method | ENUM | \-  | Không | Phương thức (CASH Tiền mặt, BANK_TRANSFER, E_WALLET, COD). |
| payment_status | ENUM | \-  | Không | Trạng thái thanh toán (UNPAID, PAID, REFUNDED). |

_Mô tả: Lưu vết lịch sử mỗi lần đơn hàng thay đổi trạng thái._

Bảng . Cấu trúc bảng order_status_history (Nhật ký Trạng thái Đơn)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa / Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh nhật ký. |
| order_id | UUID | **FK** | Không | Đơn hàng được lưu nhật ký. |
| status | ENUM | \-  | Không | Trạng thái mới chuyển sang. |
| changed_by_user_id | UUID | **FK** | Có  | Người hoặc hệ thống thực hiện chuyển trạng thái. |
| reason | TEXT | \-  | Có  | Lý do thay đổi trạng thái (nếu có). |
| created_at | TIMESTAMPTZ | \-  | Không | Thời điểm chuyển trạng thái. |

**PHÂN HỆ 5: QUẢN LÝ VẬN ĐƠN (SHIPMENT MANAGEMENT)**

_Mô tả: Quản lý vận đơn gom hàng đi cùng tuyến di chuyển._

Bảng . Cấu trúc bảng shipments (Quản lý Vận đơn Giao hàng)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh vận đơn. |
| shipment_code | VARCHAR(30) | **UK** | Không | Mã vận đơn gom hàng. |
| status | ENUM | Index | Không | Trạng thái vận đơn (CREATED, IN_TRANSIT...). |
| route_id | UUID | **FK** | Có  | Chuyến xe phụ trách vận đơn này. |
| origin_facility_id | UUID | **FK** | Có  | Bưu cục xuất phát. |
| destination_facility_id | UUID | **FK** | Có  | Bưu cục đích đến. |
| created_at | TIMESTAMPTZ | \-  | Không | Thời điểm tạo vận đơn. |

_Mô tả: Liên kết giữa Kiện hàng và Vận đơn gom hàng._

Bảng . Cấu trúc bảng shipment_packages (Kiện hàng thuộc Vận đơn)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh dòng liên kết. |
| shipment_id | UUID | **FK** | Không | Mã vận đơn (Tham chiếu shipments.id). |
| package_id | UUID | **FK, UK** | Không | Mã kiện hàng (Mỗi kiện thuộc 1 vận đơn). |

_Mô tả: Quản lý chuyển giao vận đơn giữa bưu cục nguồn và đích._

Bảng . Cấu trúc bảng shipment_transfers (Chuyển giao Vận đơn giữa các Bưu cục)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh lượt chuyển giao. |
| shipment_id | UUID | **FK** | Không | Vận đơn chuyển giao. |
| from_facility_id | UUID | **FK** | Không | Bưu cục nguồn gửi đi. |
| to_facility_id | UUID | **FK** | Không | Bưu cục đích tiếp nhận. |
| status | ENUM | \-  | Không | Trạng thái (PENDING, IN_TRANSIT, ARRIVED). |
| dispatched_at | TIMESTAMPTZ | \-  | Có  | Thời điểm xuất kho bưu cục gửi. |
| arrived_at | TIMESTAMPTZ | \-  | Có  | Thời điểm nhập kho bưu cục nhận. |

**PHÂN HỆ 6: ĐỘI XE VÀ QUẢN LÝ TÀI XẾ (FLEET & DRIVERS)**

_Mô tả: Hồ sơ nhân viên và tài xế giao hàng trong hệ thống._

Bảng . Cấu trúc bảng staff (Thông tin Nhân viên & Tài xế)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh nhân viên. |
| user_id | UUID | **FK, UK** | Không | Tài khoản đăng nhập (Tham chiếu users.id). |
| employee_code | VARCHAR(30) | **UK** | Không | Mã nhân viên (VD: EMP_01, DRV_02). |
| full_name | VARCHAR(150) | \-  | Không | Họ và tên đầy đủ. |
| phone | VARCHAR(20) | Index | Không | Số điện thoại liên lạc. |
| assigned_facility_id | UUID | **FK** | Có  | Bưu cục phân công làm việc. |
| driver_license_number | VARCHAR(50) | **UK** | Có  | Số bằng lái xe (nếu là tài xế). |
| driver_license_class | VARCHAR(10) | \-  | Có  | Hạng bằng lái (B2, C, FC...). |
| employment_status | ENUM | Index | Có  | Trạng thái làm việc (ACTIVE, OFFLINE...). |

_Mô tả: Cho phép một tài xế đảm nhận đồng thời nhiều loại hình vận chuyển._

Bảng . Cấu trúc bảng staff_driver_types (Đa loại hình Tài xế - Mới)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh phân loại. |
| staff_id | UUID | **FK** | Không | Mã tài xế (Tham chiếu staff.id). |
| driver_type | ENUM | Index | Không | Loại hình (HUB_DELIVERY, LINEHAUL_TRANSFER, ON_DEMAND). |

_Mô tả: Thông tin xe giao hàng, biển số và sức chứa tải trọng._

Bảng . Cấu trúc bảng vehicles (Quản lý Phương tiện Giao hàng)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa / Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh phương tiện. |
| vehicle_code | VARCHAR(30) | **UK** | Không | Mã quản lý nội bộ của xe. |
| plate_number | VARCHAR(20) | **UK** | Không | Biển số xe kiểm soát |
| vehicle_type_id | UUID | **FK** | Không | Loại dòng xe (Tham chiếu vehicle_types.id). |
| assigned_facility_id | UUID | **FK** | Có  | Bưu cục quản lý phương tiện. |
| max_weight | DECIMAL(10,2) | \-  | Không | Tải trọng khối lượng tối đa (kg). |
| max_volume | DECIMAL(10,4) | \-  | Không | Sức chứa thể tích tối đa (m^3). |
| is_refrigerated | BOOLEAN | \-  | Không | Cờ hỗ trợ thùng xe đông lạnh |
| operating_status | ENUM | \-  | Không | Trạng thái kỹ thuật xe (ACTIVE, MAINTENANCE...). |

_Mô tả: Danh mục dòng xe (Xe máy, Xe van 500kg, Xe tải 2.5T)._

Bảng . Cấu trúc bảng vehicle_types (Loại Phương tiện)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh dòng xe. |
| type_code | VARCHAR(30) | **UK** | Không | Mã loại xe (VD: MOTORBIKE, TRUCK_2T). |
| type_name | VARCHAR(100) | \-  | Không | Tên hiển thị dòng xe. |

_Mô tả: Quản lý lịch bàn giao xe cho tài xế điều khiển._

Bảng . Cấu trúc bảng driver_vehicle_assignments (Phân công Tài xế Lái xe)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh ca giao xe. |
| driver_id | UUID | **FK** | Không | Tài xế nhận xe (Tham chiếu staff.id). |
| vehicle_id | UUID | **FK** | Không | Phương tiện được giao (Tham chiếu vehicles.id). |
| assigned_from | TIMESTAMPTZ | \-  | Không | Thời điểm giao xe. |
| assigned_to | TIMESTAMPTZ | \-  | Có  | Thời điểm trả lại xe. |
| is_active | BOOLEAN | Index | Không | Cờ ca giao xe đang hiệu lực. |

_Mô tả: Lưu giữ tọa độ định vị tức thời mới nhất của tài xế._

Bảng . Cấu trúc bảng driver_locations (Tọa độ Định vị Mới nhất của Tài xế)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| driver_id | UUID | **PK, FK** | Không | Mã tài xế (Tham chiếu staff.id). |
| latitude | DOUBLE | Index | Không | Vĩ độ định vị thực tế mới nhất. |
| longitude | DOUBLE | Index | Không | Kinh độ định vị thực tế mới nhất. |
| recorded_at | TIMESTAMPTZ | \-  | Không | Thời điểm nhận tọa độ. |

**PHÂN HỆ 7: ĐIỀU HÀNH VÀ TỐI ƯU LỘ TRÌNH (ROUTING & DISPATCH ENGINE)**

_Mô tả: Thông tin chuyến xe do bộ giải toán AI lập kế hoạch._

Bảng . Cấu trúc bảng routes (Lộ trình Chuyến xe)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh lộ trình. |
| route_code | VARCHAR(30) | **UK** | Không | Mã chuyến xe tối ưu. |
| driver_vehicle_assignment_id | UUID | **FK** | Có  | Phân công tài xế-xe phụ trách chuyến. |
| start_facility_id | UUID | **FK** | Không | Bưu cục điểm xuất phát. |
| end_facility_id | UUID | **FK** | Có  | Bưu cục điểm kết thúc. |
| planned_distance_km | DECIMAL(10,2) | \-  | Không | Tổng quãng đường di chuyển dự kiến đã tối ưu (km). |
| planned_duration_min | INT | \-  | Không | Tổng thời gian di chuyển dự kiến (phút). |
| total_stops | INT | \-  | Không | Tổng số điểm dừng ghé thăm. |
| status | ENUM | Index | Không | Trạng thái lộ trình (PLANNED, IN_PROGRESS...). |

_Mô tả: Chuỗi các điểm dừng theo thứ tự di chuyển tối ưu._

Bảng . Cấu trúc bảng route_stops (Chi tiết Điểm dừng Lộ trình)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh điểm dừng. |
| route_id | UUID | **FK** | Không | Mã lộ trình (Tham chiếu routes.id). |
| order_id | UUID | **FK** | Có  | Đơn hàng lấy tại nhà (cho điểm dừng Pickup). |
| shipment_id | UUID | **FK** | Có  | Vận đơn giao tại nhà (cho điểm dừng Delivery). |
| sequence | INT | **UK** | Không | Thứ tự di chuyển ưu tiên (1, 2, 3... N). |
| stop_type | ENUM | \-  | Không | Loại điểm dừng (PICKUP, HUB, DELIVERY). |
| latitude | DOUBLE | \-  | Không | Vĩ độ điểm dừng. |
| longitude | DOUBLE | \-  | Không | Kinh độ điểm dừng. |
| status | ENUM | \-  | Không | Trạng thái ghé thăm (PENDING, ARRIVED, DEPARTED). |

_Mô tả: Lệnh điều động chuyến xe gửi tới tài xế._

Bảng . Cấu trúc bảng dispatch_tasks (Nhiệm vụ Điều phối Giao chuyến)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh lệnh điều phối. |
| task_code | VARCHAR(30) | **UK** | Không | Mã lệnh điều động. |
| route_id | UUID | **FK** | Không | Lộ trình được giao. |
| assigned_by | UUID | **FK** | Không | Nhân viên điều phối phát lệnh. |
| assigned_to | UUID | **FK, Index** | Không | Tài xế tiếp nhận lệnh. |
| status | ENUM | Index | Không | Trạng thái (PENDING, ACCEPTED, REJECTED). |

_Mô tả: Lưu vết kết quả mỗi lượt chạy bộ giải toán AI._

Bảng . Cấu trúc bảng route_optimizations (Nhật ký Chạy AI Routing)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa/ Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh lượt chạy AI. |
| algorithm_name | VARCHAR(50) | \-  | Không | Tên thuật toán tối ưu. |
| input_shipment_count | INT | \-  | Không | Số đơn hàng đầu vào cần xử lý. |
| output_route_count | INT | \-  | Không | Số chuyến xe tối ưu tạo được. |
| optimization_status | ENUM | \-  | Không | Kết quả xử lý (SUCCESS, FAILED). |

_Mô tả: Lưu vết các lần điều phối viên can thiệp đổi tài xế thủ công ngoài thực địa._

Bảng . Cấu trúc bảng route_adjustment_logs (Nhật ký Sự cố Điều chỉnh Chuyến)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa / Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh lượt điều chỉnh. |
| route_id | UUID | **FK, Index** | Không | Lộ trình bị thay đổi. |
| adjusted_by_user_id | UUID | **FK** | Không | Nhân viên can thiệp điều chỉnh. |
| old_driver_id | UUID | **FK** | Có  | Tài xế cũ gặp sự cố. |
| new_driver_id | UUID | **FK** | Có  | Tài xế mới được bàn giao thay thế. |
| reason | TEXT | \-  | Không | Lý do thay đổi lộ trình. |

**PHÂN HỆ 8: THEO DÕI, MÃ VẠCH VÀ KÝ NHẬN GIAO HÀNG (TRACKING, SCAN & POD)**

Bảng 3.34: Cấu trúc bảng tracking_events (Nhật ký Hành trình Đơn hàng)

_Mô tả: Chuỗi lịch sử hành trình giao vận hiển thị cho khách hàng._

Bảng . Cấu trúc bảng tracking_events (Nhật ký Hành trình Đơn hàng)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa / Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh sự kiện hành trình. |
| shipment_id | UUID | **FK, Index** | Không | Vận đơn theo dõi. |
| event_type | ENUM | \-  | Không | Loại mốc sự kiện. |
| description | TEXT | \-  | Không | Nội dung mô tả chi tiết hiển thị. |
| created_at | TIMESTAMPTZ | Index | Không | Thời điểm ghi nhận sự kiện. |

_Mô tả: Lịch sử quét mã gói hàng tại kho hoặc ngoài thực địa._

Bảng . Cấu trúc bảng barcode_scans (Nhật ký Quét Mã QR Code / Barcode)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa / Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh lượt quét mã. |
| shipment_id | UUID | **FK, Index** | Không | Vận đơn được quét. |
| scanned_by | UUID | **FK** | Không | Người bấm quét mã. |
| scan_type | ENUM | \-  | Không | Thao tác quét (INBOUND, OUTBOUND, DELIVERY...). |
| barcode_value | VARCHAR(100) | Index | Không | Chuỗi ký tự mã vạch/mã QR thu được. |
| scanned_at | TIMESTAMPTZ | \-  | Không | Thời gian thực hiện quét. |

_Mô tả: Chứng từ giao hàng thành công/thất bại tích hợp sẵn URL ảnh chụp._

Bảng . Cấu trúc bảng delivery_proofs (Bằng chứng Giao hàng - PoD Cập nhật)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa / Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh chứng từ. |
| route_stop_id | UUID | **FK, UK** | Không | Điểm dừng tương ứng (Tham chiếu route_stops.id). |
| delivery_result | ENUM | \-  | Không | Kết quả (SUCCESS Thành công, FAILED Thất bại). |
| actual_cod_collected | DECIMAL(12,2) | \-  | Có  | Số tiền thu hộ COD thực tế tài xế đã nhận. |
| file_url | VARCHAR(500) | \-  | Có  | Đường dẫn URL ảnh chụp chứng từ / chữ ký. |
| failure_reason | ENUM | \-  | Có  | Lý do giao thất bại (Khách vắng nhà, từ chối...). |
| verified_latitude | DOUBLE | \-  | Có  | Vĩ độ thực tế định vị lúc tài xế bấm ký nhận. |
| verified_longitude | DOUBLE | \-  | Có  | Kinh độ thực tế định vị lúc tài xế bấm ký nhận. |

**PHÂN HỆ 9: CẤU HÌNH HỆ THỐNG VÀ ĐƠN VỊ HÀNH CHÍNH (CONFIG & ADMIN UNITS)**

_Mô tả: Lưu trữ tham số AI, chu kỳ đồng bộ GPS và tham số nghiệp vụ._

Bảng . Cấu trúc bảng system_settings (Tham số Cấu hình Hệ thống)

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Trường** | **Kiểu Dữ liệu** | **Khóa / Ràng buộc** | **Cho phép Rỗng** | **Mô tả** |
| id  | UUID | **PK** | Không | Mã định danh cấu hình. |
| setting_key | VARCHAR(100) | **UK** | Không | Mã khóa tham số (VD: AI_CLUSTERING_RADIUS_KM). |
| setting_value | TEXT | \-  | Không | Giá trị cấu hình. |
| category | ENUM | \-  | Không | Phân nhóm cài đặt (AI, ROUTING, GPS, SYSTEM). |

_Mô tả: Danh mục mã chuẩn hóa 63 Tỉnh/Thành phố, Phường/Xã và Vùng địa lý Việt Nam._

Bảng . Các Bảng Đơn vị Hành chính Việt Nam

|     |     |     |     |
| --- | --- | --- | --- |
| **Tên Bảng** | **Khóa Chính (PK)** | **Trường Quan hệ (FK)** | **Mô tả** |
| administrative_regions | id (INT) | \-  | Danh mục 8 Vùng kinh tế xã hội địa lý Việt Nam. |
| administrative_units | id (INT) | \-  | Danh mục các loại đơn vị hành chính (Thành phố, Quận, Huyện, Phường, Xã). |
| provinces | code (VARCHAR) | administrative_region_id | Danh mục 63 Tỉnh / Thành phố trực thuộc trung ương. |
| wards | code (VARCHAR) | province_code | Danh mục Phường / Xã / Thị trấn chi tiết toàn quốc. |

# CHƯƠNG 4: TRIỂN KHAI VÀ CÀI ĐẶT HỆ THỐNG

## 4.1. Môi trường triển khai & Đóng gói hạ tầng (Docker, Docker Compose)

### 4.1.1. Tổng quan mô hình triển khai hạ tầng Container

Để đảm bảo tính đóng gói, nhất quán môi trường phát triển và sẵn sàng triển khai trên các hạ tầng máy chủ điện toán đám mây (Cloud Server), hệ thống Smart Logistics Platform áp dụng công nghệ ảo hóa cấp ứng dụng Containerization sử dụng Docker và công cụ điều phối Docker Compose.

Việc ảo hóa hạ tầng mang lại các ưu điểm vượt trội:

1.  **Loại bỏ xung đột môi trường (Environment Parity):** Đảm bảo hệ thống chạy đồng nhất 100% giữa môi trường lập trình của phát triển viên và môi trường triển khai thực tế.
2.  **Khởi tạo và mở rộng nhanh chóng:** Chỉ với một lệnh duy nhất, toàn bộ bộ máy Cơ sở dữ liệu quan hệ địa lý, Bộ nhớ đệm tốc độ cao và Bộ điều phối thông điệp được khởi dựng thành công trong vài giây.
3.  **Cô lập tài nguyên và an toàn dữ liệu:** Các dịch vụ chạy trong các vùng chứa (Container) độc lập, giao tiếp với nhau thông qua mạng ảo nội bộ (slp-network) giúp tăng cường bảo mật và tránh rò rỉ cổng dịch vụ ra ngoài internet.

### 4.1.2. Sơ đồ Kiến trúc đóng gói hạ tầng Container

Hình . Sơ đồ Mô hình Triển khai Hạ tầng Container

### 4.1.3. Chi tiết cấu hình các Container và Thông số Hạ tầng

Hạ tầng lưu trữ và trung chuyển dữ liệu của hệ thống bao gồm 3 dịch vụ Container nòng nốt:

Bảng . Danh mục các Dịch vụ Container và Thông số Cấu hình Hạ tầng

|     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- |
| **STT** | **Tên Dịch vụ (Service)** | **Tên Container** | **Hình ảnh Ảo hóa (Docker Image)** | **Cổng Kết nối (Port)** | **Vai trò & Nhiệm vụ Vận hành** |
| **1** | Cơ sở Dữ liệu | slp-postgres | postgis/postgis:15-3.4-alpine | 5432:5432 | Lưu trữ toàn bộ 34 bảng dữ liệu quan hệ và thực hiện các hàm tính toán khoảng cách địa lý không gian không gian PostGIS. |
| **2** | Bộ nhớ đệm | slp-redis | redis:7-alpine | 6379:6379 | Lưu trữ tạm thời tọa độ định vị GPS tài xế (<1 ms), quản lý phiên đăng nhập và hỗ trợ cơ chế phát sóng tin nhắn (Pub/Sub). |
| **3** | Bộ điều phối Thông điệp | slp-rabbitmq | rabbitmq:3-management-alpine | 5672 (AMQP)  <br>15672 (Web UI) | Quản lý hàng chờ thông điệp xử lý bất đồng bộ (Queueing), tiếp nhận các sự kiện tính toán lộ trình AI nặng mà không gây ngưng trệ API. |

### 4.1.4. Quy trình khởi chạy hạ tầng Container

Để khởi tạo hạ tầng trên máy chủ, quy trình được thực hiện qua các lệnh Terminal chuẩn hóa sau:

1.  **Bước 1: Khởi động toàn bộ Container chạy ngầm**

docker compose up -d

1.  **Bước 2: Kiểm tra trạng thái sống (Healthcheck) của các dịch vụ**

docker compose ps

_Kết quả trả về cả 3 Container slp-postgres, slp-redis và slp-rabbitmq đều ở trạng thái Up (healthy)._

1.  **Bước 3: Kiểm tra nhật ký vận hành (Logs)**

docker compose logs -f

## 4.2. Thiết kế & Triển khai Giao diện Người dùng (UI/UX)

### 4.2.1. Giao diện Đăng nhập và Xác thực Hệ thống

- **Mô tả chức năng:** Màn hình tiếp nhận tài khoản đăng nhập của Quản trị viên, Nhân viên điều phối và Tài xế. Tích hợp cơ chế xác thực chuỗi mã an toàn (JWT) và tự động chuyển hướng người dùng tới giao diện đúng với quyền hạn đã được phân công.
- **Các thành phần chính:** Biểu mẫu đăng nhập (Tên tài khoản, Mật khẩu), Nút bấm đăng nhập, Nút ẩn/hiện mật khẩu, Thông báo lỗi xác thực an toàn.

Hình . Giao diện Đăng nhập Hệ thống (Login Screen)

### 4.2.2. Giao diện Trang chủ Báo cáo Thống kê Tổng quan (Admin Dashboard)

- **Mô tả chức năng:** Màn hình Trung tâm Điều hành dành cho Quản trị viên và Quản lý bưu cục. Cung cấp cái nhìn toàn cảnh về tình hình vận hành của toàn bộ hệ thống thông qua các chỉ số đo lường hiệu suất chính (KPIs) và biểu đồ trực quan.
- **Các thành phần chính:**
    - Khối thẻ chỉ số tổng quan: Tổng số đơn hàng trong ngày, Số chuyến xe đang giao, Số tài xế đang hoạt động, Tỷ lệ giao hàng đúng giờ.
    - Biểu đồ cột/đường: Thống kê lượng đơn hoàn thành theo từng khung giờ trong ngày và doanh thu theo bưu cục.
    - Bảng cảnh báo sự cố: Cảnh báo đơn giao trễ khung giờ hẹn, cảnh báo tài xế mất kết nối định vị GPS.

Hình . Giao diện Trang chủ Báo cáo Thống kê Tổng quan (Dashboard Admin)

### 4.2.3. Giao diện Quản lý Đơn hàng và Nhập Xuất kho

- **Mô tả chức năng:** Màn hình cho phép Nhân viên kho tiếp nhận đơn hàng, tìm kiếm, lọc danh sách đơn theo trạng thái và cập nhật các thao tác nhập kho/xuất kho trung chuyển.
- **Các thành phần chính:**
    - Thanh tìm kiếm đa năng (Tìm theo Mã vận đơn, Tên khách hàng, Số điện thoại).
    - Bộ lọc trạng thái đơn hàng (Chờ lấy, Đã nhập kho, Đang đi giao, Giao thành công).
    - Bảng danh sách đơn hàng tích hợp nút thao tác nhanh (Xem chi tiết, In mã QR Code, Chuyển trạng thái).

Hình . Giao diện Quản lý Đơn hàng và Nhập Xuất kho (Order Management)

### 4.2.4. Giao diện Kích hoạt Tối ưu Phân tuyến Thuật toán AI (AI Routing Center)

- **Mô tả chức năng:** Màn hình cho phép Nhân viên điều phối cấu hình các điều kiện đầu vào và phát lệnh kích hoạt bộ giải toán Trí tuệ Nhân tạo (AI Engine) để tự động gom cụm đơn và lập lộ trình đường đi ngắn nhất cho đội xe.
- **Các thành phần chính:**
    - Biểu mẫu cấu hình tham số: Bán kính phân cụm địa lý (km), Tải trọng xe tối đa, Thời gian chờ xử lý.
    - Nút lệnh trọng tâm: **"Tối ưu hóa tuyến đường"** (Kích hoạt chạy thuật toán VRP).
    - Khối kết quả tối ưu: Hiển thị thời gian thuật toán xử lý (ms), Số lượng chuyến xe vừa tạo, Tổng quãng đường giảm thiểu được (km).

Hình . Giao diện Kích hoạt Tối ưu Phân tuyến Thuật toán AI (AI Routing Center)

### 4.2.5. Giao diện Bản đồ Giám sát Trung tâm Thời gian thực (Real-time GIS Command Center)

- **Mô tả chức năng:** Màn hình bản đồ số trực quan thể hiện toàn bộ hoạt động giao hàng ngoài thực địa. Cho phép bộ phận điều phối theo dõi vị trí di chuyển mượt mà của tài xế (3s/lần) và tiến độ hạ các cờ hiệu điểm giao.
- **Các thành phần chính:**
    - Màn hình Bản đồ số tương tác (Tích hợp Mapbox / Leaflet Map).
    - Ký hiệu biểu tượng: Xe tải/Xe máy tài xế đang di chuyển thực tế, Cờ hiệu điểm giao hàng (Cờ xanh: Chờ giao, Cờ xám: Đã giao xong).
    - Bảng điều hướng bên cạnh: Danh sách tài xế đang trực tuyến và xem chi tiết lộ trình của từng chuyến xe.

Hình . Giao diện Bản đồ Giám sát Tài xế Thời gian thực (GIS Command Center)

### 4.2.6. Giao diện Khách hàng: Đặt đơn & Tra cứu Hành trình Vận đơn

- **Mô tả chức năng:** Cổng giao diện dành cho khách hàng tạo đơn giao hàng mới và tra cứu hành trình trực quan trên bản đồ số khi tài xế đang di chuyển đến nhà giao hàng.
- **Các thành phần chính:**
    - Form đặt đơn hàng (Nhập địa chỉ người gửi, người nhận, trọng lượng, kích thước kiện hàng).
    - Ô tra cứu mã vận đơn công khai.
    - Màn hình theo dõi hành trình trực quan: Hiển thị mốc tiến độ đơn hàng và biểu tượng xe tài xế đang di chuyển trên bản đồ.

**Hình 4.7: Giao diện Khách hàng Tra cứu Vị trí Vận đơn Trực quan (Customer Tracking Portal)**  
_(Tên file ảnh gợi ý lưu: hinh_4_7_tra_cuu_khach_hang.png)_

### 4.2.7. Giao diện Ứng dụng Di động cho Tài xế: Tiếp nhận Ca & Dẫn đường (Driver Mobile App)

- **Mô tả chức năng:** Màn hình ứng dụng chạy trên điện thoại di động của tài xế. Hiển thị danh sách các đơn hàng cần xử lý được sắp xếp theo thứ tự tối ưu và tích hợp bản đồ chỉ đường từng chặng.
- **Các thành phần chính:**
    - Trang danh sách ca làm việc: Hiển thị danh sách chuỗi các điểm giao theo thứ tự di chuyển ngắn nhất.
    - Màn hình điều hướng bản đồ: Tự động chỉ đường từ vị trí GPS hiện tại của tài xế đến nhà khách hàng.

Hình . Giao diện ứng dụng di động Tài xế - Danh sách Chuyến đi và Dẫn đường

### 4.2.8. Giao diện Ứng dụng Di động cho Tài xế: Quét mã QR & Ký nhận Giao hàng (PoD Scanner)

- **Mô tả chức năng:** Màn hình cho phép tài xế quét mã QR Code trên gói hàng để chuyển nhanh trạng thái đơn, chụp ảnh minh chứng ký nhận và gửi tọa độ thực tế về máy chủ.
- **Các thành phần chính:**
    - Màn hình camera quét mã vạch/mã QR Code tự động.
    - Màn hình xác thực giao hàng thành công: Ô chụp ảnh hàng giao, ô vẽ chữ ký điện tử của khách hàng, nút xác nhận "Giao thành công".

Hình . Giao diện ứng dụng di động Tài xế - Quét mã QR và Ký nhận Giao hàng

## 4.3. Triển khai & Cài đặt các Mô-đun Xử lý Trọng tâm

### 4.3.1. Phân hệ Gom cụm AI & Giải bài toán Định tuyến Phương tiện (Clustering AI & VRP Engine)

a. Quy trình xử lý và Thuật toán tính Ma trận Khoảng cách (Distance Matrix)

Để lập lộ trình tối ưu cho đội xe, hệ thống phải thực hiện 3 bước tính toán tuần tự:

1.  **Chuyển đổi Tọa độ Địa lý (Geocoding):** Chuyển đổi địa chỉ văn bản của người gửi/người nhận thành cặp kinh độ và vĩ độ WGS 84.
2.  **Tính toán Ma trận Khoảng cách và Thời gian di chuyển:** Xây dựng bảng ma trận times điểm dừng. Hệ thống ưu tiên truy vấn API Bản đồ số Goong Maps / OSRM API để lấy khoảng cách di chuyển thực tế theo hạ tầng giao thông đường bộ Việt Nam. Trường hợp mất kết nối mạng, hệ thống tự động chuyển sang công thức toán học Haversine tính khoảng cách mặt cầu theo đường chim bay:

Bảng . So sánh Phương pháp Tính Ma trận Khoảng cách và Thời gian Di chuyển

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **Phương pháp** | **Nguồn Dữ liệu Truy vấn** | **Ưu điểm Nghiệp vụ** | **Độ chính xác Thực tế** | **Thời gian Phản hồi** |
| **Goong Maps API** _(Ưu tiên 1)_ | Dịch vụ Bản đồ số Việt Nam | Tính đến đường 1 chiều, cấm xe tải và mật độ giao thông đô thị. | **Rất cao (95% - 98%)** | 100ms - 300ms |
| **OSRM Engine** _(Dự phòng 1)_ | Máy chủ OpenStreetMap nội bộ | Tốc độ tính toán ma trận ma trận cực nhanh, không tốn chi phí API. | **Cao (85% - 90%)** | 20ms - 50ms |
| **Haversine Matrix** _(Dự phòng 2)_ | Công thức Toán học Hình học | Chạy trực tiếp tại máy chủ, không phụ thuộc kết nối mạng bên ngoài. | **Mô phỏng (70% - 80%)** | < 1 ms |

b. Sơ đồ Luồng xử lý của Bộ giải toán AI VRP

Hình . Sơ đồ Luồng xử lý của Bộ giải toán Tối ưu Lộ trình AI VRP Engine

### 4.3.2. Phân hệ Truyền nhận & Đồng bộ Định vị Thời gian thực (Real-time Telemetry Engine)

Để đáp ứng luồng tọa độ gửi về từ hàng trăm điện thoại tài xế ngoài thực địa với tần suất 3 giây/lần mà không làm sập Cơ sở dữ liệu chính PostgreSQL, hệ thống kết hợp WebSockets (Socket.io) với Bộ nhớ đệm Redis Cache In-Memory:

Hình . Sơ đồ Luồng Truyền nhận Tọa độ Định vị Real-time

## 4.4. Đánh giá và Kiểm thử Hệ thống

### 4.4.1. Môi trường và Phương pháp luận Kiểm thử

Quá trình kiểm thử hệ thống Smart Logistics Platform được thực hiện theo 2 phương pháp chính:

1.  **Kiểm thử Chức năng (Functional Black-box Testing):** Kiểm tra độ chính xác của các luồng nghiệp vụ trên cả 3 giao diện Web Admin, Web Khách hàng và Mobile App Tài xế.
2.  **Kiểm thử Hiệu năng & Chịu tải (Performance & Load Testing):** Đo lường thời gian tính toán thuật toán tối ưu VRP với số lượng điểm dừng tăng dần (N = 10, 50, 100, 500 điểm giao) và đo độ trễ truyền luồng GPS thời gian thực.

**Thông số Môi trường Máy chủ Thực nghiệm:**

- **Hệ điều hành:** Ubuntu 22.04 LTS (64-bit).
- **Bộ vi xử lý (CPU):** Intel Core i7-12700K (12 nhân, 20 luồng).
- **Bộ nhớ trong (RAM):** 32 GB DDR4.
- **Ổ cứng:** 1 TB NVMe SSD (Tốc độ đọc/ghi 3500\\text{ MB/s}).
- **Môi trường Container:** Docker v24.0, Docker Compose v2.20 (PostgreSQL 15 + PostGIS 3.4, Redis 7).

### 4.4.2. Kịch bản và Kết quả Kiểm thử Chức năng (Functional Testing)

Bảng . Kịch bản Kiểm thử Chức năng Hệ thống

|     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- |
| **STT** | **Mã Kịch bản** | **Tên Chức năng Kiểm thử** | **Thao tác Thực hiện (Test Steps)** | **Kết quả Kỳ vọng (Expected Result)** | **Trạng thái (Status)** |
| **1** | TC_AUTH_01 | Đăng nhập Hệ thống | Nhập đúng tên đăng nhập và mật khẩu hợp lệ. | Đăng nhập thành công, trả về chuỗi mã JWT, chuyển tới trang Dashboard. | **ĐẠT (PASS)** |
| **2** | TC_ORDER_01 | Tạo Đơn hàng Mới | Khách hàng nhập thông tin người gửi, người nhận và tọa độ địa lý. | Đơn hàng lưu vào CSDL, hệ thống sinh mã QR Code vận đơn thành công. | **ĐẠT (PASS)** |
| **3** | TC_VRP_01 | Tối ưu Lộ trình AI | Nhân viên bấm nút "Tối ưu hóa tuyến đường" cho 50 đơn hàng kho. | Hệ thống gom cụm và lập chuỗi lộ trình di chuyển tối ưu cho đội xe. | **ĐẠT (PASS)** |
| **4** | TC_GPS_01 | Định vị Realtime | App tài xế tự động gửi tọa độ GPS định kỳ 3s/lần về máy chủ. | Biểu tượng xe tài xế di chuyển mượt mà trên bản đồ trung tâm. | **ĐẠT (PASS)** |
| **5** | TC_POD_01 | Ký nhận Giao hàng | Tài xế quét mã QR Code trên gói hàng và chụp ảnh minh chứng. | Trạng thái đơn chuyển sang "Giao thành công", lưu ảnh và tọa độ xác thực. | **ĐẠT (PASS)** |

### 4.4.3. Đánh giá Hiệu năng Bài toán Tối ưu Lộ trình (VRP Performance Benchmark)

Thử nghiệm được tiến hành bằng cách cho Bộ giải toán AI VRP thực hiện tính toán ma trận khoảng cách và lập lộ trình tối ưu cho số lượng đơn hàng tăng dần từ 10 đến 500 điểm giao:

Bảng . Thử nghiệm Hiệu năng Thuật toán AI Routing VRP với quy mô số lượng điểm giao tăng dần

|     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- |
| **Số lượng Đơn hàng (N)** | **Số lượng Tài xế / Xe (K)** | **Thời gian Tính Ma trận Khoảng cách (ms)** | **Thời gian Thuật toán AI VRP Giải toán (ms)** | **Tổng Thời gian Phản hồi (ms)** | **Điểm số Tối ưu Quãng đường Giảm được** |
| **10 điểm** | 2 xe | 45 ms | 120 ms | **165 ms** | **Giảm 28.5%** quãng đường |
| **50 điểm** | 5 xe | 180 ms | 650 ms | **830 ms** | **Giảm 32.1%** quãng đường |
| **100 điểm** | 10 xe | 420 ms | 1,450 ms | **1,870 ms** | **Giảm 35.4%** quãng đường |
| **200 điểm** | 15 xe | 980 ms | 3,820 ms | **4,800 ms** | **Giảm 33.8%** quãng đường |
| **500 điểm** | 30 xe | 2,850 ms | 11,200 ms | **14,050 ms** | **Giảm 31.2%** quãng đường |

### 4.4.4. Đánh giá Độ trễ Truyền nhận Định vị Thời gian thực (Real-time Latency Benchmark)

Thử nghiệm giả lập số lượng tài xế di chuyển đồng thời ngoài đường phát luồng dữ liệu định vị GPS về hệ thống qua kênh WebSocket (Socket.io) và ghi đệm Redis Cache:

Bảng . Đánh giá Độ trễ Cập nhật Định vị Real-time Socket.io & Redis

|     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- |
| **Số tài xế Giả lập Di chuyển Đồng thời** | **Tần suất Gửi GPS** | **Tỷ lệ Tải CPU Máy chủ** | **Tỷ lệ Sử dụng Bộ nhớ RAM** | **Độ trễ Trung bình Bản đồ Giám sát (ms)** | **Tỷ lệ Mất Gói dữ liệu (Packet Loss)** |
| **50 Tài xế** | 3 giây / lần | 4.2% | 480 MB | **15 ms** | **0.0%** |
| **100 Tài xế** | 3 giây / lần | 8.5% | 620 MB | **28 ms** | **0.0%** |
| **500 Tài xế** | 3 giây / lần | 24.1% | 1,150 MB | **65 ms** | **0.01%** |
| **1,000 Tài xế** | 3 giây / lần | 48.6% | 2,200 MB | **120 ms** | **0.05%** |

### 4.4.5. Đánh giá Tổng quan Kết quả Kiểm thử

Từ kết quả thử nghiệm thực tế trên, hệ thống Smart Logistics Platform đạt được các chỉ số vận hành vượt trội:

1.  **Về Tính Đúng đắn Chức năng:** 100% các kịch bản kiểm thử chức năng quan trọng (Tạo đơn, Gom cụm, Lập lộ trình VRP, Định vị Real-time, Ký nhận PoD) đều đạt yêu cầu thiết kế.
2.  **Về Tối ưu Vận tải:** Thuật toán AI VRP giúp giảm từ 28.5% đến 35.4% tổng quãng đường di chuyển so với việc lập lộ trình thủ công truyền thống.
3.  **Về Hiệu năng & Độ trễ:**
    - Với quy mô bưu cục trung bình 100 đơn hàng, thời gian tính toán lộ trình tối ưu chỉ mất 1.87 giây (< 2 giây).
    - Độ trễ cập nhật vị trí định vị trên bản đồ giám sát đạt trung bình 28 ms đối với 100 tài xế di chuyển cùng lúc, đảm bảo trải nghiệm theo dõi gian thực cực kỳ mượt mà.

# CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

## 5.1. Kết quả đạt được

Trải qua quá trình nghiên cứu lý thuyết, phân tích yêu cầu nghiệp vụ, thiết kế kiến trúc và triển khai cài đặt thực tế, đề tài "Hệ thống điều vận và tối ưu hóa tuyến đường giao hàng tự động (Smart Logistics Platform)" đã hoàn thành các mục tiêu đặt ra.

Kết quả đạt được của đề tài thể hiện rõ nét trên hai khía cạnh:

### 5.1.1. Về mặt Lý thuyết và Nghiên cứu Học thuật

1.  **Nghiên cứu sâu về Bài toán Tối ưu Tuyến đường Phương tiện (VRP):** Đã hệ thống hóa và làm chủ lý thuyết bài toán định tuyến phương tiện đa ràng buộc, bao gồm Ràng buộc Tải trọng phương tiện (Capacitated VRP - CVRP) và Ràng buộc Khung giờ hẹn của khách hàng (VRP with Time Windows - VRPTW).
2.  **Nghiên cứu Thuật toán Tiến hóa Di truyền (Genetic Algorithm):** Đã làm chủ cơ chế mã hóa nhiễm sắc thể lộ trình di chuyển, thiết lập Hàm thích nghi (Fitness Function) tích hợp Hàm phạt (Penalty Function) để đào thải các phương án vi phạm tải trọng hoặc trễ giờ hẹn, tìm ra đường di chuyển ngắn nhất cho đội xe.
3.  **Nghiên cứu Dữ liệu Địa lý Không gian (Geospatial Data):** Đã áp dụng thành công hệ tọa độ toàn cầu WGS 84, các phép tính khoảng cách mặt cầu (Haversine Matrix), tích hợp chỉ mục không gian (Spatial GIST Indexing) trong cơ sở dữ liệu PostgreSQL 15 và mở rộng PostGIS.
4.  **Nghiên cứu Kiến trúc Hướng Sự kiện chịu tải cao (Event-Driven Architecture):** Đã xây dựng thành công giải pháp truyền nhận luồng dữ liệu định vị toàn cầu (GPS) tần suất cao thông qua kết nối song công WebSockets (Socket.io) và bộ lưu đệm trong bộ nhớ tạm thời Redis Cache (In-Memory).

### 5.1.2. Về mặt Thực tiễn và Xây dựng Phần mềm

Đối chiếu với các mục tiêu đã cam kết ở Chương 1, sản phẩm phần mềm Smart Logistics Platform đã đạt được các kết quả cụ thể sau:

Bảng . Đánh giá đối chiếu kết quả đạt được so với mục tiêu ban đầu

|     |     |     |     |
| --- | --- | --- | --- |
| **STT** | **Mục tiêu Đặt ra ở Chương 1** | **Kết quả Thực tế Đạt được** | **Mức độ Hoàn thành** |
| **1** | Tự động gom cụm đơn hàng tại kho | Thuật toán gom cụm AI (K-Means/DBSCAN) tự động phân tách hàng ngàn điểm đơn hàng rải rác thành các vùng địa lý tối ưu cho từng tài xế dựa trên bán kính cấu hình. | 100% (Hoàn tất) |
| **2** | Giải bài toán VRP đa ràng buộc | Xây dựng bộ giải toán VRP thỏa mãn đồng thời tải trọng xe và giờ hẹn khách. Thử nghiệm thực tế giúp giảm từ 28.5% đến 35.4% tổng quãng đường di chuyển so với phân tuyến thủ công. | 100% (Hoàn tất) |
| **3** | Trung tâm Điều hành Thời gian thực | Xây dựng màn hình bản đồ GIS trực quan, cập nhật vị trí tài xế với độ trễ siêu thấp 28 ms đối với 100 tài xế di chuyển đồng thời, không gây nghẽn đĩa cơ sở dữ liệu. | 100% (Hoàn tất) |
| **4** | Ứng dụng Di động cho Tài xế | Hoàn thiện ứng dụng di động cho tài xế với các chức năng: Tiếp nhận ca làm việc, bản đồ điều hướng dẫn đường, quét mã QR Code và chụp ảnh xác thực bằng chứng giao hàng (PoD). | 100% (Hoàn tất) |
| **5** | Đóng gói Hạ tầng Container | Đóng gói toàn bộ bộ máy cơ sở dữ liệu PostgreSQL (PostGIS), Redis Cache và RabbitMQ bằng Docker Compose, giúp triển khai hệ thống nhất quán chỉ với 1 dòng lệnh. | 100% (Hoàn tất) |

## 5.2. Hạn chế của hệ thống

Mặc dù đã đạt được nhiều kết quả tích cực, hệ thống Smart Logistics Platform vẫn tồn tại một số hạn chế nhất định do giới hạn về mặt thời gian và hạ tầng thử nghiệm:

1.  **Phụ thuộc vào Dịch vụ Bản đồ Bên thứ ba:** Khi tính toán ma trận khoảng cách giao thông đường bộ, hệ thống vẫn phụ thuộc vào hạn mức (Quota) mã truy cập của Goong Maps API. Trường hợp chuyển sang công thức tính đường chim bay (Haversine), độ chính xác về thời gian di chuyển trong giờ cao điểm bị giảm xuống.
2.  **Chưa tính đến các Yếu tố Thời tiết và Tắc đường Real-time:** Thuật toán AI hiện tại chủ yếu tính toán dựa trên ma trận khoảng cách và khung giờ hẹn cố định, chưa tự động điều chỉnh lộ trình khi có sự cố thiên tai, ngập lụt đột xuất hoặc tắc đường theo thời gian thực ngoài thực địa.
3.  **Giới hạn Thử nghiệm Hạ tầng:** Thử nghiệm chịu tải mới chỉ thực hiện trên máy chủ mô phỏng với 1.000 tài xế di chuyển đồng thời. Chưa có điều kiện thực nghiệm trên quy mô cực lớn (hàng chục ngàn tài xế trên toàn quốc) để đánh giá giới hạn băng thông mạng.

## 5.3. Hướng phát triển trong tương lai

Từ những hạn chế còn tồn tại và tiềm năng ứng dụng thực tế của đề tài, hướng phát triển tiếp theo của hệ thống Smart Logistics Platform tập trung vào các nội dung sau:

1\. Nâng cấp Thuật toán AI và Học Máy (Machine Learning ETA)

- Tích hợp các mô hình Học Máy (Machine Learning / Deep Learning) để dự báo thời gian cập bến dự kiến (ETA - Estimated Time of Arrival) chính xác hơn dựa trên dữ liệu lịch sử di chuyển và tình trạng giao thông theo từng khung giờ trong ngày.
- Phát triển thêm biến thể thuật toán VRP Động (Dynamic VRP**)** cho phép chèn thêm các đơn hàng phát sinh đột xuất vào lộ trình đang di chuyển của tài xế mà không cần phải chạy lại toàn bộ thuật toán từ đầu.

2\. Tích hợp Công nghệ IoT và Thiết bị Giám sát Hành trình (OBD-II / GPS Tracker)

- Kết nối trực tiếp với các thiết bị hộp đen định vị phần cứng (GPS Tracker) gắn trên xe tải hoặc cổng đọc dữ liệu phương tiện (OBD-II) để tự động theo dõi mức tiêu hao nhiên liệu, nhiệt độ thùng xe đông lạnh và cảnh báo hành vi lái xe an toàn.

3\. Tối ưu hóa Hạ tầng Microservices và Cloud Native

- Tách bộ giải toán AI Routing và dịch vụ định vị Real-time thành các dịch vụ nhỏ độc lập (Microservices), triển khai trên hạ tầng Kubernetes (K8s) giúp hệ thống tự động co giãn tài nguyên (Auto-scaling) khi lượng đơn hàng tăng đột biến trong các kỳ khuyến mãi lớn.

KẾT LUẬN, KIẾN NGHỊ

## Kết luận

Đề tài "Hệ thống điều vận và tối ưu hóa tuyến đường giao hàng tự động (Smart Logistics Platform - SLP)" đã trình bày một cách toàn diện từ cơ sở lý thuyết, phân tích khảo sát hiện trạng, thiết kế hệ thống đến triển khai và kiểm thử ứng dụng phần mềm thực tế. Qua quá trình thực hiện đề tài, nhóm nghiên cứu đã đạt được các kết quả nổi bật sau:

- **Số hóa thành công quy trình Điều hành & Logistics Chặng cuối:** Hệ thống đã giải quyết triệt để bất cập của phương pháp điều hành thủ công truyền thống bằng việc tự động hóa hoàn toàn quy trình từ khâu tiếp nhận đơn hàng, gom cụm đơn hàng tại kho trung chuyển, lập lộ trình di chuyển tối ưu cho tài xế đến khâu giám sát thời gian thực ngoài thực địa.
- **Ứng dụng hiệu quả Thuật toán AI Tối ưu hóa Tuyến đường (VRP Engine):** Đã làm chủ và cài đặt thành công bộ giải toán di truyền (Genetic Algorithm) kết hợp ma trận khoảng cách bản đồ số (Goong Maps API / Haversine Matrix), giải quyết bài toán VRP đa ràng buộc thỏa mãn đồng thời tải trọng xe (CVRP) và khung giờ hẹn của khách hàng (VRPTW). Kết quả thử nghiệm thực tế chứng minh thuật toán giúp giảm từ 28.5% đến 35.4% tổng quãng đường di chuyển, tiết kiệm đáng kể chi phí nhiên liệu và thời gian giao hàng.
- **Xây dựng Kiến trúc Hướng Sự kiện Chịu tải cao (High-Performance EDA):** Hệ thống giải quyết thành công điểm nghẽn nghẽn ghi đĩa cơ sở dữ liệu bằng cách kết hợp kết nối mạng song công Socket.io WebSockets với bộ lưu đệm Redis Cache In-Memory. Độ trễ phát sóng tọa độ định vị trên bản đồ giám sát đạt trung bình 28 ms đối với 100 tài xế di chuyển cùng lúc, mang lại trải nghiệm theo dõi thời gian thực mượt mượt mà.
- **Xây dựng Cơ sở Dữ liệu Không gian Chuẩn hóa và Đóng gói Hạ tầng:** Cơ sở dữ liệu bao gồm 34 bảng quan hệ được thiết kế chuẩn 3NF trên PostgreSQL 15 tích hợp mở rộng PostGIS, đi kèm các chỉ mục không gian (Spatial GIST Index) hỗ trợ truy vấn địa lý tốc độ cao. Toàn bộ hệ thống được đóng gói hoàn chỉnh bằng Docker Compose, sẵn sàng triển khai trên mọi môi trường máy chủ điện toán đám mây.

## Kiến nghị

Để đề tài tiếp tục được hoàn thiện và có thể đưa vào áp dụng rộng rãi trong đời sống kinh tế - xã hội, nhóm nghiên cứu xin đưa ra một số kiến nghị và đề xuất như sau:

- **Hỗ trợ Hạ tầng Thử nghiệm:** Đề xuất xem xét đầu tư hoặc kết nối các nguồn tài nguyên máy chủ đám mây (Cloud Server / High-Performance Computing Cluster) để sinh viên có điều kiện thực nghiệm các đồ án có quy mô xử lý dữ liệu lớn và chịu tải cao.
- **Đẩy mạnh Số hóa khâu Phân tuyến tự động:** Đề nghị các doanh nghiệp giao vận vừa và nhỏ sớm thay đổi tư duy quản lý thủ công, ứng dụng phần mềm có tích hợp thuật toán AI phân cụm và tối ưu lộ trình nhằm cắt giảm chi phí vận hành chặng cuối — khâu đang chiếm tỷ trọng chi phí cao nhất trong chuỗi cung ứng.
- **Chuẩn hóa Thiết bị Đầu cuối cho Tài xế:** Khuyến nghị các đơn vị vận tải trang bị thiết bị di động thông minh có định vị GPS và camera quét mã QR Code cho 100% tài xế, kết hợp quy trình xác thực bằng chứng giao hàng bằng ảnh chụp (PoD) để nâng cao tính minh bạch và uy tín dịch vụ.
- **Duy trì và Mở rộng Mã nguồn:** Nhóm cam kết tiếp tục duy trì, tối ưu hóa mã nguồn dự án, sẵn sàng phát triển thêm các mô-đun mở rộng như: Tích hợp Machine Learning dự báo thời gian giao hàng (ETA), Tích hợp thiết bị định vị phần cứng IoT trên xe tải và Triển khai tự động co giãn tài nguyên trên Kubernetes (K8s).

TÀI LIỆU THAM KHẢO