import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '../config/prisma';
import { zalopayConfig } from '../config/zalopay.config';
import {
  GatewayProvider,
  TransactionType,
  TransactionStatus,
  RefundReason,
  RefundStatus,
  PaymentStatus,
  CodCollectionStatus,
} from '@prisma/client';

export interface CreateZaloPayOrderParams {
  orderId: string;
  orderCode: string;
  amount: number;
  shippingAmount?: number;
  codAmount?: number;
  transactionType: TransactionType;
  description?: string;
  driverId?: string;
}

export interface ZaloPayCreateOrderResponse {
  success: boolean;
  merchantTransCode: string;
  orderUrl?: string;
  zpTransToken?: string;
  qrCode?: string;
  returnCode: number;
  returnMessage: string;
  paymentTransactionId: string;
}

export interface ZaloPayRefundParams {
  paymentTransactionId: string;
  amount: number;
  reasonCode: RefundReason;
  reason?: string;
  requestedByUserId?: string;
}

export class ZaloPayService {
  /**
   * Tạo chuỗi ngày định dạng YYMMDD phục vụ quy ước mã giao dịch của ZaloPay
   */
  private static getYYMMDD(): string {
    const d = new Date();
    const yy = d.getFullYear().toString().slice(-2);
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }

  /**
   * Sinh mã merchant_trans_code (app_trans_id) duy nhất: YYMMDD_appId_random
   * ZaloPay quy định app_trans_id phải bắt đầu bằng YYMMDD_
   */
  public static generateAppTransId(orderCode: string): string {
    const yymmdd = this.getYYMMDD();
    const cleanOrderCode = orderCode.replace(/[^a-zA-Z0-9]/g, '').slice(-8);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${yymmdd}_${cleanOrderCode}_${random}`;
  }

  /**
   * Sinh mã m_refund_id: YYMMDD_appId_random
   */
  public static generateRefundId(): string {
    const yymmdd = this.getYYMMDD();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `${yymmdd}_${zalopayConfig.appId}_${random}`;
  }

  /**
   * 1. TẠO ĐƠN HÀNG THANH TOÁN QUA ZALOPAY (Create Payment Order)
   * Client chỉ truyền orderId, Backend tự động bóc tách số tiền từ DB (Chống gian lận Client)
   */
  public async createPaymentOrder(params: CreateZaloPayOrderParams): Promise<ZaloPayCreateOrderResponse> {
    const {
      orderId,
      orderCode,
      transactionType,
      description,
      driverId,
    } = params;

    // 1.1. Lấy thông tin OrderPayment trực tiếp từ CSDL (Không tin số tiền từ client)
    const orderPayment = await prisma.orderPayment.findUnique({
      where: { orderId },
      include: {
        order: true,
        transactions: {
          where: {
            transactionType,
            transactionStatus: TransactionStatus.PENDING,
          },
        },
      },
    });

    if (!orderPayment) {
      throw new Error(`Không tìm thấy thông tin thanh toán của đơn hàng ${orderCode}`);
    }

    // Tự động tính số tiền thực tế từ DB dựa trên loại giao dịch
    let finalAmount = 0;
    let shippingAmount: number | null = null;
    let codAmount: number | null = null;

    if (transactionType === TransactionType.PREPAY_SHIPPING) {
      // Khách hàng trả cước vận chuyển
      finalAmount = Number(orderPayment.finalShippingFee) + Number(orderPayment.finalInsuranceFee);
      shippingAmount = finalAmount;
    } else if (transactionType === TransactionType.COD_COLLECTION) {
      // Shipper thu COD và cước (nếu người nhận trả cước)
      const codVal = Number(orderPayment.finalCodAmount) || 0;
      const shipVal = orderPayment.feePayer === 'RECEIVER' 
        ? (Number(orderPayment.finalShippingFee) + Number(orderPayment.finalInsuranceFee)) 
        : 0;
      finalAmount = codVal + shipVal;
      codAmount = codVal;
      shippingAmount = shipVal > 0 ? shipVal : null;
    }

    // Fallback nếu truyền amount thủ công trong môi trường test/script
    if (finalAmount <= 0 && params.amount > 0) {
      finalAmount = params.amount;
    }

    if (finalAmount <= 0) {
      throw new Error('Số tiền thanh toán phải lớn hơn 0');
    }

    // Nếu đã có 1 phiên PENDING cũ, tự động hủy để tạo phiên mới (tránh kẹt)
    if (orderPayment.transactions.length > 0) {
      const activePending = orderPayment.transactions[0];
      await prisma.paymentTransaction.update({
        where: { id: activePending.id },
        data: { transactionStatus: TransactionStatus.CANCELLED },
      });
    }

    // 1.2. Sinh app_trans_id theo chuẩn ZaloPay
    const appTransId = ZaloPayService.generateAppTransId(orderCode);
    const appTime = Date.now();
    const expiresAt = new Date(appTime + 15 * 60 * 1000); // Hết hạn sau 15 phút

    const embedData = JSON.stringify({
      orderId,
      orderCode,
      transactionType,
      redirecturl: 'https://smartlogistics.vn/payment-result',
    });

    const items = JSON.stringify([
      {
        itemid: orderId,
        itemname: `Thanh toan don ${orderCode}`,
        itemprice: Math.round(finalAmount),
        itemquantity: 1,
      },
    ]);

    const orderDesc = description || (
      transactionType === TransactionType.PREPAY_SHIPPING
        ? `Thanh toan cuoc van chuyen don ${orderCode}`
        : `Thu ho COD don ${orderCode}`
    );

    // 1.3. Tính chữ ký số HMAC-SHA256 với key1
    const appUser = `user_${orderPayment.orderId.substring(0, 8)}`;
    const macData = `${zalopayConfig.appId}|${appTransId}|${appUser}|${Math.round(finalAmount)}|${appTime}|${embedData}|${items}`;
    const mac = crypto.createHmac('sha256', zalopayConfig.key1).update(macData).digest('hex');

    const zaloOrderPayload = {
      app_id: Number(zalopayConfig.appId),
      app_trans_id: appTransId,
      app_user: appUser,
      app_time: appTime,
      amount: Math.round(finalAmount),
      item: items,
      embed_data: embedData,
      callback_url: zalopayConfig.callbackUrl,
      description: orderDesc,
      bank_code: '',
      mac,
    };

    console.log(`💳 [ZaloPay] Creating order for ${orderCode} (Trans: ${appTransId}, Amount: ${finalAmount} VND)`);

    // 1.4. Gọi API ZaloPay Gateway
    const response = await axios.post(`${zalopayConfig.endpoint}/v2/create`, null, {
      params: zaloOrderPayload,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });

    const resData = response.data;
    const isSuccess = resData.return_code === 1;

    // 1.5. Lưu bản ghi PaymentTransaction vào CSDL
    const transaction = await prisma.paymentTransaction.create({
      data: {
        orderPaymentId: orderPayment.id,
        gatewayProvider: GatewayProvider.ZALOPAY,
        merchantTransCode: appTransId,
        gatewayTransCode: resData.zp_trans_token || null,
        amount: finalAmount,
        shippingAmount,
        codAmount,
        currency: 'VND',
        transactionType,
        transactionStatus: isSuccess ? TransactionStatus.PENDING : TransactionStatus.FAILED,
        paymentUrl: resData.order_url || null,
        qrCodeUrl: resData.order_url || null,
        collectedByDriverId: driverId || null,
        expiresAt,
        failureCode: !isSuccess ? String(resData.return_code) : null,
        failureMessage: !isSuccess ? resData.return_message : null,
        providerMetadata: {
          zp_trans_token: resData.zp_trans_token,
          sub_return_code: resData.sub_return_code,
          sub_return_message: resData.sub_return_message,
        },
      },
    });

    return {
      success: isSuccess,
      merchantTransCode: appTransId,
      orderUrl: resData.order_url,
      zpTransToken: resData.zp_trans_token,
      qrCode: resData.order_url,
      returnCode: resData.return_code,
      returnMessage: resData.return_message,
      paymentTransactionId: transaction.id,
    };
  }

  /**
   * 2. XÁC THỰC WEBHOOK IPN (Verify Callback from ZaloPay)
   * Sử dụng crypto.timingSafeEqual chống Side-channel Timing Attack
   */
  public verifyCallback(dataStr: string, receivedMac: string): boolean {
    try {
      if (!dataStr || !receivedMac) return false;

      const calculatedMac = crypto
        .createHmac('sha256', zalopayConfig.key2)
        .update(dataStr)
        .digest('hex');

      const calculatedBuf = Buffer.from(calculatedMac, 'utf8');
      const receivedBuf = Buffer.from(receivedMac, 'utf8');

      if (calculatedBuf.length !== receivedBuf.length) {
        return false;
      }

      // So sánh an toàn thời gian cố định
      return crypto.timingSafeEqual(calculatedBuf, receivedBuf);
    } catch (error) {
      console.error('❌ [ZaloPay] Error in verifyCallback:', error);
      return false;
    }
  }

  /**
   * 3. XỬ LÝ KẾT QUẢ WEBHOOK IPN (Process Webhook Callback)
   * - Xác thực HMAC bằng timingSafeEqual
   * - Đối chiếu khớp app_id và amount trong DB
   * - Idempotent update: trả 1 cho thành công, 2 cho lặp
   */
  public async handleCallback(callbackBody: { data: string; mac: string; type?: number }) {
    const { data: dataStr, mac } = callbackBody;

    // 3.1. Xác thực chữ ký số bằng key2 (Timing-safe)
    const isValid = this.verifyCallback(dataStr, mac);
    if (!isValid) {
      console.warn('⚠️ [ZaloPay Callback] Chữ ký MAC không hợp lệ!');
      return { return_code: -1, return_message: 'mac not equal' };
    }

    const parsedData = JSON.parse(dataStr);
    const {
      app_id: receivedAppId,
      app_trans_id: merchantTransCode,
      zp_trans_id: gatewayTransCode,
      amount: receivedAmount,
      server_time: serverTime,
    } = parsedData;

    // 3.2. Đối chiếu app_id
    if (String(receivedAppId) !== String(zalopayConfig.appId)) {
      console.warn(`⚠️ [ZaloPay Callback] App ID không khớp! (Nhận: ${receivedAppId}, Mong đợi: ${zalopayConfig.appId})`);
      return { return_code: -1, return_message: 'app_id invalid' };
    }

    console.log(`🔔 [ZaloPay Callback] Verified MAC for Trans: ${merchantTransCode}, Amount: ${receivedAmount}`);

    // 3.3. Đối chiếu giao dịch trong CSDL
    const existingTransaction = await prisma.paymentTransaction.findFirst({
      where: { merchantTransCode },
      include: { orderPayment: true },
    });

    if (!existingTransaction) {
      console.warn(`⚠️ [ZaloPay Callback] Không tìm thấy giao dịch ${merchantTransCode} trong CSDL`);
      return { return_code: -1, return_message: 'transaction not found' };
    }

    // 3.4. Đối chiếu số tiền amount (Chống giả mạo số tiền)
    if (Math.round(Number(existingTransaction.amount)) !== Math.round(Number(receivedAmount))) {
      console.error(`🚨 [ZaloPay Callback] SỐ TIỀN KHÔNG KHỚP! (DB: ${existingTransaction.amount}, ZaloPay: ${receivedAmount})`);
      return { return_code: -1, return_message: 'amount mismatch' };
    }

    // 3.5. Kiểm tra tính Idempotent: nếu đã SUCCESS thì trả mã 2 (ZaloPay convention: duplicate callback)
    if (existingTransaction.transactionStatus === TransactionStatus.SUCCESS) {
      console.log(`ℹ️ [ZaloPay Callback] Giao dịch ${merchantTransCode} đã được ghi nhận trước đó (Idempotent replay).`);
      return { return_code: 2, return_message: 'duplicate callback, already processed' };
    }

    // 3.6. Cập nhật trạng thái trong Transaction CSDL an toàn
    return await prisma.$transaction(async (tx) => {
      const updateResult = await tx.paymentTransaction.updateMany({
        where: {
          merchantTransCode,
          transactionStatus: {
            in: [TransactionStatus.PENDING, TransactionStatus.EXPIRED, TransactionStatus.CANCELLED],
          },
        },
        data: {
          transactionStatus: TransactionStatus.SUCCESS,
          gatewayTransCode: String(gatewayTransCode),
          paidAt: new Date(serverTime || Date.now()),
          rawCallbackPayload: parsedData,
        },
      });

      if (updateResult.count === 0) {
        return { return_code: 2, return_message: 'already processed' };
      }

      const orderPayment = existingTransaction.orderPayment;
      const updateData: any = {
        paymentMethod: 'ZALOPAY',
        version: { increment: 1 },
      };

      if (existingTransaction.transactionType === TransactionType.PREPAY_SHIPPING) {
        updateData.shippingPaymentStatus = PaymentStatus.PAID;
      } else if (existingTransaction.transactionType === TransactionType.COD_COLLECTION) {
        updateData.codCollectionStatus = CodCollectionStatus.COLLECTED;
      }

      updateData.paymentStatus = PaymentStatus.PAID;

      await tx.orderPayment.update({
        where: { id: orderPayment.id },
        data: updateData,
      });

      console.log(`✅ [ZaloPay Callback] Đã cập nhật thành công đơn hàng ${orderPayment.orderId} sang PAID`);
      return { return_code: 1, return_message: 'success' };
    });
  }

  /**
   * 4. TRA CỨU TRẠNG THÁI GIAO DỊCH (Query Order Status)
   */
  public async queryOrderStatus(merchantTransCode: string) {
    const macData = `${zalopayConfig.appId}|${merchantTransCode}|${zalopayConfig.key1}`;
    const mac = crypto.createHmac('sha256', zalopayConfig.key1).update(macData).digest('hex');

    const params = {
      app_id: Number(zalopayConfig.appId),
      app_trans_id: merchantTransCode,
      mac,
    };

    const response = await axios.post(`${zalopayConfig.endpoint}/v2/query`, null, {
      params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });

    const resData = response.data;
    return {
      success: resData.return_code === 1,
      returnCode: resData.return_code,
      returnMessage: resData.return_message,
      isProcessing: resData.is_processing,
      amount: resData.amount,
      zpTransId: resData.zp_trans_id,
      discountAmount: resData.discount_amount,
    };
  }

  /**
   * 5. HOÀN TIỀN (Refund Order via ZaloPay)
   */
  public async refundPayment(params: ZaloPayRefundParams) {
    const { paymentTransactionId, amount, reasonCode, reason, requestedByUserId } = params;

    // 5.1. Kiểm tra transaction gốc
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: paymentTransactionId },
      include: {
        refunds: {
          where: {
            refundStatus: { in: [RefundStatus.PENDING, RefundStatus.SUCCESS] },
          },
        },
        orderPayment: true,
      },
    });

    if (!transaction) {
      throw new Error('Không tìm thấy giao dịch gốc');
    }

    if (transaction.transactionStatus !== TransactionStatus.SUCCESS) {
      throw new Error('Chỉ có thể hoàn tiền cho giao dịch đã thanh toán thành công (SUCCESS)');
    }

    if (!transaction.gatewayTransCode) {
      throw new Error('Giao dịch chưa có mã zp_trans_id từ ZaloPay');
    }

    // 5.2. Kiểm tra bất biến: SUM(refund) <= transaction.amount
    const totalRefundedOrPending = transaction.refunds.reduce(
      (sum, r) => sum + Number(r.amount),
      0
    );

    const availableAmount = Number(transaction.amount) - totalRefundedOrPending;
    if (amount > availableAmount) {
      throw new Error(`Số tiền hoàn (${amount}) vượt quá số tiền còn lại có thể hoàn (${availableAmount})`);
    }

    // 5.3. Sinh mã m_refund_id duy nhất
    const mRefundId = ZaloPayService.generateRefundId();
    const timestamp = Date.now();
    const zpTransIdStr = String(transaction.gatewayTransCode);
    const refundAmount = Math.round(amount);
    const refundFeeAmount = 0;
    const refundDesc = reason || 'Hoan tien don hang Logistics';

    // Công thức ZaloPay refund: app_id|zp_trans_id|amount|refund_fee_amount|description|timestamp
    const macInput = `${zalopayConfig.appId}|${zpTransIdStr}|${refundAmount}|${refundFeeAmount}|${refundDesc}|${timestamp}`;
    const mac = crypto.createHmac('sha256', zalopayConfig.key1).update(macInput).digest('hex');

    const refundPayload = {
      app_id: Number(zalopayConfig.appId),
      m_refund_id: mRefundId,
      zp_trans_id: zpTransIdStr,
      amount: refundAmount,
      refund_fee_amount: refundFeeAmount,
      timestamp,
      description: refundDesc,
      mac,
    };

    console.log(`💸 [ZaloPay] Calling /v2/refund for Trans: ${transaction.merchantTransCode} (m_refund_id: ${mRefundId}, amount: ${refundAmount})`);

    // 5.4. Lưu trước bản ghi RefundTransaction ở trạng thái PENDING (Chống retry trùng theo khuyến nghị Claude)
    const refundRecord = await prisma.refundTransaction.create({
      data: {
        paymentTransactionId: transaction.id,
        merchantRefundCode: mRefundId,
        amount: refundAmount,
        reasonCode,
        reason: refundDesc,
        refundStatus: RefundStatus.PENDING,
        requestedByUserId: requestedByUserId || null,
      },
    });

    // 5.5. Gọi API ZaloPay Refund
    let zaloResponse: any;
    try {
      const response = await axios.post(`${zalopayConfig.endpoint}/v2/refund`, refundPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });
      zaloResponse = response.data;
    } catch (apiError: any) {
      console.error('❌ [ZaloPay] Refund API call failed:', apiError.response?.data || apiError.message);
      await prisma.refundTransaction.update({
        where: { id: refundRecord.id },
        data: {
          refundStatus: RefundStatus.FAILED,
          failureCode: 'NETWORK_ERROR',
          rawGatewayResponse: apiError.response?.data || { error: apiError.message },
        },
      });
      throw new Error(`Lỗi kết nối cổng thanh toán ZaloPay: ${apiError.message}`);
    }

    // return_code: 1 = Thành công, 3 = Đang xử lý (bất đồng bộ)
    const isSuccess = zaloResponse.return_code === 1 || zaloResponse.return_code === 3;

    // 5.6. Cập nhật kết quả hoàn tiền
    const updatedRefund = await prisma.refundTransaction.update({
      where: { id: refundRecord.id },
      data: {
        gatewayRefundCode: zaloResponse.refund_id ? String(zaloResponse.refund_id) : null,
        refundStatus: isSuccess ? RefundStatus.SUCCESS : RefundStatus.FAILED,
        refundedAt: isSuccess ? new Date() : null,
        failureCode: !isSuccess ? String(zaloResponse.return_code) : null,
        rawGatewayResponse: zaloResponse,
      },
    });

    // 5.7. Nếu hoàn thành công, cập nhật OrderPayment
    if (isSuccess && transaction.orderPayment) {
      const isFullRefund = (totalRefundedOrPending + refundAmount) >= Number(transaction.amount);
      await prisma.orderPayment.update({
        where: { id: transaction.orderPayment.id },
        data: {
          paymentStatus: isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
          shippingPaymentStatus: transaction.transactionType === TransactionType.PREPAY_SHIPPING && isFullRefund
            ? PaymentStatus.REFUNDED
            : undefined,
        },
      });
    }

    return {
      success: isSuccess,
      mRefundId,
      gatewayRefundId: zaloResponse.refund_id,
      returnCode: zaloResponse.return_code,
      returnMessage: zaloResponse.return_message,
      refundTransactionId: updatedRefund.id,
    };
  }

  /**
   * 6. TRA CỨU TRẠNG THÁI HOÀN TIỀN (Query Refund Status)
   */
  public async queryRefundStatus(mRefundId: string) {
    const timestamp = Date.now();
    const macData = `${zalopayConfig.appId}|${mRefundId}|${timestamp}`;
    const mac = crypto.createHmac('sha256', zalopayConfig.key1).update(macData).digest('hex');

    const params = {
      app_id: Number(zalopayConfig.appId),
      m_refund_id: mRefundId,
      timestamp,
      mac,
    };

    const response = await axios.post(`${zalopayConfig.endpoint}/v2/query_refund`, null, {
      params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });

    const resData = response.data;
    return {
      success: resData.return_code === 1,
      returnCode: resData.return_code,
      returnMessage: resData.return_message,
      refundAmount: resData.refund_amount,
    };
  }
}

export const zalopayService = new ZaloPayService();
