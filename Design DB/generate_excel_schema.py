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
            "name": "1. users (Tài khoản người dùng - Separation of PII)",
            "headers": ["id", "username", "password_hash", "status", "role_id", "created_at"],
            "rows": [
                ["usr-01", "hung_admin", "$2b$10$e8N0Y9z...", "ACTIVE", "rol-01", "2026-07-01 10:00:00"],
                ["usr-02", "staff_kho_tbd", "$2b$10$f9O1Z0a...", "ACTIVE", "rol-02", "2026-07-05 09:00:00"],
                ["usr-03", "shipper_nam", "$2b$10$g0P2A1b...", "ACTIVE", "rol-04", "2026-07-10 14:00:00"],
                ["usr-04", "kh_vinamilk", "$2b$10$h1Q3B2c...", "ACTIVE", "rol-03", "2026-07-02 11:00:00"],
                ["usr-05", "shipper_tuan", "$2b$10$i2R4C3d...", "ACTIVE", "rol-04", "2026-07-12 10:00:00"]
            ]
        },
        # 2. roles
        {
            "name": "2. roles (Danh mục Vai trò người dùng)",
            "headers": ["id", "role_code", "role_name", "created_at"],
            "rows": [
                ["rol-01", "ADMIN", "Quản trị viên hệ thống", "2026-07-01 10:00:00"],
                ["rol-02", "STAFF", "Nhân viên điều vận bưu cục", "2026-07-01 10:00:00"],
                ["rol-03", "CUSTOMER", "Khách hàng người gửi", "2026-07-01 10:00:00"],
                ["rol-04", "SHIPPER", "Tài xế giao hàng", "2026-07-01 10:00:00"]
            ]
        },
        # 3. permissions
        {
            "name": "3. permissions (Quyền hạn hệ thống)",
            "headers": ["id", "permission_code", "permission_name", "created_at"],
            "rows": [
                ["per-01", "ORDER_CREATE", "Tạo đơn hàng", "2026-07-01 10:00:00"],
                ["per-02", "AI_ROUTE_OPTIMIZE", "Chạy thuật toán AI Routing", "2026-07-01 10:00:00"],
                ["per-03", "SHIPMENT_APPROVE", "Duyệt vận đơn trung chuyển", "2026-07-01 10:00:00"],
                ["per-04", "DRIVER_ASSIGN", "Phân công ca làm việc Shipper", "2026-07-01 10:00:00"]
            ]
        },
        # 4. role_permissions
        {
            "name": "4. role_permissions (Gán Quyền cho Vai trò)",
            "headers": ["role_id", "permission_id"],
            "rows": [
                ["rol-01", "per-01"],
                ["rol-01", "per-02"],
                ["rol-02", "per-03"],
                ["rol-02", "per-04"]
            ]
        },
        # 5. customers
        {
            "name": "5. customers (Hồ sơ Khách hàng - Clean Arch PII Profile)",
            "headers": ["id", "user_id", "customer_code", "full_name", "phone", "email", "customer_type", "company_name", "tax_code", "created_at"],
            "rows": [
                ["cust-01", "usr-01", "CUST-000001", "Phạm Tuấn Hưng", "0987654321", "hung@smartlog.com", "INDIVIDUAL", None, None, "2026-07-01 10:00:00"],
                ["cust-02", "usr-04", "KH-BIZ-0012", "Công ty Vinamilk", "0912345678", "mai@vinamilk.com", "BUSINESS", "Công ty TNHH Vinamilk", "0300588569", "2026-07-02 11:00:00"],
                ["cust-03", "usr-02", "CUST-000003", "Nguyễn Văn Minh", "0912345678", "minh@smartlog.com", "INDIVIDUAL", None, None, "2026-07-03 09:00:00"]
            ]
        },
        # 6. addresses
        {
            "name": "6. addresses (Kho dữ liệu Địa chỉ & Place ID Map API)",
            "headers": ["id", "address_line_1", "ward_code", "country", "place_id", "latitude", "longitude", "created_at"],
            "rows": [
                ["addr-01", "268 Lý Thường Kiệt", "26830", "Vietnam", "ChIJaX7y8Z4vdTER...", 10.7721, 106.6578, "2026-07-01 10:00:00"],
                ["addr-02", "123 Nguyễn Huệ", "26740", "Vietnam", "ChIJbY7y9A8vdTER...", 10.7740, 106.7030, "2026-07-01 10:00:00"],
                ["addr-03", "45 Hàng Bạc", "00037", "Vietnam", "ChIJcZ8z0B8vdTER...", 21.0331, 105.8524, "2026-07-02 11:00:00"],
                ["addr-04", "102 Lê Duẩn", "20185", "Vietnam", "ChIJdZ9z1C8vdTER...", 16.0680, 108.2210, "2026-07-03 14:00:00"]
            ]
        },
        # 7. customer_addresses
        {
            "name": "7. customer_addresses (Sổ địa chỉ Khách hàng & Liên hệ kho)",
            "headers": ["id", "customer_id", "address_id", "address_type", "is_default", "contact_name", "contact_phone", "created_at"],
            "rows": [
                ["cadr-01", "cust-01", "addr-01", "HOME", True, "Phạm Tuấn Hưng", "0987654321", "2026-07-01 10:00:00"],
                ["cadr-02", "cust-02", "addr-02", "OFFICE", True, "Chị Mai", "0912345678", "2026-07-02 11:00:00"],
                ["cadr-03", "cust-03", "addr-03", "HOME", True, "Nguyễn Văn Minh", "0912345678", "2026-07-03 09:00:00"]
            ]
        },
        # 8. facility_types
        {
            "name": "8. facility_types (Loại hình Bưu cục / Kho bãi)",
            "headers": ["id", "type_code", "type_name", "created_at"],
            "rows": [
                ["ftype-01", "SORTING_CENTER", "Trung tâm chia chọn tổng", "2026-07-01 10:00:00"],
                ["ftype-02", "LAST_MILE_HUB", "Bưu cục giao nhận chặng cuối", "2026-07-01 10:00:00"],
                ["ftype-03", "REGIONAL_HUB", "Kho trung chuyển khu vực", "2026-07-01 10:00:00"]
            ]
        },
        # 9. facilities
        {
            "name": "9. facilities (Mạng lưới Bưu cục & Hub logistics)",
            "headers": ["id", "facility_code", "facility_name", "facility_type_id", "parent_facility_id", "manager_user_id", "province_code", "address_id", "operating_status", "region_sequence", "opened_at", "closed_at", "created_at"],
            "rows": [
                ["fac-01", "HUB-Q10-HCM", "Bưu cục Giao nhận Quận 10 - TP.HCM", "ftype-02", None, "usr-02", "79", "addr-01", "ACTIVE", 1, "2025-01-01", None, "2026-07-01 10:00:00"],
                ["fac-02", "HUB-Q1-HCM", "Bưu cục Giao nhận Quận 1 - TP.HCM", "ftype-02", "fac-01", "usr-01", "79", "addr-02", "ACTIVE", 1, "2025-01-01", None, "2026-07-01 10:00:00"],
                ["fac-03", "HUB-CWD-HN", "Bưu cục Giao nhận Cầu Giấy - Hà Nội", "ftype-02", None, "usr-02", "01", "addr-03", "ACTIVE", 2, "2025-01-01", None, "2026-07-01 10:00:00"]
            ]
        },
        # 10. facility_zones
        {
            "name": "10. facility_zones (Phân khu Hàng hóa Bưu cục)",
            "headers": ["id", "facility_id", "zone_code", "zone_name", "zone_type", "capacity", "created_at"],
            "rows": [
                ["fzone-01", "fac-01", "ZONE-REC-01", "Khu vực Nhập kho", "RECEIVING", 5000, "2026-07-01 10:00:00"],
                ["fzone-02", "fac-01", "ZONE-SORT-A", "Khu vực Phân loại tự động", "SORTING", 10000, "2026-07-01 10:00:00"],
                ["fzone-03", "fac-01", "ZONE-SHIP-SOUTH", "Khu vực Chờ xuất giao", "SHIPPING", 8000, "2026-07-01 10:00:00"]
            ]
        },
        # 11. services
        {
            "name": "11. services (Dịch vụ & Bảng giá Vận chuyển)",
            "headers": ["id", "service_code", "service_name", "base_price", "free_distance_km", "price_per_km", "free_weight_kg", "price_per_kg", "estimated_delivery_hours", "is_active", "created_at"],
            "rows": [
                ["srv-01", "EXPRESS", "Giao hỏa tốc 2H", 25000.00, 2.0, 6000.00, 1.0, 3000.00, 2, True, "2026-07-01 10:00:00"],
                ["srv-02", "STANDARD", "Giao tiêu chuẩn 24H", 15000.00, 2.0, 4000.00, 1.0, 2000.00, 24, True, "2026-07-01 10:00:00"],
                ["srv-03", "SAVING", "Giao tiết kiệm 48H", 11000.00, 3.0, 3000.00, 2.0, 1500.00, 48, True, "2026-07-01 10:00:00"]
            ]
        },
        # 12. orders
        {
            "name": "12. orders (Quản lý Đơn hàng & Snapshot)",
            "headers": ["id", "customer_id", "order_code", "status", "service_id", "scheduled_pickup_at", "pickup_address_id", "pickup_address_text", "pickup_latitude", "pickup_longitude", "delivery_address_id", "receiver_name", "receiver_phone", "delivery_address_text", "delivery_latitude", "delivery_longitude", "estimated_shipping_fee", "estimated_insurance_fee", "estimated_cod_amount", "estimated_distance", "estimated_duration", "estimated_delivery_date", "pickup_type", "origin_facility_id", "destination_facility_id", "created_by", "updated_by", "created_at", "updated_at"],
            "rows": [
                ["ord-01", "cust-01", "ORD-20260724-8891", "READY_FOR_PICKUP", "srv-01", "2026-07-24 14:00:00", "addr-01", "268 Lý Thường Kiệt, Phường 14, Quận 10", 10.7721, 106.6578, "addr-02", "Trần Thị B", "0918888999", "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1", 10.7740, 106.7030, 25000.00, 5000.00, 500000.00, 12.5, 35, "2026-07-28 17:00:00", "PICKUP", "fac-01", "fac-01", "usr-01", None, "2026-07-24 09:00:00", "2026-07-24 09:00:00"],
                ["ord-02", "cust-02", "ORD-20260724-8892", "IN_TRANSIT", "srv-02", "2026-07-24 10:00:00", "addr-02", "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1", 10.7740, 106.7030, "addr-03", "Lê Văn C", "0933445566", "45 Hàng Bạc, Phường Hàng Bạc, Hà Nội", 21.0331, 105.8524, 45000.00, 10000.00, 1200000.00, 1200.0, 1440, "2026-07-28 17:00:00", "PICKUP", "fac-01", "fac-03", "usr-04", None, "2026-07-24 09:15:00", "2026-07-24 09:15:00"]
            ]
        },
        # 13. packages
        {
            "name": "13. packages (Kiện hàng Vật lý & Vị trí Phân khu Kho)",
            "headers": ["id", "order_id", "package_code", "description", "declared_value", "weight", "length", "width", "height", "volume", "is_fragile", "temperature_requirement", "required_vehicle_type_id", "current_facility_id", "current_zone_id", "created_at", "updated_at"],
            "rows": [
                ["pkg-01", "ord-01", "PKG-8891-01", "Hộp quà thời trang cao cấp", 2000000.00, 1.25, 20.0, 15.0, 10.0, 0.0030, False, None, None, "fac-01", "fzone-01", "2026-07-24 09:00:00", "2026-07-24 09:00:00"],
                ["pkg-02", "ord-02", "PKG-8892-01", "Thùng sữa tươi Vinamilk", 500000.00, 10.50, 40.0, 30.0, 25.0, 0.0300, False, None, None, "fac-01", "fzone-02", "2026-07-24 09:15:00", "2026-07-24 09:15:00"]
            ]
        },
        # 14. order_payments
        {
            "name": "14. order_payments (Thanh toán Thực tế & COD)",
            "headers": ["id", "order_id", "final_shipping_fee", "final_insurance_fee", "final_cod_amount", "fee_payer", "payment_method", "payment_status", "created_at", "updated_at"],
            "rows": [
                ["op-01", "ord-01", 25000.00, 5000.00, 500000.00, "SENDER", "CASH", "PAID", "2026-07-24 09:00:00", "2026-07-24 09:00:00"],
                ["op-02", "ord-02", 45000.00, 10000.00, 1200000.00, "RECEIVER", "BANK_TRANSFER", "UNPAID", "2026-07-24 09:15:00", "2026-07-24 09:15:00"]
            ]
        },
        # 15. order_status_history
        {
            "name": "15. order_status_history (Nhật ký Trạng thái Đơn hàng)",
            "headers": ["id", "order_id", "status", "changed_by_user_id", "reason", "created_at"],
            "rows": [
                ["osh-01", "ord-01", "CREATED", "usr-01", "Khách hàng khởi tạo đơn hàng mới", "2026-07-24 09:00:00"],
                ["osh-02", "ord-02", "IN_TRANSIT", "usr-02", "Vận đơn xuất kho chặng trung chuyển", "2026-07-24 09:15:00"]
            ]
        },
        # 16. shipments
        {
            "name": "16. shipments (Vận đơn / Chuyến gom hàng)",
            "headers": ["id", "shipment_code", "status", "route_id", "origin_facility_id", "destination_facility_id", "created_by", "updated_by", "created_at", "updated_at"],
            "rows": [
                ["spm-01", "SHP-20260724-001", "IN_TRANSIT", "rt-01", "fac-01", "fac-01", "usr-02", None, "2026-07-24 09:30:00", "2026-07-24 09:30:00"],
                ["spm-02", "SHP-20260724-002", "OUT_FOR_DELIVERY", "rt-02", "fac-01", "fac-03", "usr-02", None, "2026-07-24 09:35:00", "2026-07-24 09:35:00"]
            ]
        },
        # 17. shipment_packages
        {
            "name": "17. shipment_packages (Gom Kiện hàng vào Vận đơn - Unique Package)",
            "headers": ["id", "shipment_id", "package_id", "created_at"],
            "rows": [
                ["spkg-01", "spm-01", "pkg-01", "2026-07-24 09:30:00"],
                ["spkg-02", "spm-02", "pkg-02", "2026-07-24 09:35:00"]
            ]
        },
        # 18. shipment_transfers
        {
            "name": "18. shipment_transfers (Luân chuyển Hàng giữa các Bưu cục)",
            "headers": ["id", "shipment_id", "from_facility_id", "to_facility_id", "status", "dispatched_at", "arrived_at", "received_by"],
            "rows": [
                ["st-01", "spm-01", "fac-01", "fac-01", "IN_TRANSIT", "2026-07-24 09:35:00", None, None],
                ["st-02", "spm-02", "fac-01", "fac-03", "ARRIVED", "2026-07-24 09:40:00", "2026-07-24 11:20:00", "usr-02"]
            ]
        },
        # 19. staff
        {
            "name": "19. staff (Hồ sơ Hợp nhất Nhân viên & Tài xế)",
            "headers": ["id", "user_id", "employee_code", "full_name", "phone", "email", "citizen_id", "position", "assigned_facility_id", "driver_license_number", "driver_license_class", "employment_status", "hire_date", "created_at"],
            "rows": [
                ["stf-01", "usr-02", "STF-000001", "Nguyễn Văn Minh", "0912345678", "minh@smartlog.com", "079098005555", "DISPATCHER", "fac-01", None, None, "ACTIVE", "2025-01-15", "2026-07-05 09:00:00"],
                ["stf-02", "usr-03", "DRV-000001", "Lê Văn Nam", "0938123456", "nam.shipper@smartlog.com", "079098001234", "DRIVER", "fac-01", "59012938102", "A1", "ACTIVE", "2025-02-01", "2026-07-10 14:00:00"]
            ]
        },
        # 20. staff_driver_types
        {
            "name": "20. staff_driver_types (Phân loại hình Giao hàng Tài xế)",
            "headers": ["id", "staff_id", "driver_type", "created_at"],
            "rows": [
                ["sdt-01", "stf-02", "HUB_DELIVERY", "2026-07-10 14:00:00"],
                ["sdt-02", "stf-02", "ON_DEMAND", "2026-07-10 14:00:00"]
            ]
        },
        # 21. vehicles
        {
            "name": "21. vehicles (Danh mục Phương tiện Giao hàng)",
            "headers": ["id", "vehicle_code", "plate_number", "vehicle_type_id", "assigned_facility_id", "max_weight", "max_volume", "max_length", "is_refrigerated", "operating_status", "created_at"],
            "rows": [
                ["veh-01", "VEH-TRK-001", "59C-123.45", "vtype-01", "fac-01", 1500.00, 12.5000, 3.50, False, "ACTIVE", "2026-07-01 10:00:00"],
                ["veh-02", "VEH-BIK-002", "59-P1 999.88", "vtype-02", "fac-01", 50.00, 0.2500, 0.80, False, "ACTIVE", "2026-07-01 10:00:00"]
            ]
        },
        # 22. vehicle_types
        {
            "name": "22. vehicle_types (Loại Phương tiện Vận tải)",
            "headers": ["id", "type_code", "type_name", "created_at"],
            "rows": [
                ["vtype-01", "TRUCK_1.5T", "Xe tải 1.5 Tấn", "2026-07-01 10:00:00"],
                ["vtype-02", "MOTORBIKE", "Xe máy giao hàng", "2026-07-01 10:00:00"]
            ]
        },
        # 23. driver_vehicle_assignments
        {
            "name": "23. driver_vehicle_assignments (Phân công Xe cho Tài xế)",
            "headers": ["id", "driver_id", "vehicle_id", "assigned_from", "assigned_to", "is_active"],
            "rows": [
                ["dva-01", "stf-02", "veh-02", "2026-07-24 06:00:00", None, True]
            ]
        },
        # 24. driver_locations
        {
            "name": "24. driver_locations (Tọa độ GPS Thời gian thực Tài xế)",
            "headers": ["driver_id", "latitude", "longitude", "recorded_at"],
            "rows": [
                ["stf-02", 10.7735, 106.6590, "2026-07-24 09:40:00"]
            ]
        },
        # 25. routes
        {
            "name": "25. routes (Lộ trình Tuyến đường Tối ưu bởi AI)",
            "headers": ["id", "route_code", "driver_vehicle_assignment_id", "start_facility_id", "end_facility_id", "optimization_id", "planned_distance_km", "planned_duration_min", "total_stops", "status", "actual_start_at", "completed_at", "created_at", "updated_at"],
            "rows": [
                ["rt-01", "RT-20260724-001", "dva-01", "fac-01", "fac-01", "ro-01", 14.85, 125, 5, "IN_PROGRESS", "2026-07-24 08:00:00", None, "2026-07-24 07:30:00", "2026-07-24 08:00:00"]
            ]
        },
        # 26. route_stops
        {
            "name": "26. route_stops (Chi tiết Điểm dừng trên Tuyến)",
            "headers": ["id", "route_id", "shipment_id", "order_id", "facility_id", "stop_type", "sequence", "address_snapshot", "latitude", "longitude", "status", "arrived_at", "departed_at"],
            "rows": [
                ["rs-01", "rt-01", None, "ord-01", None, "PICKUP", 1, "268 Lý Thường Kiệt, P.14, Q.10", 10.7721, 106.6578, "ARRIVED", "2026-07-24 08:15:00", "2026-07-24 08:20:00"],
                ["rs-02", "rt-01", "spm-01", None, None, "DELIVERY", 2, "123 Nguyễn Huệ, P.Bến Nghé, Q.1", 10.7740, 106.7030, "PENDING", None, None]
            ]
        },
        # 27. dispatch_tasks
        {
            "name": "27. dispatch_tasks (Phiếu Điều phối Giao việc Shipper)",
            "headers": ["id", "task_code", "route_id", "assigned_by", "assigned_to", "task_type", "priority", "status", "created_at", "completed_at"],
            "rows": [
                ["dt-01", "TSK-20260724-88", "rt-01", "usr-02", "stf-02", "ASSIGN_ROUTE", 1, "ACCEPTED", "2026-07-24 07:35:00", None]
            ]
        },
        # 28. route_optimizations
        {
            "name": "28. route_optimizations (Nhật ký Thuật toán AI Routing)",
            "headers": ["id", "algorithm_name", "input_shipment_count", "output_route_count", "optimization_status", "created_at"],
            "rows": [
                ["ro-01", "K-Means + Genetic VRP", 50, 3, "SUCCESS", "2026-07-24 07:00:00"]
            ]
        },
        # 29. route_adjustment_logs
        {
            "name": "29. route_adjustment_logs (Nhật ký Xử lý Sự cố Điều chỉnh Tuyến)",
            "headers": ["id", "route_id", "adjusted_by_user_id", "old_driver_id", "new_driver_id", "adjustment_type", "reason", "adjusted_at"],
            "rows": [
                ["ral-01", "rt-01", "usr-02", "stf-02", "stf-01", "REASSIGN_DRIVER", "Tài xế hỏng xe giữa đường tại ngã tư Hàng Xanh", "2026-07-24 09:00:00"]
            ]
        },
        # 30. tracking_events
        {
            "name": "30. tracking_events (Nhật ký Sự kiện Tracking Vận đơn)",
            "headers": ["id", "shipment_id", "route_stop_id", "event_type", "description", "latitude", "longitude", "created_by", "created_at"],
            "rows": [
                ["te-01", "spm-01", "rs-01", "PICKED_UP", "Đã lấy hàng từ người gửi", 10.7721, 106.6578, "usr-03", "2026-07-24 08:20:00"]
            ]
        },
        # 31. warehouse_scans
        {
            "name": "31. warehouse_scans (Nhật ký Quét mã vạch Kho bãi)",
            "headers": ["id", "facility_id", "shipment_id", "package_id", "scanned_by", "tote_bag_id", "scanned_at"],
            "rows": [
                ["ws-01", "fac-01", "spm-01", "pkg-01", "usr-02", "tb-01", "2026-07-24 08:00:00"]
            ]
        },
        # 32. tote_bags
        {
            "name": "32. tote_bags (Quản lý Sọt gom & Bao gộp Chuyển kho)",
            "headers": ["id", "tote_code", "zone_code", "facility_id", "status", "sealed_at", "created_at", "updated_at"],
            "rows": [
                ["tb-01", "TOTE-HCM01-SORT-01", "ZONE-SORT-A", "fac-01", "SEALED", "2026-07-24 08:00:00", "2026-07-24 07:00:00", "2026-07-24 08:00:00"]
            ]
        },
        # 33. delivery_proofs
        {
            "name": "33. delivery_proofs (Bằng chứng Giao hàng Số - POD)",
            "headers": ["id", "shipment_id", "route_stop_id", "delivery_result", "actual_cod_collected", "file_url", "failure_reason", "verified_latitude", "verified_longitude", "created_at"],
            "rows": [
                ["dp-01", "spm-01", "rs-01", "SUCCESS", 500000.00, "https://storage.goong.io/pod/proof_dp01.jpg", None, 10.7721, 106.6578, "2026-07-24 08:20:00"]
            ]
        },
        # 34. system_settings
        {
            "name": "34. system_settings (Tham số Siêu cấu hình AI / GPS)",
            "headers": ["id", "setting_key", "setting_value", "value_type", "category", "description", "is_editable", "is_active", "updated_by", "updated_at", "created_at"],
            "rows": [
                ["ss-01", "GPS_INTERVAL_SECONDS", "5", "INTEGER", "GPS", "Khoảng thời gian gửi tọa độ GPS", True, True, "usr-01", "2026-07-01 10:00:00", "2026-07-01 10:00:00"],
                ["ss-02", "POPULATION_SIZE", "100", "INTEGER", "AI", "Kích thước quần thể GA", True, True, "usr-01", "2026-07-01 10:00:00", "2026-07-01 10:00:00"]
            ]
        },
        # 35. administrative_regions
        {
            "name": "35. administrative_regions (Vùng Địa lý Hành chính)",
            "headers": ["id", "name", "name_en", "code_name", "code_name_en"],
            "rows": [
                [1, "Đông Nam Bộ", "Southeast", "dong_nam_bo", "southeast"],
                [2, "Đồng bằng sông Hồng", "Red River Delta", "dong_bang_song_hong", "red_river_delta"]
            ]
        },
        # 36. administrative_units
        {
            "name": "36. administrative_units (Cấp Đơn vị Hành chính)",
            "headers": ["id", "full_name", "full_name_en", "short_name", "short_name_en", "code_name", "code_name_en"],
            "rows": [
                [1, "Thành phố trực thuộc trung ương", "Municipality", "Thành phố", "City", "thanh_pho_truc_thuoc_trung_uong", "municipality"],
                [2, "Tỉnh", "Province", "Tỉnh", "Province", "tinh", "province"],
                [3, "Phường", "Ward", "Phường", "Ward", "phuong", "ward"]
            ]
        },
        # 37. provinces
        {
            "name": "37. provinces (Tỉnh / Thành phố)",
            "headers": ["code", "name", "name_en", "full_name", "full_name_en", "code_name", "administrative_unit_id", "administrative_region_id"],
            "rows": [
                ["79", "Hồ Chí Minh", "Ho Chi Minh", "Thành phố Hồ Chí Minh", "Ho Chi Minh City", "ho_chi_minh", 1, 1],
                ["01", "Hà Nội", "Ha Noi", "Thành phố Hà Nội", "Ha Noi City", "ha_noi", 1, 2]
            ]
        },
        # 38. wards
        {
            "name": "38. wards (Phường / Xã)",
            "headers": ["code", "name", "name_en", "full_name", "full_name_en", "code_name", "province_code", "administrative_unit_id"],
            "rows": [
                ["26830", "Phường 14", "Ward 14", "Phường 14", "Ward 14", "phuong_14", "79", 3],
                ["26740", "Phường Bến Nghé", "Ben Nghe Ward", "Phường Bến Nghé", "Ben Nghe Ward", "phuong_ben_nghe", "79", 3]
            ]
        }
    ]

    current_row = 1

    for table in tables_data:
        # Title
        ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=len(table["headers"]))
        title_cell = ws.cell(row=current_row, column=1, value=table["name"])
        title_cell.font = title_font
        title_cell.fill = title_fill
        title_cell.alignment = Alignment(vertical="center", indent=1)
        ws.row_dimensions[current_row].height = 24
        current_row += 1

        # Header
        ws.row_dimensions[current_row].height = 20
        for col_idx, header in enumerate(table["headers"], start=1):
            cell = ws.cell(row=current_row, column=col_idx, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border
        current_row += 1

        # Rows
        for row_data in table["rows"]:
            ws.row_dimensions[current_row].height = 18
            for col_idx, val in enumerate(row_data, start=1):
                cell = ws.cell(row=current_row, column=col_idx, value=val)
                cell.font = data_font
                cell.border = thin_border
                if isinstance(val, (int, float)):
                    cell.alignment = Alignment(horizontal="right", vertical="center")
                elif isinstance(val, bool):
                    cell.alignment = Alignment(horizontal="center", vertical="center")
                else:
                    cell.alignment = Alignment(horizontal="left", vertical="center")
            current_row += 1

        # Spacing
        current_row += 1

    # Auto-fit column widths
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            if cell.value is not None:
                val_str = str(cell.value)
                # Ignore title merged rows
                if len(val_str) < 60:
                    max_len = max(max_len, len(val_str))
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    output_path = r"d:\smart-logistics-platform\Design DB\Database_Schema.xlsx"
    wb.save(output_path)
    print(f"[SUCCESS] Generated {output_path} successfully with all 38 tables!")

if __name__ == "__main__":
    build_excel()
