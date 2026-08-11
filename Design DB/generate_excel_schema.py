import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def build_excel():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Database Schema"
    ws.views.sheetView[0].showGridLines = True

    # Styles
    title_font = Font(name="Segoe UI", size=11, bold=True, color="1F4E78")
    title_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    
    header_font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
    
    data_font = Font(name="Segoe UI", size=9, color="000000")
    
    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )

    tables_data = [
        # 1. users
        {
            "name": "users (Tài khoản người dùng)",
            "headers": ["id", "username", "email", "password_hash", "full_name", "phone", "avatar_url", "status", "role_id", "last_login_at", "created_at", "updated_at", "deleted_at"],
            "rows": [
                ["usr-01", "hung_admin", "hung.pham@smartlog.com", "$2b$10$e8N0Y9z...", "Phạm Tuấn Hưng", "0987654321", "https://storage.smartlog.com/avatars/user_101.jpg", "ACTIVE", "rol-01", "2026-07-24 08:30:00", "2026-07-01 10:00:00", "2026-07-24 08:30:00", None],
                ["usr-02", "staff_kho_tbd", "minh.staff@smartlog.com", "$2b$10$f9O1Z0a...", "Nguyễn Văn Minh", "0912345678", None, "ACTIVE", "rol-02", "2026-07-24 07:45:00", "2026-07-05 09:00:00", "2026-07-24 07:45:00", None],
                ["usr-03", "shipper_nam", "nam.shipper@smartlog.com", "$2b$10$g0P2A1b...", "Lê Văn Nam", "0938123456", None, "ACTIVE", "rol-04", "2026-07-24 06:15:00", "2026-07-10 14:00:00", "2026-07-24 06:15:00", None],
                ["usr-04", "kh_vinamilk", "mai@vinamilk.com", "$2b$10$h1Q3B2c...", "Công ty Vinamilk", "0912345678", None, "ACTIVE", "rol-03", "2026-07-24 09:00:00", "2026-07-02 11:00:00", "2026-07-24 09:00:00", None],
                ["usr-05", "shipper_tuan", "tuan.shipper@smartlog.com", "$2b$10$i2R4C3d...", "Trần Anh Tuấn", "0977112233", None, "ACTIVE", "rol-04", "2026-07-24 06:00:00", "2026-07-12 10:00:00", "2026-07-24 06:00:00", None]
            ]
        },
        # 2. roles
        {
            "name": "roles (Danh mục Vai trò người dùng)",
            "headers": ["id", "role_code", "role_name", "created_at"],
            "rows": [
                ["rol-01", "ADMIN", "Quản trị viên hệ thống", "2026-07-01 10:00:00"],
                ["rol-02", "STAFF", "Nhân viên điều vận bưu cục", "2026-07-01 10:00:00"],
                ["rol-03", "CUSTOMER", "Khách hàng người gửi", "2026-07-01 10:00:00"],
                ["rol-04", "SHIPPER", "Tài xế giao hàng chặng cuối", "2026-07-01 10:00:00"],
                ["rol-05", "MANAGER", "Quản lý trung tâm khai thác", "2026-07-01 10:00:00"]
            ]
        },
        # 3. permissions
        {
            "name": "permissions (Quyền hạn hệ thống)",
            "headers": ["id", "permission_code", "permission_name", "description", "created_at"],
            "rows": [
                ["per-01", "ORDER_CREATE", "Tạo đơn hàng", "Cho phép tạo đơn hàng mới trên hệ thống", "2026-07-01 10:00:00"],
                ["per-02", "AI_ROUTE_OPTIMIZE", "Chạy thuật toán AI Routing", "Cho phép kích hoạt K-Means + GA tối ưu tuyến đường", "2026-07-01 10:00:00"],
                ["per-03", "SHIPMENT_APPROVE", "Duyệt vận đơn trung chuyển", "Duyệt chuyến gom hàng luân chuyển kho", "2026-07-01 10:00:00"],
                ["per-04", "DRIVER_ASSIGN", "Phân công ca làm việc Shipper", "Gán lộ trình và phương tiện cho tài xế", "2026-07-01 10:00:00"],
                ["per-05", "SYSTEM_SETTING_EDIT", "Cấu hình tham số hệ thống AI", "Chỉnh sửa bán kính K-Means và tham số GA", "2026-07-01 10:00:00"]
            ]
        },
        # 4. role_permissions
        {
            "name": "role_permissions (Gán Quyền cho Vai trò)",
            "headers": ["role_id", "permission_id"],
            "rows": [
                ["rol-01", "per-01"],
                ["rol-01", "per-02"],
                ["rol-01", "per-05"],
                ["rol-02", "per-03"],
                ["rol-02", "per-04"]
            ]
        },
        # 5. customers
        {
            "name": "customers (Hồ sơ Khách hàng - Clean Arch 1-1)",
            "headers": ["id", "user_id", "customer_code", "customer_type", "company_name", "tax_code", "status", "created_at", "deleted_at"],
            "rows": [
                ["cust-01", "usr-01", "KH-IND-0089", "INDIVIDUAL", None, None, "ACTIVE", "2026-07-01 10:00:00", None],
                ["cust-02", "usr-04", "KH-BIZ-0012", "BUSINESS", "Công ty TNHH Vinamilk", "0300588569", "ACTIVE", "2026-07-02 11:00:00", None],
                ["cust-03", "usr-02", "KH-IND-0090", "INDIVIDUAL", None, None, "ACTIVE", "2026-07-03 09:00:00", None],
                ["cust-04", "usr-03", "KH-BIZ-0015", "BUSINESS", "Tập đoàn Hòa Phát", "0102743414", "ACTIVE", "2026-07-04 14:00:00", None],
                ["cust-05", "usr-05", "KH-IND-0091", "INDIVIDUAL", None, None, "ACTIVE", "2026-07-05 16:00:00", None]
            ]
        },
        # 6. addresses
        {
            "name": "addresses (Kho dữ liệu Địa chỉ & Place ID Map API)",
            "headers": ["id", "address_line_1", "ward", "ward_code", "province", "country", "place_id", "latitude", "longitude", "formatted_address", "created_at"],
            "rows": [
                ["addr-01", "268 Lý Thường Kiệt", "Phường 14", "26830", "Thành phố Hồ Chí Minh", "Vietnam", "ChIJaX7y8Z4vdTER...", 10.7721, 106.6578, "268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM", "2026-07-01 10:00:00"],
                ["addr-02", "123 Nguyễn Huệ", "Phường Bến Nghé", "26740", "Thành phố Hồ Chí Minh", "Vietnam", "ChIJbY7y9A8vdTER...", 10.7740, 106.7030, "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM", "2026-07-01 10:00:00"],
                ["addr-03", "45 Hàng Bạc", "Phường Hàng Bạc", "00037", "Thành phố Hà Nội", "Vietnam", "ChIJcZ8z0B8vdTER...", 21.0331, 105.8524, "45 Hàng Bạc, Phường Hàng Bạc, Quận Hoàn Kiếm, Hà Nội", "2026-07-02 11:00:00"],
                ["addr-04", "102 Lê Duẩn", "Phường Hải Châu 1", "20185", "Thành phố Đà Nẵng", "Vietnam", "ChIJdZ9z1C8vdTER...", 16.0680, 108.2210, "102 Lê Duẩn, Phường Hải Châu 1, Đà Nẵng", "2026-07-03 14:00:00"],
                ["addr-05", "88 Nguyễn Trãi", "Phường Tân An", "31117", "Thành phố Cần Thơ", "Vietnam", "ChIJeZ0z2D8vdTER...", 10.0342, 105.7885, "88 Nguyễn Trãi, Phường Tân An, Cần Thơ", "2026-07-04 16:00:00"]
            ]
        },
        # 7. customer_addresses
        {
            "name": "customer_addresses (Sổ địa chỉ Khách hàng)",
            "headers": ["id", "customer_id", "address_id", "address_type", "is_default", "created_at"],
            "rows": [
                ["cadr-01", "cust-01", "addr-01", "HOME", True, "2026-07-01 10:00:00"],
                ["cadr-02", "cust-02", "addr-02", "OFFICE", True, "2026-07-02 11:00:00"],
                ["cadr-03", "cust-03", "addr-03", "HOME", True, "2026-07-03 09:00:00"],
                ["cadr-04", "cust-04", "addr-04", "WAREHOUSE", True, "2026-07-04 14:00:00"],
                ["cadr-05", "cust-05", "addr-05", "RETURN", True, "2026-07-05 16:00:00"]
            ]
        },
        # 8. customer_contacts
        {
            "name": "customer_contacts (Danh bạ người liên hệ Khách hàng)",
            "headers": ["id", "customer_id", "full_name", "phone", "email", "position", "is_primary", "created_at"],
            "rows": [
                ["cct-01", "cust-02", "Chị Mai", "0912345678", "mai@vinamilk.com", "Trưởng Kho Hàng", True, "2026-07-02 11:00:00"],
                ["cct-02", "cust-04", "Anh Hùng", "0988776655", "hung@hoaphat.com", "Quản lý Giao nhận", True, "2026-07-04 14:00:00"],
                ["cct-03", "cust-01", "Phạm Tuấn Hưng", "0987654321", "hung@smartlog.com", "Người gửi lẻ", True, "2026-07-01 10:00:00"],
                ["cct-04", "cust-03", "Nguyễn Văn Minh", "0912345678", "minh@smartlog.com", "Người gửi lẻ", True, "2026-07-03 09:00:00"],
                ["cct-05", "cust-05", "Trần Anh Tuấn", "0977112233", "tuan@smartlog.com", "Người gửi lẻ", True, "2026-07-05 16:00:00"]
            ]
        },
        # 9. facility_types
        {
            "name": "facility_types (Loại hình Bưu cục / Kho bãi)",
            "headers": ["id", "type_code", "type_name", "created_at"],
            "rows": [
                ["ftype-01", "SORTING_CENTER", "Trung tâm chia chọn tổng", "2026-07-01 10:00:00"],
                ["ftype-02", "LAST_MILE_HUB", "Bưu cục giao nhận chặng cuối", "2026-07-01 10:00:00"],
                ["ftype-03", "TRANSIT_HUB", "Kho trung chuyển khu vực", "2026-07-01 10:00:00"],
                ["ftype-04", "CROSS_DOCK", "Trạm trung chuyển nhanh Cross-dock", "2026-07-01 10:00:00"],
                ["ftype-05", "RETURN_HUB", "Trung tâm xử lý hàng hoàn", "2026-07-01 10:00:00"]
            ]
        },
        # 10. facilities
        {
            "name": "facilities (Mạng lưới Bưu cục & Tọa độ Hub AI)",
            "headers": ["id", "facility_code", "facility_name", "facility_type_id", "parent_facility_id", "manager_user_id", "latitude", "longitude", "operating_status", "opened_at", "created_at", "updated_at", "deleted_at"],
            "rows": [
                ["fac-01", "HUB-Q10-HCM", "Bưu cục Giao nhận Quận 10 - TP.HCM", "ftype-02", None, "usr-02", 10.7725, 106.6580, "ACTIVE", "2025-01-01", "2026-07-01 10:00:00", "2026-07-01 10:00:00", None],
                ["fac-02", "HUB-Q1-HCM", "Bưu cục Giao nhận Quận 1 - TP.HCM", "ftype-02", None, "usr-01", 10.7745, 106.7035, "ACTIVE", "2025-01-01", "2026-07-01 10:00:00", "2026-07-01 10:00:00", None],
                ["fac-03", "HUB-CWD-HN", "Bưu cục Giao nhận Cầu Giấy - Hà Nội", "ftype-02", None, "usr-02", 21.0335, 105.8530, "ACTIVE", "2025-01-01", "2026-07-01 10:00:00", "2026-07-01 10:00:00", None],
                ["fac-04", "HUB-HC-DN", "Bưu cục Giao nhận Hải Châu - Đà Nẵng", "ftype-02", None, "usr-01", 16.0685, 108.2215, "ACTIVE", "2025-01-01", "2026-07-01 10:00:00", "2026-07-01 10:00:00", None],
                ["fac-05", "SORT-HCM-MAIN", "Trung tâm Khai thác Chia chọn TP.HCM", "ftype-01", None, "usr-01", 10.8231, 106.6297, "ACTIVE", "2025-01-01", "2026-07-01 10:00:00", "2026-07-01 10:00:00", None]
            ]
        },
        # 11. facility_addresses
        {
            "name": "facility_addresses (Địa chỉ Bưu cục)",
            "headers": ["id", "facility_id", "address_id", "address_type", "is_primary", "created_at"],
            "rows": [
                ["fadr-01", "fac-01", "addr-01", "MAIN", True, "2026-07-01 10:00:00"],
                ["fadr-02", "fac-02", "addr-02", "MAIN", True, "2026-07-01 10:00:00"],
                ["fadr-03", "fac-03", "addr-03", "MAIN", True, "2026-07-02 11:00:00"],
                ["fadr-04", "fac-04", "addr-04", "MAIN", True, "2026-07-03 14:00:00"],
                ["fadr-05", "fac-05", "addr-05", "MAIN", True, "2026-07-04 16:00:00"]
            ]
        },
        # 12. facility_zones
        {
            "name": "facility_zones (Phân khu Hàng hóa Bưu cục)",
            "headers": ["id", "facility_id", "zone_code", "zone_name", "zone_type", "capacity", "created_at", "updated_at"],
            "rows": [
                ["fzone-01", "fac-01", "ZONE-REC-01", "Khu vực Nhập kho", "RECEIVING", 5000, "2026-07-01 10:00:00", "2026-07-01 10:00:00"],
                ["fzone-02", "fac-01", "ZONE-SORT-A", "Khu vực Phân loại tự động", "SORTING", 10000, "2026-07-01 10:00:00", "2026-07-01 10:00:00"],
                ["fzone-03", "fac-01", "ZONE-SHIP-SOUTH", "Khu vực Chờ xuất giao", "SHIPPING", 8000, "2026-07-01 10:00:00", "2026-07-01 10:00:00"],
                ["fzone-04", "fac-02", "ZONE-REC-02", "Khu vực Nhập kho Q1", "RECEIVING", 4000, "2026-07-01 10:00:00", "2026-07-01 10:00:00"],
                ["fzone-05", "fac-03", "ZONE-SHIP-NORTH", "Khu vực Xuất giao miền Bắc", "SHIPPING", 9000, "2026-07-01 10:00:00", "2026-07-01 10:00:00"]
            ]
        },
        # 13. services
        {
            "name": "services (Dịch vụ & Bảng giá Vận chuyển)",
            "headers": ["id", "service_code", "service_name", "base_price", "free_distance_km", "price_per_km", "free_weight_kg", "price_per_kg", "estimated_delivery_hours", "is_active", "created_at"],
            "rows": [
                ["srv-01", "EXPRESS", "Giao hỏa tốc 2H", 25000.00, 2.0, 6000.00, 1.0, 3000.00, 2, True, "2026-07-01 10:00:00"],
                ["srv-02", "STANDARD", "Giao tiêu chuẩn 24H", 15000.00, 2.0, 4000.00, 1.0, 2000.00, 24, True, "2026-07-01 10:00:00"],
                ["srv-03", "SAVING", "Giao tiết kiệm 48H", 11000.00, 3.0, 3000.00, 2.0, 1500.00, 48, True, "2026-07-01 10:00:00"],
                ["srv-04", "INTERPROVINCE", "Giao liên tỉnh nhanh", 35000.00, 5.0, 8000.00, 1.0, 4000.00, 36, True, "2026-07-01 10:00:00"],
                ["srv-05", "SAME_DAY", "Giao trong ngày Same-day", 20000.00, 2.0, 5000.00, 1.0, 2500.00, 12, True, "2026-07-01 10:00:00"]
            ]
        },
        # 14. orders
        {
            "name": "orders (Quản lý Đơn hàng - Order Snapshot)",
            "headers": ["id", "customer_id", "order_code", "status", "service_id", "scheduled_pickup_at", "pickup_address_id", "sender_contact_id", "sender_name", "sender_phone", "pickup_address_text", "pickup_latitude", "pickup_longitude", "delivery_address_id", "receiver_contact_id", "receiver_name", "receiver_phone", "delivery_address_text", "delivery_latitude", "delivery_longitude", "estimated_shipping_fee", "estimated_insurance_fee", "estimated_cod_amount", "estimated_total_amount", "pickup_type", "estimated_delivery_date", "origin_facility_id", "destination_facility_id", "created_by", "updated_by", "created_at", "updated_at", "deleted_at"],
            "rows": [
                ["ord-01", "cust-01", "ORD-20260724-8891", "READY_FOR_PICKUP", "srv-01", "2026-07-24 14:00:00", "addr-01", None, "Phạm Tuấn Hưng", "0987654321", "268 Lý Thường Kiệt, Phường 14, Quận 10", 10.7721, 106.6578, "addr-02", None, "Trần Thị B", "0918888999", "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1", 10.7740, 106.7030, 25000.00, 5000.00, 500000.00, 530000.00, "PICKUP", "2026-07-28 17:00:00", "fac-01", "fac-01", "usr-01", None, "2026-07-24 09:00:00", "2026-07-24 09:00:00", None],
                ["ord-02", "cust-02", "ORD-20260724-8892", "IN_TRANSIT", "srv-02", "2026-07-24 10:00:00", "addr-02", "cct-01", "Công ty Vinamilk", "0912345678", "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1", 10.7740, 106.7030, "addr-03", None, "Lê Văn C", "0933445566", "45 Hàng Bạc, Phường Hàng Bạc, Cầu Giấy", 21.0331, 105.8524, 45000.00, 10000.00, 1200000.00, 1255000.00, "PICKUP", "2026-07-28 17:00:00", "fac-01", "fac-03", "usr-04", None, "2026-07-24 09:15:00", "2026-07-24 09:15:00", None],
                ["ord-03", "cust-03", "ORD-20260724-8893", "DELIVERED", "srv-01", "2026-07-24 11:00:00", "addr-03", None, "Nguyễn Văn Minh", "0912345678", "45 Hàng Bạc, Phường Hàng Bạc, Hà Nội", 21.0331, 105.8524, "addr-04", None, "Nguyễn Văn D", "0944556677", "102 Lê Duẩn, Hải Châu, Đà Nẵng", 16.0680, 108.2210, 35000.00, 2000.00, 300000.00, 337000.00, "DROP_OFF", "2026-07-28 17:00:00", "fac-03", "fac-04", "usr-02", None, "2026-07-24 09:30:00", "2026-07-24 09:30:00", None],
                ["ord-04", "cust-04", "ORD-20260724-8894", "OUT_FOR_DELIVERY", "srv-05", "2026-07-24 13:00:00", "addr-04", "cct-02", "Tập đoàn Hòa Phát", "0988776655", "102 Lê Duẩn, Hải Châu, Đà Nẵng", 16.0680, 108.2210, "addr-05", None, "Phạm Văn E", "0955667788", "88 Nguyễn Trãi, Tân An, Cần Thơ", 10.0342, 105.7885, 20000.00, 0.00, 0.00, 20000.00, "PICKUP", "2026-07-28 17:00:00", "fac-04", "fac-05", "usr-03", None, "2026-07-24 09:45:00", "2026-07-24 09:45:00", None],
                ["ord-05", "cust-05", "ORD-20260724-8895", "CREATED", "srv-03", "2026-07-24 15:00:00", "addr-05", None, "Trần Anh Tuấn", "0977112233", "88 Nguyễn Trãi, Tân An, Cần Thơ", 10.0342, 105.7885, "addr-01", None, "Hoàng Văn F", "0966778899", "268 Lý Thường Kiệt, Phường 14, Q10", 10.7721, 106.6578, 11000.00, 1000.00, 150000.00, 162000.00, "PICKUP", "2026-07-28 17:00:00", "fac-05", "fac-01", "usr-05", None, "2026-07-24 10:00:00", "2026-07-24 10:00:00", None]
            ]
        },
        # 15. packages
        {
            "name": "packages (Kiện hàng Vật lý & Vị trí Phân khu Kho)",
            "headers": ["id", "order_id", "package_code", "description", "declared_value", "weight", "length", "width", "height", "volume", "is_fragile", "temperature_requirement", "required_vehicle_type_id", "current_facility_id", "current_zone_id", "created_at", "updated_at"],
            "rows": [
                ["pkg-01", "ord-01", "PKG-8891-01", "Hộp quà thời trang cao cấp", 2000000.00, 1.25, 20.0, 15.0, 10.0, 0.0030, False, None, None, "fac-01", "fzone-01", "2026-07-24 09:00:00", "2026-07-24 09:00:00"],
                ["pkg-02", "ord-02", "PKG-8892-01", "Thùng sữa tươi Vinamilk 48 hộp", 500000.00, 10.50, 40.0, 30.0, 25.0, 0.0300, False, None, None, "fac-01", "fzone-02", "2026-07-24 09:15:00", "2026-07-24 09:15:00"],
                ["pkg-03", "ord-03", "PKG-8893-01", "Điện thoại thông minh Smartphone", 15000000.00, 0.50, 15.0, 10.0, 5.0, 0.0008, True, None, None, "fac-03", "fzone-05", "2026-07-24 09:30:00", "2026-07-24 09:30:00"],
                ["pkg-04", "ord-04", "PKG-8894-01", "Bộ linh kiện cơ khí Hòa Phát", 3000000.00, 25.00, 60.0, 50.0, 40.0, 0.1200, False, None, "vtype-01", "fac-04", "fzone-04", "2026-07-24 09:45:00", "2026-07-24 09:45:00"],
                ["pkg-05", "ord-05", "PKG-8895-01", "Áo sơ mi nam cao cấp", 800000.00, 0.40, 30.0, 20.0, 5.0, 0.0030, False, None, None, "fac-05", "fzone-03", "2026-07-24 10:00:00", "2026-07-24 10:00:00"]
            ]
        },
        # 16. order_payments
        {
            "name": "order_payments (Thanh toán Thực tế & COD)",
            "headers": ["id", "order_id", "final_shipping_fee", "final_insurance_fee", "final_cod_amount", "fee_payer", "payment_method", "payment_status", "created_at", "updated_at"],
            "rows": [
                ["op-01", "ord-01", 25000.00, 5000.00, 500000.00, "SENDER", "CASH", "PAID", "2026-07-24 09:00:00", "2026-07-24 09:00:00"],
                ["op-02", "ord-02", 45000.00, 10000.00, 1200000.00, "RECEIVER", "BANK_TRANSFER", "UNPAID", "2026-07-24 09:15:00", "2026-07-24 09:15:00"],
                ["op-03", "ord-03", 35000.00, 2000.00, 300000.00, "SENDER", "E_WALLET", "PAID", "2026-07-24 09:30:00", "2026-07-24 09:30:00"],
                ["op-04", "ord-04", 20000.00, 0.00, 0.00, "SENDER", "CASH", "PAID", "2026-07-24 09:45:00", "2026-07-24 09:45:00"],
                ["op-05", "ord-05", 11000.00, 1000.00, 150000.00, "RECEIVER", "COD", "UNPAID", "2026-07-24 10:00:00", "2026-07-24 10:00:00"]
            ]
        },
        # 17. order_status_history
        {
            "name": "order_status_history (Nhật ký Trạng thái Đơn hàng)",
            "headers": ["id", "order_id", "status", "changed_by_user_id", "reason", "created_at"],
            "rows": [
                ["osh-01", "ord-01", "CREATED", "usr-01", "Khách hàng khởi tạo đơn hàng mới", "2026-07-24 09:00:00"],
                ["osh-02", "ord-02", "IN_TRANSIT", "usr-02", "Vận đơn xuất kho chặng trung chuyển", "2026-07-24 09:15:00"],
                ["osh-03", "ord-03", "DELIVERED", "usr-03", "Giao hàng thành công tại nhà người nhận", "2026-07-24 09:30:00"],
                ["osh-04", "ord-04", "OUT_FOR_DELIVERY", "usr-03", "Shipper nhận ca bắt đầu giao chặng cuối", "2026-07-24 09:45:00"],
                ["osh-05", "ord-05", "CREATED", "usr-05", "Khách hàng tạo đơn giao tiết kiệm", "2026-07-24 10:00:00"]
            ]
        },
        # 18. shipments
        {
            "name": "shipments (Vận đơn / Chuyến gom hàng)",
            "headers": ["id", "shipment_code", "status", "route_id", "origin_facility_id", "destination_facility_id", "created_by", "updated_by", "created_at", "updated_at", "deleted_at"],
            "rows": [
                ["spm-01", "SPM-20260724-9901", "IN_TRANSIT", "rt-01", "fac-01", "fac-01", "usr-02", None, "2026-07-24 09:30:00", "2026-07-24 09:30:00", None],
                ["spm-02", "SPM-20260724-9902", "OUT_FOR_DELIVERY", "rt-02", "fac-01", "fac-03", "usr-02", None, "2026-07-24 09:35:00", "2026-07-24 09:35:00", None],
                ["spm-03", "SPM-20260724-9903", "DELIVERED", "rt-03", "fac-03", "fac-04", "usr-01", None, "2026-07-24 09:40:00", "2026-07-24 09:40:00", None],
                ["spm-04", "SPM-20260724-9904", "ASSIGNED", "rt-04", "fac-04", "fac-05", "usr-02", None, "2026-07-24 09:45:00", "2026-07-24 09:45:00", None],
                ["spm-05", "SPM-20260724-9905", "CREATED", "rt-05", "fac-05", "fac-01", "usr-01", None, "2026-07-24 10:00:00", "2026-07-24 10:00:00", None]
            ]
        },
        # 19. shipment_packages
        {
            "name": "shipment_packages (Gom Kiện hàng vào Vận đơn - Unique Package)",
            "headers": ["id", "shipment_id", "package_id", "created_at"],
            "rows": [
                ["spkg-01", "spm-01", "pkg-01", "2026-07-24 09:30:00"],
                ["spkg-02", "spm-02", "pkg-02", "2026-07-24 09:35:00"],
                ["spkg-03", "spm-03", "pkg-03", "2026-07-24 09:40:00"],
                ["spkg-04", "spm-04", "pkg-04", "2026-07-24 09:45:00"],
                ["spkg-05", "spm-05", "pkg-05", "2026-07-24 10:00:00"]
            ]
        },
        # 20. shipment_events
        {
            "name": "shipment_events (Sự kiện Vận đơn)",
            "headers": ["id", "shipment_id", "event_type", "facility_id", "latitude", "longitude", "event_time", "created_by"],
            "rows": [
                ["se-01", "spm-01", "DEPARTED_FACILITY", "fac-01", 10.7725, 106.6580, "2026-07-24 09:35:00", "usr-03"],
                ["se-02", "spm-02", "OUT_FOR_DELIVERY", "fac-01", 10.7745, 106.7035, "2026-07-24 09:40:00", "usr-05"],
                ["se-03", "spm-03", "DELIVERY_SUCCESS", "fac-04", 16.0685, 108.2215, "2026-07-24 09:45:00", "usr-03"],
                ["se-04", "spm-04", "DRIVER_ASSIGNED", "fac-04", 16.0685, 108.2215, "2026-07-24 09:50:00", "usr-02"],
                ["se-05", "spm-05", "CREATED", "fac-05", 10.8231, 106.6297, "2026-07-24 10:00:00", "usr-01"]
            ]
        },
        # 21. shipment_transfers
        {
            "name": "shipment_transfers (Luân chuyển Hàng giữa các Bưu cục)",
            "headers": ["id", "shipment_id", "from_facility_id", "to_facility_id", "status", "dispatched_at", "arrived_at", "received_by"],
            "rows": [
                ["st-01", "spm-01", "fac-01", "fac-01", "IN_TRANSIT", "2026-07-24 09:35:00", None, None],
                ["st-02", "spm-02", "fac-01", "fac-03", "IN_TRANSIT", "2026-07-24 09:40:00", None, None],
                ["st-03", "spm-03", "fac-03", "fac-04", "ARRIVED", "2026-07-24 09:00:00", "2026-07-24 09:42:00", "usr-02"],
                ["st-04", "spm-04", "fac-04", "fac-05", "PENDING", None, None, None],
                ["st-05", "spm-05", "fac-05", "fac-01", "PENDING", None, None, None]
            ]
        },
        # 22. drivers
        {
            "name": "drivers (Hồ sơ Tài xế / Shipper - Clean Arch 1-1)",
            "headers": ["id", "user_id", "employee_code", "citizen_id", "driver_license_number", "driver_license_class", "hire_date", "employment_status", "home_facility_id", "driver_type", "created_at"],
            "rows": [
                ["drv-01", "usr-03", "SHIPPER-Q10-09", "079098001234", "59012938102", "A1", "2025-01-15", "ACTIVE", "fac-01", "HUB_DELIVERY", None, None, None, "2026-07-10 14:00:00", "2026-07-10 14:00:00", None],
                ["drv-02", "usr-05", "SHIPPER-Q10-10", "079098005678", "59012938999", "B2", "2025-02-01", "ACTIVE", "fac-01", "HUB_DELIVERY", None, None, None, "2026-07-12 10:00:00", "2026-07-12 10:00:00", None],
                ["drv-03", "usr-01", "SHIPPER-Q1-01", "079098009999", "59012938111", "C", "2025-03-01", "ACTIVE", "fac-02", "ON_DEMAND", None, None, None, "2026-07-15 08:00:00", "2026-07-15 08:00:00", None],
                ["drv-04", "usr-02", "SHIPPER-HN-02", "010098002222", "11012938222", "B2", "2025-04-01", "OFFLINE", "fac-03", "HUB_DELIVERY", None, None, None, "2026-07-18 09:00:00", "2026-07-18 09:00:00", None],
                ["drv-05", "usr-04", "SHIPPER-DN-03", "020098003333", "20012938333", "A1", "2025-05-01", "ACTIVE", "fac-04", "HUB_DELIVERY", None, None, None, "2026-07-20 11:00:00", "2026-07-20 11:00:00", None]
            ]
        },
        # 23. staff_profiles
        {
            "name": "staff_profiles (Hồ sơ Nhân viên Bưu cục - Clean Arch 1-1)",
            "headers": ["id", "user_id", "employee_code", "citizen_id", "position", "assigned_facility_id", "created_at", "deleted_at"],
            "rows": [
                ["stf-01", "usr-02", "STAFF-LOG-05", "079098005555", "Trưởng Bưu Cục", "fac-01", "2026-07-05 09:00:00", None],
                ["stf-02", "usr-01", "STAFF-LOG-01", "079098001111", "Quản trị viên kho", "fac-01", "2026-07-01 10:00:00", None],
                ["stf-03", "usr-03", "STAFF-LOG-02", "079098002222", "Nhân viên phân loại", "fac-02", "2026-07-10 14:00:00", None],
                ["stf-04", "usr-04", "STAFF-LOG-03", "079098003333", "Nhân viên điều vận AI", "fac-03", "2026-07-12 10:00:00", None],
                ["stf-05", "usr-05", "STAFF-LOG-04", "079098004444", "Nhân viên xuất nhập kho", "fac-04", "2026-07-15 16:00:00", None]
            ]
        },
        # 24. vehicles
        {
            "name": "vehicles (Danh mục Phương tiện Giao hàng)",
            "headers": ["id", "vehicle_code", "license_plate", "vehicle_type_id", "home_facility_id", "max_weight", "max_volume", "max_length", "refrigeration_supported", "gps_device_id", "operating_status", "created_at", "updated_at"],
            "rows": [
                ["veh-01", "XE-TRUCK-01", "59-P1 999.88", "vtype-01", "fac-01", 1500.00, 12.5000, 3.50, False, "GPS-DEV-88", "ACTIVE", "2026-07-01 10:00:00", "2026-07-01 10:00:00"],
                ["veh-02", "XE-BIKE-02", "59-K2 888.77", "vtype-02", "fac-01", 150.00, 0.8000, 1.20, False, "GPS-DEV-89", "ACTIVE", "2026-07-01 10:00:00", "2026-07-01 10:00:00"],
                ["veh-03", "XE-VAN-03", "59-D3 777.66", "vtype-03", "fac-02", 500.00, 4.5000, 2.20, False, "GPS-DEV-90", "ACTIVE", "2026-07-02 11:00:00", "2026-07-02 11:00:00"],
                ["veh-04", "XE-TRUCK-04", "29-C1 666.55", "vtype-01", "fac-03", 2500.00, 18.0000, 4.50, False, "GPS-DEV-91", "ACTIVE", "2026-07-03 14:00:00", "2026-07-03 14:00:00"],
                ["veh-05", "XE-BIKE-05", "43-F1 555.44", "vtype-02", "fac-04", 150.00, 0.8000, 1.20, False, "GPS-DEV-92", "MAINTENANCE", "2026-07-04 16:00:00", "2026-07-04 16:00:00"]
            ]
        },
        # 25. vehicle_types
        {
            "name": "vehicle_types (Loại Phương tiện)",
            "headers": ["id", "type_code", "type_name", "max_default_weight", "description", "created_at"],
            "rows": [
                ["vtype-01", "TRUCK_1.5TON", "Xe tải nhẹ 1.5 Tấn", 1500.00, "Phù hợp chở hàng gom bưu cục", "2026-07-01 10:00:00"],
                ["vtype-02", "MOTORBIKE", "Xe máy giao chặng cuối", 150.00, "Giao hàng linh hoạt hẻm nhỏ", "2026-07-01 10:00:00"],
                ["vtype-03", "VAN_500KG", "Xe Van 500Kg", 500.00, "Chở hàng hóa vừa trong nội thành", "2026-07-01 10:00:00"],
                ["vtype-04", "TRUCK_3.5TON", "Xe tải trung 3.5 Tấn", 3500.00, "Chạy trung chuyển liên tỉnh", "2026-07-01 10:00:00"],
                ["vtype-05", "REEFER_VAN", "Xe lạnh bảo quản nhiệt độ", 800.00, "Vận chuyển thực phẩm/dược phẩm", "2026-07-01 10:00:00"]
            ]
        },
        # 26. driver_vehicle_assignments
        {
            "name": "driver_vehicle_assignments (Phân công Xe cho Tài xế)",
            "headers": ["id", "driver_id", "vehicle_id", "assigned_from", "assigned_to", "is_active"],
            "rows": [
                ["dva-01", "drv-01", "veh-01", "2026-07-24 06:00:00", None, True],
                ["dva-02", "drv-02", "veh-02", "2026-07-24 06:00:00", None, True],
                ["dva-03", "drv-03", "veh-03", "2026-07-24 07:00:00", None, True],
                ["dva-04", "drv-04", "veh-04", "2026-07-24 07:30:00", None, False],
                ["dva-05", "drv-05", "veh-05", "2026-07-24 08:00:00", None, True]
            ]
        },
        # 27. driver_locations
        {
            "name": "driver_locations (Tọa độ GPS Thời gian thực Shipper)",
            "headers": ["driver_id", "latitude", "longitude", "heading", "speed", "accuracy", "recorded_at"],
            "rows": [
                ["drv-01", 10.7735, 106.6590, 180.0, 25.5, 3.0, "2026-07-24 09:40:00"],
                ["drv-02", 10.7748, 106.7042, 90.0, 18.2, 2.5, "2026-07-24 09:41:00"],
                ["drv-03", 21.0339, 105.8535, 270.0, 30.0, 4.0, "2026-07-24 09:42:00"],
                ["drv-04", 16.0690, 108.2220, 0.0, 0.0, 5.0, "2026-07-24 09:43:00"],
                ["drv-05", 10.0350, 105.7890, 45.0, 12.0, 3.5, "2026-07-24 09:44:00"]
            ]
        },
        # 28. routes
        {
            "name": "routes (Tuyến đường Lộ trình tối ưu bởi AI)",
            "headers": ["id", "route_code", "driver_vehicle_assignment_id", "start_facility_id", "end_facility_id", "optimization_id", "planned_distance_km", "actual_distance_km", "planned_duration_min", "actual_duration_min", "total_stops", "status", "planned_start_at", "actual_start_at", "completed_at", "created_at", "updated_at"],
            "rows": [
                ["rt-01", "RT-20260724-001", "dva-01", "fac-01", "fac-01", "ro-01", 14.85, None, 125, None, 5, "IN_PROGRESS", "2026-07-24 08:00:00", "2026-07-24 08:05:00", None, "2026-07-24 07:50:00", "2026-07-24 08:05:00"],
                ["rt-02", "RT-20260724-002", "dva-02", "fac-01", "fac-01", "ro-01", 8.20, None, 75, None, 3, "ASSIGNED", "2026-07-24 08:30:00", None, None, "2026-07-24 07:50:00", "2026-07-24 07:50:00"],
                ["rt-03", "RT-20260724-003", "dva-03", "fac-02", "fac-02", "ro-02", 22.40, 23.10, 180, 175, 8, "COMPLETED", "2026-07-24 07:00:00", "2026-07-24 07:02:00", "2026-07-24 09:57:00", "2026-07-24 06:45:00", "2026-07-24 09:57:00"],
                ["rt-04", "RT-20260724-004", "dva-04", "fac-03", "fac-03", "ro-03", 35.00, None, 210, None, 10, "PLANNED", "2026-07-24 10:00:00", None, None, "2026-07-24 09:00:00", "2026-07-24 09:00:00"],
                ["rt-05", "RT-20260724-005", "dva-05", "fac-04", "fac-04", "ro-04", 12.00, None, 90, None, 4, "IN_PROGRESS", "2026-07-24 09:00:00", "2026-07-24 09:05:00", None, "2026-07-24 08:45:00", "2026-07-24 09:05:00"]
            ]
        },
        # 29. route_stops
        {
            "name": "route_stops (Chi tiết Điểm dừng Lộ trình)",
            "headers": ["id", "route_id", "shipment_id", "order_id", "facility_id", "stop_type", "sequence", "address_snapshot", "latitude", "longitude", "status"],
            "rows": [
                ["rs-01", "rt-01", None, "ord-01", None, "PICKUP", 1, "268 Lý Thường Kiệt, Phường 14, Q10", 10.7721, 106.6578, "2026-07-24 08:30:00", "2026-07-24 08:28:00", "2026-07-24 08:35:00", "2026-07-24 08:34:00", "DEPARTED"],
                ["rs-02", "rt-01", "spm-01", "ord-01", None, "DELIVERY", 2, "123 Nguyễn Huệ, Bến Nghé, Q1", 10.7740, 106.7030, "2026-07-24 09:10:00", "2026-07-24 09:12:00", "2026-07-24 09:20:00", "2026-07-24 09:18:00", "ARRIVED"],
                ["rs-03", "rt-02", "spm-02", "ord-02", None, "DELIVERY", 1, "45 Hàng Bạc, Hàng Bạc, Hà Nội", 21.0331, 105.8524, "2026-07-24 09:00:00", None, "2026-07-24 09:10:00", None, "PENDING"],
                ["rs-04", "rt-03", "spm-03", "ord-03", None, "DELIVERY", 1, "102 Lê Duẩn, Hải Châu, Đà Nẵng", 16.0680, 108.2210, "2026-07-24 08:00:00", "2026-07-24 07:58:00", "2026-07-24 08:10:00", "2026-07-24 08:08:00", "DEPARTED"],
                ["rs-05", "rt-05", "spm-04", "ord-04", None, "DELIVERY", 1, "88 Nguyễn Trãi, Tân An, Cần Thơ", 10.0342, 105.7885, "2026-07-24 09:30:00", "2026-07-24 09:32:00", "2026-07-24 09:40:00", None, "ARRIVED"]
            ]
        },
        # 30. dispatch_tasks
        {
            "name": "dispatch_tasks (Nhiệm vụ Điều vận Phân ca Shipper)",
            "headers": ["id", "task_code", "route_id", "assigned_by", "assigned_to", "task_type", "priority", "status", "rejection_reason", "note", "created_at", "completed_at"],
            "rows": [
                ["dt-01", "TSK-20260724-88", "rt-01", "usr-02", "drv-01", "ASSIGN_ROUTE", 1, "ACCEPTED", None, "Vui lòng hoàn thành trước 12h", "2026-07-24 07:55:00", None],
                ["dt-02", "TSK-20260724-89", "rt-02", "usr-02", "drv-02", "ASSIGN_ROUTE", 1, "ACCEPTED", None, "Chuyến giao hàng khu vực Quận 1", "2026-07-24 07:55:00", None],
                ["dt-03", "TSK-20260724-90", "rt-03", "usr-01", "drv-03", "ASSIGN_ROUTE", 2, "COMPLETED", None, "Hoàn thành xuất sắc", "2026-07-24 06:50:00", "2026-07-24 09:57:00"],
                ["dt-04", "TSK-20260724-91", "rt-04", "usr-02", "drv-04", "REASSIGN_ROUTE", 1, "REJECTED", "Xe bị thủng lốp trên đường đi ca", "Tài xế báo sự cố", "2026-07-24 09:05:00", None],
                ["dt-05", "TSK-20260724-92", "rt-05", "usr-02", "drv-05", "EMERGENCY", 1, "ACCEPTED", None, "Ca điều động khẩn cấp", "2026-07-24 08:50:00", None]
            ]
        },
        # 31. route_location_logs
        {
            "name": "route_location_logs (Nhật ký GPS Vệt đường chạy)",
            "headers": ["id", "route_id", "latitude", "longitude", "speed_mps", "heading_degrees", "accuracy_meters", "recorded_at"],
            "rows": [
                ["rll-01", "rt-01", 10.7728, 106.6582, 8.5, 90.0, 2.5, "2026-07-24 08:15:00"],
                ["rll-02", "rt-01", 10.7732, 106.6601, 9.2, 88.5, 2.0, "2026-07-24 08:18:00"],
                ["rll-03", "rt-03", 21.0335, 105.8528, 6.0, 180.0, 3.0, "2026-07-24 07:30:00"],
                ["rll-04", "rt-03", 21.0340, 105.8530, 7.8, 175.0, 2.2, "2026-07-24 07:33:00"],
                ["rll-05", "rt-05", 10.0345, 105.7888, 10.1, 45.0, 3.1, "2026-07-24 09:15:00"]
            ]
        },
        # 32. route_optimizations
        {
            "name": "route_optimizations (Nhật ký Thuật toán AI Routing)",
            "headers": ["id", "algorithm_name", "algorithm_version", "parameters_json", "input_shipment_count", "output_route_count", "execution_time_ms", "fitness_score", "optimization_status", "created_at"],
            "rows": [
                ["ro-01", "KMeans + GA", "v1.2.0", '{"kmeans_radius_km": 5.0, "ga_pop_size": 100, "max_gen": 500, "mutation_rate": 0.05}', 45, 3, 850, 0.9850, "SUCCESS", "2026-07-24 07:49:00"],
                ["ro-02", "KMeans + GA", "v1.2.0", '{"kmeans_radius_km": 5.0, "ga_pop_size": 100, "max_gen": 500, "mutation_rate": 0.05}', 30, 2, 620, 0.9910, "SUCCESS", "2026-07-24 06:40:00"],
                ["ro-03", "KMeans + GA", "v1.2.0", '{"kmeans_radius_km": 10.0, "ga_pop_size": 150, "max_gen": 600, "mutation_rate": 0.08}', 60, 4, 1200, 0.9780, "SUCCESS", "2026-07-24 08:55:00"],
                ["ro-04", "KMeans + GA", "v1.2.0", '{"kmeans_radius_km": 5.0, "ga_pop_size": 100, "max_gen": 500, "mutation_rate": 0.05}', 18, 1, 410, 0.9950, "SUCCESS", "2026-07-24 08:40:00"],
                ["ro-05", "KMeans + GA", "v1.2.0", '{"kmeans_radius_km": 5.0, "ga_pop_size": 100, "max_gen": 500, "mutation_rate": 0.05}', 25, 2, 540, 0.9880, "SUCCESS", "2026-07-24 09:50:00"]
            ]
        },
        # 33. route_adjustment_logs
        {
            "name": "route_adjustment_logs (Nhật ký Xử lý Sự cố Lộ trình)",
            "headers": ["id", "route_id", "adjusted_by_user_id", "old_driver_id", "new_driver_id", "adjustment_type", "reason", "adjusted_at"],
            "rows": [
                ["ral-01", "rt-01", "usr-02", "drv-01", "drv-02", "REASSIGN_DRIVER", "Tài xế hỏng xe tại ngã tư Hàng Xanh, điều động tài xế dự phòng", "2026-07-24 09:15:00"],
                ["ral-02", "rt-04", "usr-02", "drv-04", "drv-05", "REASSIGN_DRIVER", "Tài xế bị thủng lốp, chuyển giao 4 điểm dừng cho tài xế 05", "2026-07-24 09:08:00"],
                ["ral-03", "rt-02", "usr-01", None, None, "MODIFY_STOPS", "Bổ sung 1 điểm dừng khẩn cấp theo yêu cầu của khách hàng", "2026-07-24 08:40:00"],
                ["ral-04", "rt-03", "usr-02", None, None, "OPTIMIZE_SEQUENCE", "Điều chỉnh lại thứ tự điểm dừng tránh kẹt xe giờ cao điểm", "2026-07-24 07:15:00"],
                ["ral-05", "rt-05", "usr-01", "drv-05", "drv-01", "CANCEL_ROUTE", "Hủy tuyến do mưa bão ngập lụt cục bộ", "2026-07-24 10:05:00"]
            ]
        },
        # 34. delivery_proofs
        {
            "name": "delivery_proofs (Bằng chứng Giao hàng POD & COD Thực thu)",
            "headers": ["id", "shipment_id", "route_stop_id", "delivery_result", "actual_cod_collected", "file_url", "receiver_name", "receiver_phone", "failure_reason", "verified_latitude", "verified_longitude", "created_at"],
            "rows": [
                ["dp-01", "spm-01", "rs-01", "SUCCESS", 500000.00, "https://storage.goong.io/pod/proof_dp01.jpg", "Trần Thị B", "0918888999", None, 10.7740, 106.7030, "2026-07-24 09:45:00"],
                ["dp-02", "spm-02", "rs-03", "SUCCESS", 1200000.00, "https://storage.goong.io/pod/proof_dp02.jpg", "Lê Văn C", "0933445566", None, 21.0331, 105.8524, "2026-07-24 09:10:00"],
                ["dp-03", "spm-03", "rs-04", "SUCCESS", 300000.00, "https://storage.goong.io/pod/proof_dp03.jpg", "Nguyễn Văn D", "0944556677", None, 16.0680, 108.2210, "2026-07-24 08:08:00"],
                ["dp-04", "spm-04", "rs-05", "FAILED", 0.00, "https://storage.goong.io/pod/fail_dp04.jpg", "Phạm Văn E", "0955667788", "RECIPIENT_UNAVAILABLE", 10.0342, 105.7885, "2026-07-24 09:38:00"],
                ["dp-05", "spm-05", "rs-02", "SUCCESS", 150000.00, "https://storage.goong.io/pod/proof_dp05.jpg", "Hoàng Văn F", "0966778899", None, 10.7721, 106.6578, "2026-07-24 10:10:00"]
            ]
        },
        # 35. warehouse_scans
        {
            "name": "warehouse_scans (Nhật ký Quét kho & Sọt hàng Tập kết)",
            "headers": ["id", "facility_id", "shipment_id", "package_id", "scanned_by", "tote_bag_id", "scanned_at"],
            "rows": [
                ["ws-01", "fac-01", "spm-01", "pkg-01", "usr-02", "tb-01", "2026-07-24 09:44:00"],
                ["ws-02", "fac-01", "spm-02", "pkg-02", "usr-02", "tb-01", "2026-07-24 09:05:00"],
                ["ws-03", "fac-04", "spm-03", "pkg-03", "usr-03", "tb-02", "2026-07-24 08:00:00"],
                ["ws-04", "fac-04", "spm-04", "pkg-04", "usr-03", "tb-02", "2026-07-24 09:20:00"],
                ["ws-05", "fac-05", "spm-05", "pkg-05", "usr-01", "tb-03", "2026-07-24 10:02:00"]
            ]
        },
        # 38. tracking_events
        {
            "name": "tracking_events (Nhật ký Theo dõi Hành trình)",
            "headers": ["id", "shipment_id", "route_stop_id", "event_type", "description", "latitude", "longitude", "created_by", "created_at"],
            "rows": [
                ["te-01", "spm-01", "rs-01", "DELIVERED", "Đơn hàng đã được giao thành công cho người nhận", 10.7740, 106.7030, "usr-03", "2026-07-24 09:45:00"],
                ["te-02", "spm-02", "rs-03", "DELIVERED", "Đã nhận đơn hàng thành công", 21.0331, 105.8524, "usr-05", "2026-07-24 09:10:00"],
                ["te-03", "spm-03", "rs-04", "DELIVERED", "Giao hàng thành công chặng cuối", 16.0680, 108.2210, "usr-03", "2026-07-24 08:08:00"],
                ["te-04", "spm-04", "rs-05", "FAILED", "Khách hàng không bắt máy khi shipper gọi giao", 10.0342, 105.7885, "usr-05", "2026-07-24 09:38:00"],
                ["te-05", "spm-05", "rs-02", "DELIVERED", "Giao hàng thành công chặng cuối", 10.7721, 106.6578, "usr-01", "2026-07-24 10:10:00"]
            ]
        },
        # 39. system_settings
        {
            "name": "system_settings (Cấu hình Tham số AI & Hệ thống)",
            "headers": ["id", "setting_key", "setting_value", "value_type", "category", "description", "is_editable", "is_active", "updated_by", "updated_at", "created_at"],
            "rows": [
                ["ss-01", "kmeans_cluster_radius_km", "5.0", "DECIMAL", "AI", "Bán kính phân cụm K-Means tối đa cho mỗi bưu cục", True, True, "usr-01", "2026-07-01 10:00:00", "2026-07-01 10:00:00"],
                ["ss-02", "ga_population_size", "100", "INTEGER", "AI", "Kích thước quần thể Genetic Algorithm", True, True, "usr-01", "2026-07-01 10:00:00", "2026-07-01 10:00:00"],
                ["ss-03", "ga_max_generations", "500", "INTEGER", "AI", "Số thế hệ tối đa cho GA VRP", True, True, "usr-01", "2026-07-01 10:00:00", "2026-07-01 10:00:00"],
                ["ss-04", "ga_mutation_rate", "0.05", "DECIMAL", "AI", "Tỷ lệ đột biến Genetic Algorithm", True, True, "usr-01", "2026-07-01 10:00:00", "2026-07-01 10:00:00"],
                ["ss-05", "gps_sync_interval_sec", "3", "INTEGER", "GPS", "Chu kỳ đồng bộ vị trí GPS tài xế (Giây)", True, True, "usr-01", "2026-07-01 10:00:00", "2026-07-01 10:00:00"]
            ]
        },
        # 40. Administrative Units
        {
            "name": "provinces (Danh mục Tỉnh / Thành phố VN)",
            "headers": ["code", "name", "name_en", "full_name", "full_name_en", "code_name", "administrative_unit_id"],
            "rows": [
                ["79", "Thành phố Hồ Chí Minh", "Ho Chi Minh City", "Thành phố Hồ Chí Minh", "Ho Chi Minh City", "ho_chi_minh", 1],
                ["01", "Thành phố Hà Nội", "Ha Noi City", "Thành phố Hà Nội", "Ha Noi City", "ha_noi", 1],
                ["48", "Thành phố Đà Nẵng", "Da Nang City", "Thành phố Đà Nẵng", "Da Nang City", "da_nang", 1],
                ["31", "Thành phố Hải Phòng", "Hai Phong City", "Thành phố Hải Phòng", "Hai Phong City", "hai_phong", 1],
                ["92", "Thành phố Cần Thơ", "Can Tho City", "Thành phố Cần Thơ", "Can Tho City", "can_tho", 1]
            ]
        },
        {
            "name": "wards (Danh mục Phường / Xã VN)",
            "headers": ["code", "name", "name_en", "full_name", "full_name_en", "code_name", "province_code", "administrative_unit_id"],
            "rows": [
                ["26830", "Phường 14", "Ward 14", "Phường 14", "Ward 14", "phuong_14", "79", 1],
                ["26740", "Phường Bến Nghé", "Ben Nghe Ward", "Phường Bến Nghé", "Ben Nghe Ward", "ben_nghe", "79", 1],
                ["00037", "Phường Hàng Bạc", "Hang Bac Ward", "Phường Hàng Bạc", "Hang Bac Ward", "hang_bac", "01", 1],
                ["20185", "Phường Hải Châu 1", "Hai Chau 1 Ward", "Phường Hải Châu 1", "Hai Chau 1 Ward", "hai_chau_1", "48", 1],
                ["31117", "Phường Tân An", "Tan An Ward", "Phường Tân An", "Tan An Ward", "tan_an", "92", 1]
            ]
        }
    ]

    current_row = 2
    for item in tables_data:
        title = item["name"]
        headers = item["headers"]
        rows = item["rows"]

        # Write title
        cell = ws.cell(row=current_row, column=1, value=title)
        cell.font = title_font
        cell.fill = title_fill
        ws.row_dimensions[current_row].height = 22
        current_row += 1

        # Write headers
        for col_idx, h in enumerate(headers, 1):
            c = ws.cell(row=current_row, column=col_idx, value=h)
            c.font = header_font
            c.fill = header_fill
            c.alignment = Alignment(horizontal="center", vertical="center")
            c.border = thin_border
        ws.row_dimensions[current_row].height = 20
        current_row += 1

        # Write rows
        for r in rows:
            for col_idx, val in enumerate(r, 1):
                c = ws.cell(row=current_row, column=col_idx, value=val)
                c.font = data_font
                c.border = thin_border
                if isinstance(val, (int, float)):
                    c.alignment = Alignment(horizontal="right", vertical="center")
                else:
                    c.alignment = Alignment(horizontal="left", vertical="center")
            ws.row_dimensions[current_row].height = 18
            current_row += 1

        current_row += 2  # spacing between tables

    # Auto adjust column widths
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            if cell.value is not None and cell.row > 1:
                val_str = str(cell.value)
                if len(val_str) > 60:
                    val_str = val_str[:60]
                if len(val_str) > max_len:
                    max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    # Save to workspace root and Design DB
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    out_path_root = os.path.abspath(os.path.join(base_dir, "..", "Database_Schema.xlsx"))
    out_path_local = os.path.abspath(os.path.join(base_dir, "Database_Schema.xlsx"))
    
    wb.save(out_path_root)
    wb.save(out_path_local)
    print(f"Successfully generated Database_Schema.xlsx at:\n  - {out_path_root}\n  - {out_path_local}")

if __name__ == "__main__":
    build_excel()
