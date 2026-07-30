import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Download, Trash2, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CONFIG } from '../../../config';
import { formatCurrency } from '../../../lib/utils';

interface ParsedOrderRow {
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderWard: string;
  senderProvince: string;

  receiverName: string;
  receiverPhone: string;
  deliveryAddressText: string;
  receiverWard: string;
  receiverProvince: string;

  description: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  declaredValue: number;
  isFragile: boolean;
  temperatureRequirement?: string;

  serviceCode: string;
  pickupType: 'PICKUP' | 'DROP_OFF';
  pickupDateStr: string;
  pickupShiftStr: string;
  feePayer: 'SENDER' | 'RECEIVER';
  paymentMethod: 'CASH' | 'COD' | 'BANK_TRANSFER' | 'E_WALLET';
  codAmount: number;
  shipperNote: string;
}

interface BulkOrderUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

export const BulkOrderUploadModal: React.FC<BulkOrderUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [parsedRows, setParsedRows] = useState<ParsedOrderRow[]>([]);
  const [createdOrderCodes, setCreatedOrderCodes] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    setLoading(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (!jsonRows || jsonRows.length <= 1) {
          setErrorMessage('File Excel không có dữ liệu hoặc sai định dạng mẫu.');
          setLoading(false);
          return;
        }

        const rows: ParsedOrderRow[] = [];
        for (let i = 1; i < jsonRows.length; i++) {
          const r = jsonRows[i];
          if (!r || r.length < 5) continue;

          // Resolve Receiver details (Step 2)
          const rName = r[5] ? String(r[5]).trim() : (r[0] ? String(r[0]).trim() : '');
          const rPhone = r[6] ? String(r[6]).trim() : (r[1] ? String(r[1]).trim() : '');
          const rAddr = r[7] ? String(r[7]).trim() : (r[2] ? String(r[2]).trim() : '');
          const rWard = r[8] ? String(r[8]).trim() : '';
          const rProv = r[9] ? String(r[9]).trim() : 'Thành phố Hồ Chí Minh';

          if (!rName || !rPhone || !rAddr) continue;

          const fragileRaw = r[16] ? String(r[16]).trim().toLowerCase() : '';
          const serviceRaw = r[18] ? String(r[18]).trim().toUpperCase() : '';
          const pickupTypeRaw = r[19] ? String(r[19]).trim().toUpperCase() : '';
          const feePayerRaw = r[22] ? String(r[22]).trim().toUpperCase() : '';
          const paymentRaw = r[23] ? String(r[23]).trim().toUpperCase() : '';

          rows.push({
            senderName: r[0] ? String(r[0]).trim() : '',
            senderPhone: r[1] ? String(r[1]).trim() : '',
            senderAddress: r[2] ? String(r[2]).trim() : '',
            senderWard: r[3] ? String(r[3]).trim() : '',
            senderProvince: r[4] ? String(r[4]).trim() : '',

            receiverName: rName,
            receiverPhone: rPhone,
            deliveryAddressText: rAddr,
            receiverWard: rWard,
            receiverProvince: rProv,

            description: r[10] ? String(r[10]).trim() : 'Hàng hóa tổng hợp',
            weight: parseFloat(r[11]) || 1.0,
            length: parseFloat(r[12]) || 10.0,
            width: parseFloat(r[13]) || 10.0,
            height: parseFloat(r[14]) || 10.0,
            declaredValue: parseFloat(r[15]) || 0.0,
            isFragile: fragileRaw === 'có' || fragileRaw === 'true' || fragileRaw === '1',
            temperatureRequirement: r[17] ? String(r[17]).trim() : undefined,

            serviceCode: serviceRaw.includes('EXPRESS') ? 'EXPRESS' : 'STANDARD',
            pickupType: pickupTypeRaw.includes('DROP_OFF') ? 'DROP_OFF' : 'PICKUP',
            pickupDateStr: r[20] ? String(r[20]).trim() : 'Hôm nay',
            pickupShiftStr: r[21] ? String(r[21]).trim() : 'Ca Sáng',
            feePayer: feePayerRaw.includes('RECEIVER') ? 'RECEIVER' : 'SENDER',
            paymentMethod: paymentRaw.includes('COD') ? 'COD' : (paymentRaw.includes('BANK') ? 'BANK_TRANSFER' : 'CASH'),
            codAmount: parseFloat(r[24]) || 0.0,
            shipperNote: r[25] ? String(r[25]).trim() : '',
          });
        }

        if (rows.length === 0) {
          setErrorMessage('Không tìm thấy dòng đơn hàng hợp lệ nào trong file Excel.');
        } else {
          setParsedRows(rows);
        }
      } catch (err) {
        setErrorMessage('Lỗi đọc file Excel: Vui lòng dùng đúng định dạng file mẫu .xlsx / .csv');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDeleteRow = (index: number) => {
    setParsedRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkSubmit = async () => {
    if (parsedRows.length === 0 || !token) return;

    setSubmitting(true);
    setProgress({ current: 0, total: parsedRows.length });
    const codes: string[] = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      setProgress({ current: i + 1, total: parsedRows.length });

      const payload = {
        serviceCode: row.serviceCode,
        feePayer: row.feePayer,
        paymentMethod: row.paymentMethod,
        pickupType: row.pickupType,
        codAmount: row.codAmount,
        senderContact: {
          fullName: row.senderName || 'Kho hàng Khách hàng',
          phone: row.senderPhone || '0900000000',
        },
        receiverContact: {
          fullName: row.receiverName,
          phone: row.receiverPhone,
        },
        pickupAddress: {
          addressLine1: row.senderAddress || '100 Nguyễn Du',
          province: row.senderProvince || 'Thành phố Hồ Chí Minh',
          ward: row.senderWard || 'Phường Bến Thành',
        },
        deliveryAddress: {
          addressLine1: row.deliveryAddressText,
          province: row.receiverProvince || 'Thành phố Hồ Chí Minh',
          ward: row.receiverWard || '',
        },
        packages: [
          {
            weight: row.weight,
            length: row.length,
            width: row.width,
            height: row.height,
            isFragile: row.isFragile,
            description: row.description,
            declaredValue: row.declaredValue,
            temperatureRequirement: row.temperatureRequirement,
          },
        ],
      };

      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && data.success && data.data) {
          const code = data.data.orderCode || data.data.trackingCode || data.data.id;
          codes.push(code);
        }
      } catch (err) {
        console.error('Lỗi khi tạo đơn hàng loạt:', err);
      }
    }

    setSubmitting(false);
    setCreatedOrderCodes(codes);
    setShowSuccessModal(true);
  };

  const handleDownloadTemplate = () => {
    window.open('/MAU_FILE_TAO_DON_HANG_LOAT_SLP.xlsx', '_blank');
  };

  const totalWeight = parsedRows.reduce((acc, r) => acc + r.weight, 0);
  const totalCOD = parsedRows.reduce((acc, r) => acc + r.codAmount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Tải Lên Đơn Hàng Loạt Bằng Excel</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Nạp danh sách hàng trăm đơn hàng tự động thông qua File Excel mẫu chuẩn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Download Template Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Tải xuống File Excel Mẫu Chuẩn (26 Cột)</h4>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Đã cài đặt sẵn danh sách xổ xuống Dropdown chọn Tỉnh/TP & Phường/Xã chuẩn từ CSDL
                </p>
              </div>
            </div>
            <a
              href="/MAU_FILE_TAO_DON_HANG_LOAT_SLP.xlsx"
              download="MAU_FILE_TAO_DON_HANG_LOAT_SLP.xlsx"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center space-x-2 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>TẢI MAU EXCEL (.XLSX)</span>
            </a>
          </div>

          {/* Upload Dropzone */}
          {parsedRows.length === 0 ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                  : 'border-gray-300 dark:border-gray-700 hover:border-red-400 dark:hover:border-red-500 bg-gray-50/30 dark:bg-gray-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {loading ? (
                <div className="flex flex-col items-center space-y-3 py-6">
                  <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Đang đọc dữ liệu từ file Excel...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3 py-4">
                  <div className="w-14 h-14 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      Kéo thả File Excel vào đây hoặc <span className="text-red-600 underline">bấm để chọn file</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Hỗ trợ các định dạng .XLSX, .XLS và .CSV
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Parsed Orders Data Table Preview */
            <div className="space-y-4">
              {/* Metrics Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tổng số đơn nạp:</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{parsedRows.length} đơn hàng</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tổng trọng lượng quy đổi:</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalWeight.toFixed(2)} kg</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tổng tiền thu hộ COD:</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(totalCOD)}</p>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 sticky top-0 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Người nhận & SĐT</th>
                      <th className="p-3">Địa chỉ giao hàng</th>
                      <th className="p-3">Mô tả gói hàng</th>
                      <th className="p-3">Cân nặng</th>
                      <th className="p-3">Gói dịch vụ</th>
                      <th className="p-3">Thu hộ COD</th>
                      <th className="p-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                        <td className="p-3 font-bold text-gray-500">{idx + 1}</td>
                        <td className="p-3">
                          <p className="font-bold text-gray-900 dark:text-white">{row.receiverName}</p>
                          <p className="text-gray-500">{row.receiverPhone}</p>
                        </td>
                        <td className="p-3 max-w-[220px] truncate" title={`${row.deliveryAddressText}, ${row.receiverWard}, ${row.receiverProvince}`}>
                          {row.deliveryAddressText}, {row.receiverWard}, {row.receiverProvince}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold">{row.description}</p>
                          {row.isFragile && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Dễ vỡ</span>}
                        </td>
                        <td className="p-3 font-semibold">{row.weight} kg</td>
                        <td className="p-3 font-bold text-blue-600">{row.serviceCode}</td>
                        <td className="p-3 font-bold text-emerald-600">{formatCurrency(row.codAmount)}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteRow(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa đơn này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setParsedRows([])}
                  className="text-xs text-gray-500 hover:text-red-600 underline font-medium"
                >
                  Hủy & Chọn lại File Excel khác
                </button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center space-x-3 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submitting Progress Bar */}
          {submitting && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
                <span>Đang xử lý tạo đơn hàng...</span>
                <span>{progress.current} / {progress.total} đơn</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            HỦY BỎ
          </button>

          {parsedRows.length > 0 && (
            <button
              onClick={handleBulkSubmit}
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ĐANG TẠO {parsedRows.length} ĐƠN...</span>
                </>
              ) : (
                <>
                  <span>XÁC NHẬN TẠO {parsedRows.length} ĐƠN HÀNG</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Success Dialog Popup */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full text-center space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl animate-scale-up">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">TẠO LOẠT ĐƠN HÀNG THÀNH CÔNG!</h3>
            <p className="text-xs text-gray-500">
              Đã khởi tạo thành công <strong className="text-emerald-600 font-bold">{createdOrderCodes.length} đơn hàng</strong> vào CSDL hệ thống Smart Logistics Platform.
            </p>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-left max-h-36 overflow-y-auto font-mono text-xs space-y-1 text-gray-700 dark:text-gray-300">
              {createdOrderCodes.map((code, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>Mã đơn #{idx + 1}:</span>
                  <span className="font-bold text-red-600">{code}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                onSuccess();
                onClose();
              }}
              className="w-full py-3 bg-gray-900 text-white font-bold text-xs rounded-xl hover:bg-black transition-colors"
            >
              HOÀN TẤT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
