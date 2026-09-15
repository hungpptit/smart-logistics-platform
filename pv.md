# 🎯 BỘ CÂU HỎI & HƯỚNG DẪN TRẢ LỜI PHỎNG VẤN KỸ THUẬT (TECHNICAL INTERVIEW)
**Vị trí**: Fullstack Software Engineer – Smart Logistics Platform (SLP)  
**Dự án**: Nền tảng Logistics Thông Minh (SLP)  
**Mục tiêu**: Hướng dẫn trả lời phỏng vấn theo đúng cấu trúc **3 Module lõi AI** thực tế của hệ thống, kết hợp kỹ thuật xử lý dữ liệu lớn, GPS Telemetry thời gian thực và kiến trúc Clean Architecture.

---

## 📌 TỔNG QUAN HỒ SƠ ỨNG VIÊN (CV PROFILE)
> - **Kiến trúc & CSDL**: Thiết kế CSDL PostgreSQL 15 chuẩn 3NF và tầng Backend (Express.js, TypeScript) theo Clean Architecture & DDD; xây dựng React SPA Dispatcher Dashboard tích hợp radar tracking thời gian thực.
> - **Lõi AI tối ưu hóa vận tải 3 Module**: Thuần TypeScript (`DBSCAN + K-Means` $\rightarrow$ `Genetic Algorithm` $\rightarrow$ `Lọc & Xếp hạng điều kiện / Hungarian Algorithm`), cắt giảm **58.2%** quãng đường vận chuyển cho 500+ đơn hàng/ngày.
> - **Đường ống GPS Telemetry & Message Broker**: Xử lý trên Redis (**1.321 tọa độ/giây**, độ trễ **P99 < 1ms**) và hàng đợi RabbitMQ; tuân thủ quy trình Git branching và PR review.

---

## 🧠 BẢNG KIẾN TRÚC LÕI AI 3 MODULE (ĐIỂM NHẤN CỐT LÕI)

Khi nhà tuyển dụng hỏi: *"Hãy trình bày luồng xử lý của hệ thống AI/Routing từ lúc nhận đơn đến khi tài xế nhận cuốc?"*, bạn hãy trình bày mạch lạc theo đúng bảng sau:

| Tiêu chí | MODULE 1 | MODULE 2 | MODULE 3 |
| :--- | :--- | :--- | :--- |
| **TÊN** | **Phân cụm địa lý** | **Tối ưu lộ trình** | **Phân công tài xế** |
| **PHƯƠNG PHÁP** | **DBSCAN + K-Means** | **Genetic Algorithm (GA)** | **Lọc & xếp hạng điều kiện** *(kèm ma trận chi phí Hungarian)* |
| **INPUT** | Danh sách $N$ đơn hàng chờ giao | $K$ nhóm đơn theo khu vực | Lộ trình + Tài xế đang rảnh |
| **OUTPUT** | $K$ nhóm đơn theo khu vực | Thứ tự giao hàng tối ưu | Gửi lộ trình $\rightarrow$ App Tài xế |

---

## 🚀 PHẦN 1: BỘ CÂU HỎI VÀ ĐÁP ÁN THEO 3 MODULE LÕI AI

### 🔹 CÂU HỎI TỔNG QUAN: *"Bạn hãy trình bày kiến trúc tổng thể của hệ thống Dispatching & AI Routing?"*
* **Cách trả lời ăn điểm**:
  > *"Hệ thống Dispatching của em được chia làm **3 Module liên hoàn**, mỗi module giải quyết triệt để một bài toán con:
  > - **Module 1 (Phân cụm địa lý)**: Nhận đầu vào là danh sách $N$ đơn hàng chờ giao gom trong ngày. Sử dụng thuật toán lai **DBSCAN + K-Means** để gom đơn theo mật độ địa lý tự nhiên, lọc đơn ngoại lai và chia nhỏ thành $K$ nhóm đơn tương ứng với sức chứa phương tiện.
  > - **Module 2 (Tối ưu lộ trình)**: Nhận đầu vào là từng nhóm đơn từ Module 1. Sử dụng **Genetic Algorithm (GA)** để giải bài toán hành trình (CVRP-TW), tìm ra chuỗi thứ tự giao hàng có cự ly và thời gian ngắn nhất.
  > - **Module 3 (Phân công tài xế)**: Nhận lộ trình đã tối ưu và danh sách tài xế đang rảnh (Active). Tiến hành **Lọc & xếp hạng điều kiện** (bằng lái, loại xe, tải trọng) kết hợp giải thuật **Hungarian Algorithm** trên ma trận chi phí để gán xe tối ưu toàn cục, sau đó bắn Dispatch Job trực tiếp về App Tài xế."*

---

### 🔹 MODULE 1: PHÂN CỤM ĐỊA LÝ (`DBSCAN + K-Means`)

#### Câu hỏi 1: *"Tại sao ở Module 1 bạn lại phối hợp cả DBSCAN và K-Means mà không dùng riêng một thuật toán?"*
* **Bản chất phỏng vấn**: Kiểm tra xem bạn có hiểu giới hạn vật lý và toán học của từng thuật toán phân cụm không.
* **Câu trả lời chuẩn theo Codebase**:
  > *"Trong bài toán gom đơn thực tế:
  > 1. **DBSCAN thuần túy**: Ưu điểm là tự tìm cụm theo mật độ tự nhiên ($\epsilon = 3.0\text{km}, MinPts = 2$) mà không cần ấn định trước số xe, đặc biệt là tự động tách biệt được các điểm ngoại lai (`Noise Points` – ví dụ 1 đơn đơn lẻ nằm ở ngoại thành cách 18km). Nhưng DBSCAN có nhược điểm chí mạng là **không khống chế được số lượng cụm $K$ theo số tài xế** và **không có cơ chế ràng buộc tải trọng xe**.
  > 2. **K-Means tiếp quản (Capacity-Constrained)**: Giúp khống chế số cụm sinh ra không vượt quá số lượng phương tiện khả dụng ($K$). Nếu tổng khối lượng hàng trong một cụm vượt quá 50kg (định mức xe máy), K-Means tự động tách thành 2 cụm riêng biệt.
  > 3. **Xử lý Outlier**: Thuật toán Hybrid tự động dung nạp (reconcile) các đơn `Noise Point` của DBSCAN vào cụm có cự ly gần nhất, triệt tiêu 100% rủi ro bỏ sót đơn của khách."*

---

### 🔹 MODULE 2: TỐI ƯU LỘ TRÌNH (`Genetic Algorithm`)

#### Câu hỏi 2: *"Input và Output của Module 2 là gì? Thiết kế giải thuật Di truyền (GA) như thế nào để đảm bảo không mất đơn và chạy mượt trên Node.js?"*
* **Bản chất phỏng vấn**: Đánh giá kiến thức về cấu trúc dữ liệu nhiễm sắc thể (Chromosome) trong bài toán hoán vị (Permutation TSP) và tính chất Single-threaded của Node.js.
* **Câu trả lời chuẩn theo Codebase**:
  > *"Module 2 nhận Input là **$K$ nhóm đơn hàng theo khu vực** từ Module 1 và trả về Output là **Thứ tự giao hàng tối ưu** (Stops Sequence) cho từng xe qua quy trình 5 bước:
  > 1. **Bước 1 - Lập ma trận khoảng cách**: Đo cự ly thực tế giữa tất cả các cặp điểm dừng và kho xuất phát.
  > 2. **Bước 2 - Khởi tạo quần thể ban đầu**: Tạo ngẫu nhiên 200 phương án lộ trình hoán vị các điểm dừng (VD: Kho $\rightarrow$ C $\rightarrow$ A $\rightarrow$ E $\rightarrow$ B $\rightarrow$ Kho).
  > 3. **Bước 3 - Chấm điểm hàm thích nghi (Fitness)**: 
  >    - Công thức: $\text{Fitness} = \text{Quãng đường (km)} + \text{Phạt quá tải} + \text{Phạt trễ giờ}$.
  >    - Tiêu chí: **Fitness càng thấp càng tốt**.
  >    - Nếu phương án vi phạm tải trọng hoặc trễ khung giờ cam kết, cộng hệ số phạt cực lớn $M = 10^6$ (hàng chục triệu điểm phạt) để phương án xấu này tự động bị đào thải ngay lập tức.
  > 4. **Bước 4 - Tiến hóa qua 500 thế hệ**: Áp dụng Chọn lọc $\rightarrow$ Lai ghép bảo toàn thứ tự (**Order Crossover - OX**) $\rightarrow$ Đột biến (**Swap Mutation**) $\rightarrow$ Tối ưu cục bộ (**2-Opt Local Search**).
  > 5. **Bước 5 - Trích xuất kết quả**: Lấy phương án có Fitness thấp nhất (quãng đường ngắn nhất, 0 vi phạm) gửi ra ngoài. Quá trình hội tụ chỉ mất khoảng **~140ms**, không gây nghẽn Event Loop của Node.js và giảm **58.2% tổng quãng đường** so với lộ trình FIFO ban đầu."*

---

#### ❓ Câu hỏi xoáy 2.1: *"Toán tử lai ghép Order Crossover (OX) hoạt động thế nào và tại sao không dùng cắt đôi ghép lại thông thường?"*
* **Bản chất phỏng vấn**: Bắt bài kiến thức hoán vị danh sách điểm giao (Permutation Integrity).
* **Câu trả lời xuất sắc**:
  > *"Trong bài toán giao hàng, mỗi điểm dừng chỉ được ghé thăm đúng 1 lần. Nếu cắt đôi ghép lại thông thường (nửa đầu Bố + nửa sau Mẹ), Con sẽ bị lỗi nghiêm trọng: **trùng lặp điểm giao này nhưng lại bỏ quên điểm giao khác**.
  > 
  > **Cơ chế OX giải quyết triệt để vấn đề này qua 3 bước** (Giả sử cần giao 5 điểm A, B, C, D, E):
  > 1. **Bốc đoạn gen tốt từ Bố**: Lấy một chuỗi con đi kề nhau tối ưu của Bố, ví dụ `[ A → B → C ]`, dán thẳng vào các vị trí đầu của Con: `[ A , B , C , _ , _ ]`.
  > 2. **Soi lộ trình của Mẹ để lấp chỗ trống**: Quét danh sách của Mẹ (ví dụ Mẹ là `E → D → A → C → B`):
  >    - Gặp **E**: Con chưa có $\rightarrow$ Điền vào chỗ trống thứ 4: `[ A , B , C , E , _ ]`.
  >    - Gặp **D**: Con chưa có $\rightarrow$ Điền vào chỗ trống thứ 5: `[ A , B , C , E , D ]`.
  >    - Gặp **A, C, B**: Con đã có từ Bố $\rightarrow$ Tự động bỏ qua.
  > 3. **Kết quả**: Con sinh ra là `Kho → [ A → B → C ] → E → D → Kho`, kế thừa trọn vẹn đoạn đường ngắn `[ A → B → C ]` của Bố, các điểm còn lại theo thứ tự Mẹ, và đảm bảo **đủ 100% các điểm, không trùng, không sót**."*

---

#### ❓ Câu hỏi xoáy 2.2: *"Lỡ như việc lai ghép OX sinh ra đoạn nối xấu (ví dụ từ C $\rightarrow$ D thực tế gần hơn C $\rightarrow$ E, nhưng do lấp chỗ trống từ Mẹ nên Con lại thành C $\rightarrow$ E) thì hệ thống xử lý thế nào?"*
* **Bản chất phỏng vấn**: Kiểm tra xem bạn có hiểu cách GA thoát khỏi nghiệm xấu/cực trị địa phương (Local Optima) hay chỉ nghĩ GA là một bước ghép cứng nhắc.
* **Câu trả lời xuất sắc**:
  > *"Toán tử OX chỉ có nhiệm vụ **bảo toàn tính toàn vẹn** của các điểm dừng chứ không cam kết sinh ra một cá thể hoàn hảo ngay lập tức. Nếu lộ trình Con bị rơi vào phương án đi xa hơn ($C \rightarrow E$ thay vì $C \rightarrow D$), hệ thống có **3 cơ chế tự động sửa sai và đào thải** sau đây:
  > 
  > 1. **Cơ chế 1 - Sàng lọc qua Hàm Fitness qua nhiều thế hệ**:
  >    - Trong 1 thế hệ có 200 cá thể, có đứa con khác được lai tạo từ cặp cha mẹ khác đi đường $C \rightarrow D$ ngắn hơn (Fitness thấp hơn).
  >    - Đứa con đi $C \rightarrow E$ bị điểm Fitness cao hơn sẽ tự động bị đào thải ở các thế hệ sau, nhường chỗ cho đứa con $C \rightarrow D$ sống sót và nhân bản.
  > 2. **Cơ chế 2 - Đột biến hoán vị (Swap Mutation)**:
  >    - Thuật toán có tỷ lệ đột biến ngẫu nhiên (thường từ 2% – 5%), tự động bốc 2 vị trí bất kỳ trong mảng để tráo đổi cho nhau.
  >    - Nhánh đột biến sẽ hoán đổi vị trí giữa E và D: `... → C → [ E ] → [ D ]` trở thành `... → C → [ D ] → [ E ]`. Khi khoảng cách đột ngột ngắn lại, cá thể này lập tức có Fitness vượt trội và vươn lên dẫn đầu.
  > 3. **Cơ chế 3 - Bộ tối ưu cục bộ 2-Opt Local Search (Cài đặt trong `vrp.service.ts`)**:
  >    - Sau mỗi chu kỳ di truyền, thuật toán áp dụng thuật toán `2-Opt` duyệt nhanh các cạnh kề nhau.
  >    - Nếu phát hiện 2 đoạn đường đang bắt chéo nhau gây tốn cự ly ($C \rightarrow E$ và $E \rightarrow D$), `2-Opt` sẽ lập tức bẻ chéo (untangle) và đảo ngược thứ tự thành $C \rightarrow D$ và $D \rightarrow E$ chỉ trong vài micro giây."*

---

### 🔹 MODULE 3: PHÂN CÔNG TÀI XẾ (`Lọc & Xếp hạng điều kiện` + `Hungarian Algorithm`)

#### Câu hỏi 3: *"Module 3 lọc điều kiện tài xế ra sao và cơ chế gán cuốc hoạt động như thế nào trước khi đẩy về App Tài xế?"*
* **Bản chất phỏng vấn**: Kiểm tra nghiệp vụ logistics thực tế: điều kiện phương tiện, định vị GPS tài xế và tính tối ưu toàn cục.
* **Câu trả lời chuẩn theo Codebase**:
  > *"Module 3 nhận Input là **Lộ trình đã tối ưu** và **Danh sách tài xế đang rảnh** (trong ca làm việc). Quy trình gồm 3 bước:
  > 1. **Bước 1 - Lọc & Xếp hạng điều kiện cứng/mềm**:
  >    - **Vị trí tài xế**: Kiểm tra tọa độ GPS gần nhất (< 30 phút). Nếu không có, lấy tọa độ bưu cục/kho xuất phát.
  >    - **Phân hạng bằng lái & loại xe**: Phân biệt tài xế xe máy (`A1/A2` hoặc loại `HUB_DELIVERY`) với tài xế xe tải.
  >    - **Ràng buộc tải trọng**: Nếu tổng khối lượng hàng của cụm vượt quá sức chứa phương tiện (`maxWeight`), thuật toán cộng một mức phạt cực lớn (`capacityPenalty = 1.000.000`) vào ma trận chi phí để ngăn chặn việc gán sai xe.
  > 2. **Bước 2 - Giải thuật ghép cặp tối ưu toàn cục (Hungarian Algorithm)**:
  >    - Xây dựng ma trận chi phí $N \times K$ giữa vị trí hiện tại của tài xế đến điểm lấy hàng đầu tiên của cụm.
  >    - Sử dụng thuật toán Hungarian (Kuhn-Munkres) với độ phức tạp $O(V^3)$ để tìm phương án ghép có **tổng chi phí tiếp cận nhỏ nhất toàn cục**, giải quyết triệt để lỗi của thuật toán tham lam Greedy (tránh tình trạng tài xế cuối cùng bị đẩy đi quá xa).
  > 3. **Bước 3 - Dispatching**:
  >    - Tạo bản ghi phân công và bắn Socket/Push Notification lộ trình đã gán trực tiếp về thiết bị của tài xế (App Tài xế)."*

---

## ⚡ PHẦN 2: GPS TELEMETRY PIPELINE (REDIS 1.321 PINGS/S & RABBITMQ)

#### Câu hỏi 4: *"Con số 1.321 tọa độ/giây và P99 < 1ms đo đạc thế nào? Tại sao cần dùng cả Redis lẫn RabbitMQ?"*
* **Câu trả lời chuẩn theo Codebase**:
  > *"1. **Đo đạc thực nghiệm (Benchmark)**:
  >    - Được đo bằng script `verify_real_metrics.ts` sử dụng thư viện `perf_hooks` với 2.000 pings liên tục vào Redis in-memory. Kết quả đạt P50 ~0.2ms, P90 ~0.4ms và P99 luôn duy trì dưới 0.9ms.
  > 2. **Phân tách luồng Hot-Path và Cold-Path**:
  >    - **Hot-Path (Realtime)**: GPS từ tài xế gửi qua Socket.io được ghi $O(1)$ vào Redis (`driver:location:{routeId}` để tra cứu vị trí tức thời; `active_routes_location_tracking` để quản lý xe active) và phát trực tiếp lên Dispatcher Radar Dashboard (`io.to('admin:monitoring')`).
  >    - **Cold-Path (Lưu trữ DB)**: Nếu 1.321 pings/giây đều `INSERT` trực tiếp vào PostgreSQL thì Database sẽ sập Connection Pool và nghẽn Disk I/O. Do đó dữ liệu được đẩy vào hàng đợi **RabbitMQ** (`durable: true`). Các Worker chạy nền sẽ lấy dữ liệu và thực hiện **Batch Insert (50-100 bản ghi/lần)** vào DB theo chu kỳ."*

---

## 🏛️ PHẦN 3: KIẾN TRÚC & FRONTEND

#### Câu hỏi 5: *"Hệ thống áp dụng Clean Architecture và tối ưu giao diện Radar Dashboard trên React SPA như thế nào?"*
* **Câu trả lời chuẩn theo Codebase**:
  > *"1. **Clean Architecture**:
  >    - **Transport Layer**: `controllers/`, `gateways/` chỉ nhận request/event và validate bằng `class-validator`, không chứa logic.
  >    - **Domain Services**: Lõi AI (`dbscan.service`, `kmeans.service`, `vrp.service`, `assignment.service`) viết thuần TypeScript, độc lập hoàn toàn với framework HTTP.
  >    - **Infrastructure Layer**: Đóng gói kết nối Prisma (PostgreSQL), Redis và RabbitMQ.
  > 2. **Tối ưu Radar Dashboard**:
  >    - Dùng **Room-based Socket** để Dispatcher chỉ nhận dữ liệu của khu vực đang xem.
  >    - Quản lý các Marker bản đồ bằng `useRef` và cập nhật vị trí trực tiếp qua `marker.setLatLng()` kết hợp `requestAnimationFrame`, không gọi `setState` liên tục để tránh hiện tượng re-render bão hòa DOM."*

---

#### ❓ Câu hỏi xoáy 5.1: *"Tại sao bạn lại viết các thuật toán AI/Routing (DBSCAN, K-Means, GA, Hungarian) thuần TypeScript trên Node.js mà không dựng một microservice riêng bằng Python (FastAPI/Flask)?"*
* **Bản chất phỏng vấn**: Đánh giá tư duy thiết kế hệ thống (Trade-off & Architectural Decision), kiểm tra xem bạn chọn công nghệ theo phong trào hay dựa trên bài toán thực tế.
* **Câu trả lời xuất sắc**:
  > *"Em quyết định viết thuần TypeScript trong tầng Domain Service vì 5 lý do cốt lõi sau:
  > 
  > 1. **Triệt tiêu hoàn toàn độ trễ mạng và chi phí ép kiểu (Zero Network & Serialization Overhead)**:
  >    - Nếu tách riêng Python Service, mỗi lượt điều phối cần: `Serialize hàng trăm đơn ra JSON → Bắn HTTP/gRPC qua mạng → Python Parse JSON → Tính toán → Serialize kết quả → Bắn ngược về Node.js`.
  >    - Việc này tạo thêm độ trễ mạng và tốn CPU cho Serialization. Viết thuần TypeScript giúp thuật toán chạy **trực tiếp In-Memory**, gọi hàm tức thì không mất thêm một micro-giây network hop nào.
  > 2. **Tốc độ CPU: V8 JIT Engine của Node.js nhanh hơn CPython thuần túy**:
  >    - Nhiều người lầm tưởng Python luôn nhanh hơn, nhưng thực chất Python chỉ nhanh khi gọi thư viện viết bằng C/C++ (như NumPy). Đối với các vòng lặp for, hoán vị mảng và toán tử di truyền (GA, 2-Opt), **CPython chạy chậm hơn Node.js từ 5 – 10 lần**.
  >    - Node.js sử dụng Google V8 Engine với cơ chế **JIT Compilation** biên dịch trực tiếp ra mã máy (Machine Code), giúp GA 500 thế hệ hội tụ chỉ trong **~140ms**.
  > 3. **Bản chất thuật toán không cần GPU hay Deep Learning**:
  >    - Đây là các thuật toán tối ưu hóa tổ hợp và heuristic đại số (`DBSCAN`, `K-Means`, `GA`, `Hungarian`), không phải mô hình mạng nơ-ron sâu (Neural Networks) cần huấn luyện trên GPU (như PyTorch hay TensorFlow), nên Python không mang lại lợi thế phần cứng.
  > 4. **Bảo toàn tính toàn vẹn kiểu dữ liệu (End-to-End Type Safety)**:
  >    - Tái sử dụng 100% Type định nghĩa từ Prisma ORM (`Order`, `Vehicle`, `DriverLocation`). Mọi thay đổi schema CSDL đều được TypeScript kiểm tra lỗi lúc biên dịch (Compile-time checking), tránh nguy cơ lệch cấu trúc dữ liệu giữa 2 service.
  > 5. **Tối ưu chi phí hạ tầng & Vận hành (DevOps Overhead)**:
  >    - Tiết kiệm chi phí vận hành: Không phải triển khai, giám sát (monitoring) và cân bằng tải cho thêm một cụm container Python riêng biệt.
  >    - **Khả năng mở rộng (Extensibility)**: Vì đã tuân thủ Clean Architecture phân tách rõ tầng Domain Service, nếu sau này quy mô công ty mở rộng lên hàng chục ngàn đơn/giây cần dùng đến solver chuyên biệt (như Google OR-Tools trên C++), ta có thể bóc tách lõi này ra một Worker Service độc lập cực kỳ dễ dàng mà không làm ảnh hưởng đến tầng Controller hay Database."*

---

## 📋 CHEAT SHEET "TRẢ LỜI NHANH" TRONG PHÒNG PHỎNG VẤN

| Bước trong Pipeline | Input | Công nghệ / Thuật toán | Output |
| :--- | :--- | :--- | :--- |
| **Module 1** | $N$ đơn hàng chờ giao | `DBSCAN` ($\epsilon = 3\text{km}$) + `Capacity-Constrained K-Means` | $K$ nhóm đơn gom theo vùng, cân bằng tải 50kg, hòa nhập Outlier. |
| **Module 2** | $K$ nhóm đơn theo vùng | `Genetic Algorithm` (Order Crossover OX, 2-Opt local search) | Thứ tự giao hàng tối ưu (giảm 58.2% cự ly, hội tụ 140ms). |
| **Module 3** | Lộ trình + Tài xế rảnh | Lọc bằng lái/loại xe + Ma trận phạt tải trọng + `Hungarian Algorithm` $O(V^3)$ | Phân công tối ưu toàn cục $\rightarrow$ Bắn về App Tài xế. |
| **Realtime Stream** | GPS ping tần số cao | `Redis` (Hash/Set/List) + `Socket.io Room` + `RabbitMQ Batch Worker` | P99 < 1ms, 1.321 pings/s, bảo vệ PostgreSQL không bị nghẽn I/O. |
