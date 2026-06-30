# **BÁO CÁO CHI TIẾT ĐỀ TÀI THỰC TẬP TỐT NGHIỆP**

## 1\. Tên đề tài đề xuất

Hệ thống điều vận và tối ưu hóa tuyến đường giao hàng tự động.

## 2\. Mô tả đề tài

### **2.1 Điểm đặc sắc và sự khác biệt của đề tài**

Hệ thống được xây dựng dựa trên tư duy giải quyết bài toán vận hành thực tế, mô phỏng lại mô hình điều vận cốt lõi của các doanh nghiệp Logistics lớn. Thay vì chỉ dừng lại ở một ứng dụng quản lý trạng thái đơn hàng tĩnh thông thường—nơi con người phải tự đọc địa chỉ rồi phân chia thủ công—đồ án này tập trung tự động hóa toàn bộ quy trình từ khâu phân loại hàng tại kho cho đến việc vạch lộ trình di chuyển ngoài đường cho tài xế nhờ sự kết hợp giữa Trí tuệ nhân tạo và Bản đồ số trực quan. Ý định cốt lõi của đề tài được thể hiện rõ nét qua ba ý sau:

**1\. Tự động hóa khâu phân chia, gom cụm hàng hóa tại kho (Clustering AI)**

Hệ thống giải quyết triệt để bài toán phân chia hàng hóa ngay tại kho trung chuyển bằng cách loại bỏ hoàn toàn công đoạn shipper phải tự sàng lọc đơn thủ công bằng mắt. Quy trình vận hành được thiết kế như sau: khi một đơn hàng được tạo, hệ thống Backend sẽ lập tức chuyển đổi địa chỉ văn bản thành tọa độ địa lý (Kinh độ/Vĩ độ) thông qua Geocoding API. Trước mỗi ca làm việc, hệ thống tự động kích hoạt Module AI để quét toàn bộ tập dữ liệu đơn hàng hiện có trong kho. Áp dụng thuật toán gom cụm không giám sát (như K-Means hoặc DBSCAN Cluster), hệ thống tự động phân tách hàng ngàn điểm tọa độ rời rạc thành các cụm dữ liệu mật độ cao dựa trên bán kính và khu vực địa lý đã thiết lập sẵn cho từng tài xế. Hàng hóa thuộc khu vực nào sẽ ngay lập tức được gán vào ca làm việc của tài xế phụ trách vùng đó, triệt tiêu hoàn toàn tình trạng trùng tuyến, chạy chéo địa bàn, giúp tối ưu hóa năng suất xếp dỡ tại bưu cục.

**2\. Số hóa Trung tâm điều hành và Trực quan hóa tiến độ (Real-time Command Center)**

Ý đồ tương tác giao diện được tập trung vào việc xây dựng một màn hình giám sát trực quan (Dashboard) dựa trên bản đồ số dành cho cấp quản lý. Khi bộ phận điều phối bấm lệnh "Tối ưu hóa", thuật toán VRP (Vehicle Routing Problem) sẽ giải quyết bài toán định tuyến đa ràng buộc (khối lượng đơn không vượt quá tải trọng xe, thời gian giao khớp với khung giờ hẹn của khách). Kết quả không trả về dạng bảng text thô sơ mà trực tiếp "vẽ" các đường đi (Routing Paths) kết nối các điểm giao lên bản đồ.

- **Ký hiệu điểm giao:** Mỗi đơn hàng trên tuyến của một shipper được hiển thị bằng một cột cờ (Marker) có đánh số thứ tự từ 1 đến N, đại diện cho chuỗi lộ trình di chuyển ngắn nhất đã được tối ưu.
- **Cơ chế phản hồi realtime:** Trải nghiệm thực tế được nâng cao tối đa nhờ luồng dữ liệu "sống" (Real-time Data Streaming). Khi tài xế hoàn thành giao hàng ngoài thực tế và bấm xác nhận trên Mobile App, sự kiện (Event) này lập tức được bắn về server. Trên màn hình quản trị của Admin, cột cờ tương ứng với điểm giao đó sẽ lập tức đổi sang màu xám và tối lại. Cơ chế này cho phép người điều phối chỉ cần nhìn lướt qua bản đồ là biết tài xế đang ở đâu, đã đi đến cờ số mấy, còn bao nhiêu cờ chưa hạ mà không cần phải gọi điện hay tra cứu báo cáo thủ công.

**3\. Kiến trúc hướng sự kiện chịu tải cao phía Backend (High-Performance EDA)**

Để hiện thực hóa ý đồ giám sát realtime cho hàng trăm tài xế di chuyển cùng lúc, kiến trúc hệ thống được thiết kế theo mô hình hướng sự kiện (EDA) nhằm xử lý điểm nghẽn thắt nút cổ chai (Bottleneck). Ứng dụng di động của tài xế sẽ thiết lập một kết nối song công liên tục qua Socket.io và tự động gửi tọa độ GPS về sau mỗi 3–5 giây. Để tránh việc ghi đĩa liên tục làm sập cơ sở dữ liệu chính (SQL Server), toàn bộ luồng dữ liệu tọa độ này sẽ được nạp trực tiếp vào bộ nhớ đệm Redis Cache (In-memory Database) với tốc độ đáp ứng micro giây. Server chỉ trích xuất dữ liệu từ Redis để phát sóng (Broadcast) về đúng các phòng giám sát (Socket Rooms) của Admin hoặc khách hàng đang theo dõi đơn đó, giúp tối ưu hóa tối đa băng thông đường truyền và đảm bảo tính sẵn sàng cao cho toàn hệ thống.

**2.2. Mục tiêu của đề tài**

- **Về mặt kỹ thuật tối ưu (Trí tuệ nhân tạo):** Giải quyết bài toán định tuyến xe đa ràng buộc (**Vehicle Routing Problem - VRP**). Đây là bài toán tối ưu hóa tổ hợp nhằm tìm ra chuỗi lộ trình di chuyển ngắn nhất cho một đội xe đi qua danh sách các điểm giao/nhận hàng rải rác. Để áp dụng vào thực tế vận hành, hệ thống tích hợp đồng thời hai biến thể ràng buộc cốt lõi:
- **Ràng buộc về tải trọng phương tiện (Capacitated VRP - CVRP):** Là điều kiện giới hạn sức chứa vật lý (khối lượng tối đa hoặc thể tích tối đa) của từng phương tiện giao hàng. Thuật toán bắt buộc phải tính toán sao cho tổng trọng lượng của các đơn hàng gán cho một tài xế không được phép vượt quá tải trọng của phương tiện mà họ đang sử dụng.
- **Ràng buộc về khung giờ giao hẹn trước của khách hàng (VRP with Time Windows - VRPTW):** Là điều kiện giới hạn về thời gian giao/nhận hàng tại từng điểm cụ thể do khách hàng hoặc đối tác quy định (ví dụ: chỉ nhận hàng trong khoảng từ 9 giờ đến 11 giờ). Thuật toán phải tính toán dựa trên vận tốc di chuyển và thời gian xử lý đơn ước tính để sắp xếp thứ tự các điểm dừng, đảm bảo tài xế đến nơi nằm trong đúng "cửa sổ thời gian" đã hẹn.

**Cơ chế xử lý đa ràng buộc trong thiết kế thuật toán:** Thay vì xử lý tuần tự theo thứ tự trước sau (dễ dẫn đến bế tắc thuật toán), hệ thống sẽ đánh giá đồng thời cả hai điều kiện: Tải trọng xe (CVRP) và Khung giờ hẹn (VRPTW). Trong mô hình thực tế này, cả hai điều kiện đều được thiết lập là Ràng buộc cứng (Hard Constraints).

Lý do là vì sức chứa vật lý của phương tiện (không thể chở quá tải trọng quy định) và giờ hẹn của khách hàng (giao trễ sẽ dẫn đến thất bại đơn hàng) đều là những yếu tố bắt buộc, không thể vi phạm trong vận hành thực tế.

Để giải quyết bài toán toán học này, thuật toán Di truyền (Genetic Algorithm) sẽ tích hợp các ràng buộc cứng vào Hàm thích nghi (Fitness Function) thông qua cơ chế Hàm phạt (Penalty Function). Trong quá trình tiến hóa và tìm kiếm không gian lời giải: Bất kỳ phương án lộ trình nào vi phạm một trong hai điều kiện (xe chở quá tải hoặc giao trễ giờ) đều sẽ bị hệ thống áp một mức điểm phạt cực lớn (High Penalty Cost), khiến độ thích nghi của chúng bị kéo giảm tối đa. Qua các cơ chế chọn lọc tự nhiên, lai ghép (Crossover) và đột biến (Mutation) diễn ra liên tục qua nhiều thế hệ, các phương án vi phạm này sẽ tự động bị đào thải.

Kết quả cuối cùng thu được từ thuật toán sẽ là chuỗi lộ trình di chuyển có chi phí (quãng đường/thời gian) tối ưu nhất, đồng thời đảm bảo thỏa mãn cả hai điều kiện: xe chở đúng tải trọng và tài xế đến đúng khung giờ hẹn.

**2.3. Phạm vi nghiên cứu và Thực nghiệm**

- **Đối tượng nghiên cứu:** Các thuật toán tối ưu hóa heuristic/meta-heuristic (như Thuật toán di truyền - Genetic Algorithm, Thuật toán đàn kiến - ACO) và các giải pháp xử lý dữ liệu thời gian thực (Socket.io, Redis Cache).
- **Phạm vi dữ liệu:** Thực nghiệm dựa trên dữ liệu mô phỏng tọa độ thực tế của các cửa hàng/kho bãi và người nhận tại khu vực đô thị (Ví dụ: TP. Hồ Chí Minh : Sử dụng API của gg map ).
- **Giới hạn đề tài:** Tập trung hoàn toàn vào luồng **Điều vận và Tối ưu lộ trình giao hàng**

**3\. Các đối tượng sử dụng hệ thống**

Hệ thống được thiết kế để phục vụ 4 nhóm đối tượng chính sau:

1.  **Quản trị hệ thống (Admin)**
2.  **Nhân viên (Staff)**
3.  **Khách hàng (Customer)**
4.  **Tài xế giao hàng (Shipper)**

### **4\. Phân rã chức năng chi tiết của từng đối tượng**

#### **4.1. Quản trị hệ thống (Admin)**

- - **Quản trị nhân sự:** Thêm, sửa, xóa, khóa và phân chia quyền hạn cụ thể cho các tài khoản Nhân viên (Staff) và Tài xế (Shipper).
    - **Quản lý khách hàng**: Xem danh sách, lịch sử đặt đơn hàng,trạng thái nhận đơn((Đã giao, đã hủy, boom hàng), khóa/mở khóa tài khoản khách hàng.
    - **Quản lý cấu hình hệ thống:**
- **Cấu hình tham số đầu vào cho thuật toán tối ưu AI**
- Bán kính phân cụm: Admin điều chỉnh khoảng cách tối đa (ví dụ: 2km hoặc 5km) để thuật toán AI quét và gom các đơn hàng rải rác lại với nhau trước khi phân phối cho tài xế theo từng vùng.
- Tham số thuật toán Di truyền (Genetic Algorithm Parameters): Cho phép hiệu chỉnh các chỉ số toán học của thuật toán tiến hóa nhằm tìm ra đường đi tối ưu. Admin có thể cấu hình
    - _Kích thước quần thể_ : Là tổng số lượng phương án lộ trình đường đi được hệ thống khởi tạo ngẫu nhiên ban đầu và duy trì qua mỗi thế hệ để sàng lọc.
    - _Số thế hệ tối đa :_ Là số lần tối đa mà thuật toán lặp đi lặp lại quá trình lai ghép và đột biến để tiến hóa (điểm dừng của thuật toán).
    - _Tỷ lệ đột biến_ : Xác suất để một lộ trình con tự động thay đổi ngẫu nhiên thứ tự các điểm giao hàng (đột biến cấu trúc).
    - _Tỷ lệ lai ghép_ : Xác suất để hai lộ trình bố mẹ "trao đổi" các đoạn đường tốt cho nhau nhằm sinh ra lộ trình con ưu việt hơn.

- **Cấu hình hạ tầng kỹ thuật và luồng dữ liệu**
- Chu kỳ đồng bộ GPS (GPS Sync Interval): Admin cấu hình khoảng thời gian (ví dụ: 3 giây, 5 giây hoặc 10 giây) để ứng dụng di động của tài xế tự động gửi tọa độ về máy chủ.
- **Quản lý API Keys bản đồ số:**

Nơi lưu trữ và thay đổi các chuỗi khóa bảo mật (API Keys) kết nối với các dịch vụ bản đồ bên thứ ba (như Google Maps API, Mapbox API, hoặc OpenStreetMap). Chức năng này giúp Admin chủ động thay đổi mã cấu hình khi hết hạn mức hoặc chuyển đổi giữa các nơi cung cấp bản đồ.

**Báo cáo thống kê:** Cung cấp các biểu đồ trực quan về doanh thu, hiệu suất làm việc của shipper, và tỷ lệ đơn hàng giao thành công/thất bại theo thời gian.

#### **4.2. Nhân viên (Staff)**

- **Quản lý đơn hàng và Kho:** Tiếp nhận đơn hàng từ hệ thống, phân loại hàng hóa và cập nhật trạng thái nhập/xuất kho trung chuyển.
- **Kích hoạt định tuyến tự động:** Là nút lệnh cho phép Admin kích hoạt bộ não AI chạy ngầm nhằm tự động hóa hoàn toàn khâu chia đơn và xếp lịch trình cho đội ngũ tài xế.
- **Giám sát thời gian thực:** Theo dõi vị trí di chuyển của toàn bộ đội ngũ Shipper trên bản đồ số thông qua kết nối Socket.
- **Điều phối và Xử lý sự cố:** Tiếp nhận thông báo sự cố từ tài xế để can thiệp thủ công (thay đổi shipper giữa chừng, hủy chuyến hoặc điều chỉnh lại lộ trình) nhằm đảm bảo tiến độ đơn hàng.

#### **4.3. Khách hàng (Customer)**

- **Người gửi hàng:**
    - _Quản lý đơn hàng:_ Tạo đơn hàng mới (lẻ hoặc hàng loạt), in mã vận đơn (QR code), hủy hoặc sửa đổi thông tin đơn hàng trước khi tài xế lấy hàng.
    - _Yêu cầu lấy hàng:_ Đặt lịch hẹn và gửi yêu cầu hệ thống điều phối Shipper đến tận địa chỉ để gom hàng về kho trung trung chuyển.
- **Người nhận hàng:**
    - _Tra cứu hành trình đơn hàng:_ Nhập mã vận đơn để kiểm tra trạng thái xử lý trực quan của gói hàng theo thời gian thực (Ví dụ: Đang ở kho -> Đang đi giao).
    - _Theo dõi Shipper thực tế:_ Khi đơn hàng chuyển sang trạng thái "Đang đi giao" và nằm trong lượt xử lý kế tiếp, người nhận có thể xem vị trí realtime của Shipper trên bản đồ để chủ động sắp xếp thời gian đón nhận.

#### **4.4. Tài xế giao hàng (Shipper)**

- **Tiếp nhận Ca và Lộ trình:** Nhận danh sách các đơn hàng cần xử lý (giao/nhận) được sắp xếp sẵn theo thứ tự di chuyển tối ưu nhất từ lõi xử lý AI.
- **Bản đồ điều hướng:** Tích hợp bản đồ điều hướng thông minh, tự động vạch tuyến đường đi ngắn nhất từ vị trí hiện tại đến điểm giao kế tiếp khi tài xế tương tác với đơn hàng.
- **Cập nhật trạng thái đơn hàng:** Sử dụng camera quét mã QR code trên gói hàng để chuyển nhanh trạng thái đơn (Đã lấy hàng -> Đang giao -> Giao thành công / Thất bại kèm hình ảnh minh chứng và tọa độ định vị lúc ký nhận).
- **Đồng bộ tọa độ di chuyển chạy ngầm (Background Location):** Tự động thu thập tọa độ GPS của thiết bị theo chu kỳ (3-5 giây/lần) khi đang trong ca làm việc và truyền về máy chủ qua WebSockets kể cả khi tắt màn hình, phục vụ cho việc giám sát.

**Lý thuyết (Dự kiến):**  
\-Tìm hiểu nghiệp vụ điều vận, giao nhận hàng hóa trong lĩnh vực Logistics (quy trình từ kho trung chuyển đến giao hàng tận nơi)

\-Tìm hiểu ngôn ngữ lập trình TypeScript, Node.js và Express.js

\-Tìm hiểu ReactJS để xây dựng giao diện trung tâm điều hành

\-Tìm hiểu RESTful API

\-Tìm hiểu hệ quản trị cơ sở dữ liệu PostgreSQL

\-Tìm hiểu giao tiếp thời gian thực với WebSocket và Socket.io

\-Tìm hiểu Geocoding API (chuyển đổi địa chỉ văn bản thành tọa độ Kinh độ/Vĩ độ)

\-Tìm hiểu thuật toán gom cụm không giám sát (K-Means, DBSCAN) để phân chia đơn hàng theo khu vực

\-Tìm hiểu thuật toán di truyền (Genetic Algorithm) và thuật toán đàn kiến (ACO) để tối ưu hóa lộ trình

\-Tìm hiểu công nghệ phát triển ứng dụng di động cho tài xế (Flutter)

**Thực hành(dự kiến):**  
Phân tích và thiết kế hệ thống.

\-Cài đặt các chức năng của Khách hàng (Customer): Tạo đơn hàng mới (lẻ hoặc hàng loạt), in mã vận đơn (QR code), sửa/hủy đơn trước khi shipper lấy hàng, đặt lịch hẹn yêu cầu lấy hàng tận nơi, tra cứu hành trình đơn hàng theo thời gian thực, theo dõi vị trí shipper trên bản đồ...

\-Cài đặt các chức năng của Tài xế giao hàng (Shipper): Tiếp nhận ca làm việc và lộ trình đã được tối ưu sẵn, sử dụng bản đồ điều hướng vạch tuyến đường ngắn nhất, quét QR code cập nhật trạng thái đơn hàng (đã lấy / đang giao / thành công / thất bại kèm hình ảnh và tọa độ), đồng bộ tọa độ GPS chạy ngầm về máy chủ...

\-Cài đặt các chức năng của Nhân viên (Staff): Tiếp nhận và phân loại đơn hàng, cập nhật trạng thái nhập/xuất kho trung chuyển, kích hoạt định tuyến tự động bằng AI, giám sát vị trí đội ngũ shipper trên bản đồ số, điều phối và xử lý sự cố (đổi shipper, hủy chuyến, điều chỉnh lộ trình)...

\-Cài đặt các chức năng của Quản trị hệ thống (Admin): Quản trị nhân sự (Staff, Shipper) và phân quyền, quản lý khách hàng, cấu hình tham số thuật toán AI (bán kính phân cụm, tham số thuật toán di truyền), cấu hình hạ tầng kỹ thuật (chu kỳ đồng bộ GPS, API Keys bản đồ số), báo cáo thống kê doanh thu và hiệu suất...