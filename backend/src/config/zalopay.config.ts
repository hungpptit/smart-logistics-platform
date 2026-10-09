import dotenv from 'dotenv';
dotenv.config();

export const zalopayConfig = {
  appId: process.env.ZALOPAY_APP_ID || '',
  key1: process.env.ZALOPAY_KEY1 || '',
  key2: process.env.ZALOPAY_KEY2 || '',
  endpoint: (process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn').replace(/\/$/, ''),
  callbackUrl: process.env.ZALOPAY_CALLBACK_URL || 'http://localhost:5000/api/payments/zalopay/callback',
};

if (!zalopayConfig.appId || !zalopayConfig.key1 || !zalopayConfig.key2) {
  console.warn('⚠️ [ZaloPay] Cảnh báo: Chưa cấu hình đầy đủ ZALOPAY_APP_ID, ZALOPAY_KEY1 hoặc ZALOPAY_KEY2 trong file .env');
}

