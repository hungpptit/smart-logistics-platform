import json
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

# Load grouped provinces & wards data exported from DB
with open('d:/smart-logistics-platform/backend/provinces_wards_grouped.json', 'r', encoding='utf-8') as f:
    grouped_data = json.load(f)

wb = openpyxl.Workbook()

# Sheet 1: Main Order Template
ws_main = wb.active
ws_main.title = "Đơn Hàng Loạt SLP"
ws_main.views.sheetView[0].showGridLines = True

# Sheet 2: Reference Administrative Lookup Sheet
ws_lookup = wb.create_sheet(title="DanhMucHanhChinh")
ws_lookup.views.sheetView[0].showGridLines = True

# 1. Write Column A in Lookup Sheet: All 34 Provinces
ws_lookup.cell(row=1, column=1, value="Tỉnh/Thành Phố").font = Font(bold=True, color="1E3A8A")

prov_names = list(grouped_data.keys())
for idx, prov_fullName in enumerate(prov_names, start=2):
    ws_lookup.cell(row=idx, column=1, value=prov_fullName)

ws_lookup.column_dimensions['A'].width = 30

# Helper function to convert Province FullName into a valid Excel Named Range string
def make_valid_range_name(name):
    clean = name.replace(" ", "_").replace(".", "").replace("-", "_")
    # Remove accents if needed, or keep Unicode Excel range name
    return clean

# 2. Write Wards for each Province in separate columns and define Excel Named Ranges
for prov_idx, prov_fullName in enumerate(prov_names, start=2):
    col_letter = get_column_letter(prov_idx)
    range_name = make_valid_range_name(prov_fullName)
    
    # Write Column Header in Lookup Sheet
    ws_lookup.cell(row=1, column=prov_idx, value=prov_fullName).font = Font(bold=True)
    
    wards_list = grouped_data[prov_fullName].get('wards', [])
    for w_idx, ward_fullName in enumerate(wards_list, start=2):
        ws_lookup.cell(row=w_idx, column=prov_idx, value=ward_fullName)
    
    ws_lookup.column_dimensions[col_letter].width = 32
    
    # Create Excel Named Range for this Province's Wards
    last_row = max(len(wards_list) + 1, 2)
    formula_ref = f"DanhMucHanhChinh!${col_letter}$2:${col_letter}${last_row}"
    
    # Define defined_name in workbook
    new_defined_name = openpyxl.workbook.defined_name.DefinedName(range_name, attr_text=formula_ref)
    wb.defined_names.add(new_defined_name)

print(f"Created {len(prov_names)} dynamic Excel Named Ranges for Province-Ward filtering.")

# --- MAIN SHEET HEADERS ---
headers = [
    # STEP 1: NGƯỜI GỬI
    ("HoTenNguoiGui", "1. Họ tên người gửi", "1E3A8A"),
    ("SoDienThoaiGui", "1. SĐT người gửi", "1E3A8A"),
    ("DiaChiGui", "1. Địa chỉ lấy hàng (Số nhà, đường)", "1E3A8A"),
    ("PhuongXaGui", "1. Phường/Xã gửi (Dropdown theo Tỉnh)", "1E3A8A"),
    ("TinhThanhGui", "1. Tỉnh/TP gửi (Dropdown)", "1E3A8A"),

    # STEP 2: NGƯỜI NHẬN
    ("HoTenNguoiNhan", "2. Họ tên người nhận*", "4338CA"),
    ("SoDienThoaiNhan", "2. SĐT người nhận*", "4338CA"),
    ("DiaChiGiaoHang", "2. Địa chỉ giao (Số nhà, đường)*", "4338CA"),
    ("PhuongXaNhan", "2. Phường/Xã nhận (Dropdown theo Tỉnh)*", "4338CA"),
    ("TinhThanhNhan", "2. Tỉnh/TP nhận (Dropdown)*", "4338CA"),

    # STEP 3: GÓI HÀNG
    ("TenHangHoa", "3. Mô tả danh mục hàng hóa*", "D97706"),
    ("TrongLuongKg", "3. Trọng lượng (kg)*", "D97706"),
    ("DaiCm", "3. Dài (cm)", "D97706"),
    ("RongCm", "3. Rộng (cm)", "D97706"),
    ("CaoCm", "3. Cao (cm)", "D97706"),
    ("GiaTriKhaiGia", "3. Khai giá hàng hóa (VNĐ)", "D97706"),
    ("HangDeVo", "3. Hàng dễ vỡ?", "D97706"),
    ("YeuCauNhietDo", "3. Yêu cầu nhiệt độ", "D97706"),

    # STEP 4: DỊCH VỤ & THANH TOÁN
    ("GoiCuocDichVu", "4. Gói cước dịch vụ", "059669"),
    ("HinhThucGuiHang", "4. Hình thức gửi hàng", "059669"),
    ("NgayLayHang", "4. Ngày lấy hàng", "059669"),
    ("CaThuHang", "4. Ca thu hàng", "059669"),
    ("NguoiChiuPhi", "4. Người chịu phí", "059669"),
    ("HinhThucThanhToan", "4. Hình thức thanh toán", "059669"),
    ("TienThuHoCOD", "4. Tiền thu hộ COD (VNĐ)", "059669"),
    ("GhiChuGiaoHang", "4. Ghi chú dặn Shipper", "059669"),
]

font_header = Font(name="Arial", size=10, bold=True, color="FFFFFF")
align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)

thin_border = Border(
    left=Side(style='thin', color='D1D5DB'),
    right=Side(style='thin', color='D1D5DB'),
    top=Side(style='thin', color='D1D5DB'),
    bottom=Side(style='thin', color='D1D5DB')
)

ws_main.row_dimensions[1].height = 40

for col_idx, (code, title, fill_color) in enumerate(headers, 1):
    cell = ws_main.cell(row=1, column=col_idx, value=title)
    cell.font = font_header
    cell.fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")
    cell.alignment = align_center
    cell.border = thin_border

# Sample Rows (Row 2 -> Row 4)
sample_data = [
    [
        "Kho Hàng SLP", "0900000000", "100 Nguyễn Du", "Phường Bến Thành", "Thành phố Hồ Chí Minh",
        "Nguyễn Văn An", "0901234567", "123 Lê Văn Việt", "Phường Hiệp Phú", "Thành phố Hồ Chí Minh",
        "Điện thoại iPhone 15 Pro Max 256GB", 0.8, 15, 10, 5, 28000000, "Có", "Thường",
        "STANDARD (Tiết kiệm)", "PICKUP (Shipper lấy tận nơi)", "Hôm nay", "Ca Sáng (08:00 - 12:00)", "SENDER (Người gửi trả)", "CASH (Tiền mặt)", 0, "Cho kiểm tra hàng trước khi nhận"
    ],
    [
        "Kho Hàng SLP", "0900000000", "100 Nguyễn Du", "Phường Bến Thành", "Thành phố Hồ Chí Minh",
        "Trần Thị Bình", "0987654321", "456 Cầu Giấy", "Phường Cầu Giấy", "Thành phố Hà Nội",
        "Bộ mỹ phẩm dưỡng da Hàn Quốc", 1.2, 20, 15, 10, 3500000, "Có", "Thường",
        "EXPRESS (Hỏa tốc 2h)", "PICKUP (Shipper lấy tận nơi)", "Hôm nay", "Ca Chiều (13:00 - 18:00)", "RECEIVER (Người nhận trả)", "COD (Thu hộ COD)", 1500000, "Giao giờ hành chính"
    ]
]

align_data = Alignment(horizontal="left", vertical="center")
font_data = Font(name="Arial", size=9)

for r_idx, row_values in enumerate(sample_data, start=2):
    ws_main.row_dimensions[r_idx].height = 24
    for c_idx, val in enumerate(row_values, start=1):
        cell = ws_main.cell(row=r_idx, column=c_idx, value=val)
        cell.font = font_data
        cell.alignment = align_data
        cell.border = thin_border

# --- DATA VALIDATIONS (PROVINCES & DEPENDENT WARDS) ---
prov_range = f"=DanhMucHanhChinh!$A$2:$A${len(prov_names)+1}"

# Province Dropdowns
dv_prov_sender = DataValidation(type="list", formula1=prov_range, allow_blank=True)
dv_prov_receiver = DataValidation(type="list", formula1=prov_range, allow_blank=True)

# Dependent Ward Dropdowns using INDIRECT formula
dv_ward_sender = DataValidation(type="list", formula1='=INDIRECT(SUBSTITUTE(SUBSTITUTE(E2, " ", "_"), ".", ""))', allow_blank=True)
dv_ward_receiver = DataValidation(type="list", formula1='=INDIRECT(SUBSTITUTE(SUBSTITUTE(J2, " ", "_"), ".", ""))', allow_blank=True)

# Other Option Dropdowns
dv_fragile = DataValidation(type="list", formula1='"Có,Không"', allow_blank=True)
dv_service = DataValidation(type="list", formula1='"STANDARD (Tiết kiệm),EXPRESS (Hỏa tốc 2h)"', allow_blank=True)
dv_pickup_type = DataValidation(type="list", formula1='"PICKUP (Shipper lấy tận nơi),DROP_OFF (Gửi tại bưu cục)"', allow_blank=True)
dv_pickup_date = DataValidation(type="list", formula1='"Hôm nay,Ngày mai"', allow_blank=True)
dv_pickup_shift = DataValidation(type="list", formula1='"Ca Sáng (08:00 - 12:00),Ca Chiều (13:00 - 18:00)"', allow_blank=True)
dv_fee_payer = DataValidation(type="list", formula1='"SENDER (Người gửi trả),RECEIVER (Người nhận trả)"', allow_blank=True)
dv_payment = DataValidation(type="list", formula1='"CASH (Tiền mặt),COD (Thu hộ COD),BANK_TRANSFER (Chuyển khoản),E_WALLET (Ví điện tử)"', allow_blank=True)

# Add Data Validations to Main Worksheet
ws_main.add_data_validation(dv_prov_sender)
ws_main.add_data_validation(dv_ward_sender)
ws_main.add_data_validation(dv_prov_receiver)
ws_main.add_data_validation(dv_ward_receiver)
ws_main.add_data_validation(dv_fragile)
ws_main.add_data_validation(dv_service)
ws_main.add_data_validation(dv_pickup_type)
ws_main.add_data_validation(dv_pickup_date)
ws_main.add_data_validation(dv_pickup_shift)
ws_main.add_data_validation(dv_fee_payer)
ws_main.add_data_validation(dv_payment)

# Apply Cell Ranges
dv_prov_sender.add("E2:E500")
dv_ward_sender.add("D2:D500")
dv_prov_receiver.add("J2:J500")
dv_ward_receiver.add("I2:I500")

dv_fragile.add("Q2:Q500")
dv_service.add("S2:S500")
dv_pickup_type.add("T2:T500")
dv_pickup_date.add("U2:U500")
dv_pickup_shift.add("V2:V500")
dv_fee_payer.add("W2:W500")
dv_payment.add("X2:X500")

# Auto-fit column widths
for col in ws_main.columns:
    max_len = 0
    col_letter = get_column_letter(col[0].column)
    for cell in col:
        val_str = str(cell.value or '')
        if len(val_str) > max_len:
            max_len = len(val_str)
    ws_main.column_dimensions[col_letter].width = max(max_len + 4, 22)

excel_filepath = "d:/smart-logistics-platform/MAU_FILE_TAO_DON_HANG_LOAT_SLP.xlsx"
wb.save(excel_filepath)
print("Successfully generated Excel template with Dynamic Dependent Ward Dropdowns: " + excel_filepath)
