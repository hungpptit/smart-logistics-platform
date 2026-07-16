import amqp from 'amqplib';
import nodemailer from 'nodemailer';

class MailWorker {
  private url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  private queue = 'mail_queue';
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  public async start() {
    try {
      console.log(`[MailWorker] Connecting to RabbitMQ at ${this.url}...`);
      const connection = await amqp.connect(this.url);
      const channel = await connection.createChannel();
      
      await channel.assertQueue(this.queue, { durable: true });
      console.log(`[MailWorker] Listening for messages on queue "${this.queue}"...`);

      channel.consume(this.queue, async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          console.log('[MailWorker] Received message:', content);

          if (content.type === 'DRIVER_CREATED') {
            await this.sendDriverWelcomeEmail(content);
          } else if (content.type === 'STAFF_CREATED') {
            await this.sendStaffWelcomeEmail(content);
          } else if (content.type === 'CUSTOMER_CREATED') {
            await this.sendCustomerWelcomeEmail(content);
          } else if (content.type === 'SEND_OTP') {
            await this.sendOtpEmail(content);
          } else if (content.type === 'RESET_PASSWORD') {
            await this.sendResetPasswordEmail(content);
          }

          channel.ack(msg);
        } catch (error: any) {
          console.error('[MailWorker] Error processing message:', error.message);
          // Negative acknowledgement, requeue if temporary error
          channel.nack(msg, false, false); 
        }
      });
    } catch (error: any) {
      console.error(`[MailWorker] Failed to start mail worker: ${error.message}. Retrying in 10s...`);
      setTimeout(() => this.start(), 10000);
    }
  }

  private async sendDriverWelcomeEmail(data: {
    email: string;
    username: string;
    fullName: string;
    phone?: string;
    password: string;
    employeeCode: string;
  }) {
    const mailOptions = {
      from: `"Velocity Logistics" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: `[Velocity Logistics] Cấp tài khoản lái xe mới - ${data.employeeCode}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #bc0100; padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Velocity Logistics</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">Hệ thống Quản lý Vận tải & Điều phối Thông minh</p>
          </div>
          
          <div style="padding: 24px; background-color: #ffffff; color: #1a202c; line-height: 1.6;">
            <h3 style="margin-top: 0; color: #bc0100;">Xin chào anh/chị, ${data.fullName}</h3>
            <p>Hồ sơ tài xế của anh/chị đã được thiết lập thành công trên hệ thống <strong>Velocity Logistics</strong> với mã nhân viên <strong>${data.employeeCode}</strong>.</p>
            
            <p>Dưới đây là thông tin tài khoản dùng để đăng nhập vào ứng dụng di động dành cho tài xế (Velocity Driver App):</p>
            
            <div style="background-color: #f7fafc; border: 1px solid #edf2f7; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="width: 170px; font-weight: bold; color: #4a5568; padding-bottom: 8px;">Tài khoản đăng nhập:</td>
                  <td style="font-weight: bold; color: #1a202c; padding-bottom: 8px;">
                    Sử dụng <span style="color: #bc0100;">Địa chỉ Email</span> hoặc <span style="color: #bc0100;">Số điện thoại</span> dưới đây
                  </td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #4a5568; padding-bottom: 8px;">Địa chỉ email:</td>
                  <td style="font-family: monospace; font-weight: bold; color: #1a202c; padding-bottom: 8px;">${data.email}</td>
                </tr>
                ${data.phone ? `
                <tr>
                  <td style="font-weight: bold; color: #4a5568; padding-bottom: 8px;">Số điện thoại:</td>
                  <td style="font-family: monospace; font-weight: bold; color: #1a202c; padding-bottom: 8px;">${data.phone}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="font-weight: bold; color: #4a5568; padding-bottom: 8px;">Mật khẩu tạm thời:</td>
                  <td style="font-family: monospace; font-weight: bold; color: #bc0100; font-size: 15px; padding-bottom: 8px;">${data.password}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #4a5568;">Mã nhân viên:</td>
                  <td style="font-family: monospace; font-weight: bold; color: #1a202c;">${data.employeeCode}</td>
                </tr>
              </table>
            </div>
            
            <p style="background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 12px; border-radius: 4px; font-size: 13px; color: #7b341e;">
              <strong>* Khuyến nghị bảo mật:</strong> Vui lòng đăng nhập và thay đổi mật khẩu ngay trong lần sử dụng đầu tiên để bảo vệ tài khoản của mình.
            </p>
            
            <div style="margin-top: 24px; text-align: center;">
              <a href="#" style="background-color: #161D25; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: bold; text-transform: uppercase;">Tải ứng dụng Driver App</a>
            </div>
          </div>
          
          <div style="background-color: #f7fafc; padding: 16px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #edf2f7;">
            <p style="margin: 0;">Đây là email tự động từ hệ thống. Vui lòng không trả lời thư này.</p>
            <p style="margin: 4px 0 0 0;">&copy; 2026 Velocity Logistics. All Rights Reserved.</p>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`[MailWorker] Welcome email successfully sent to ${data.email}`);
  }

  private async sendOtpEmail(data: {
    email: string;
    username: string;
    otp: string;
  }) {
    const mailOptions = {
      from: `"Velocity Logistics" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: `[Velocity Logistics] Mã OTP kích hoạt tài khoản của bạn`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #bc0100; padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Velocity Logistics</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">Xác Thực Tài Khoản Đăng Ký</p>
          </div>
          
          <div style="padding: 24px; background-color: #ffffff; color: #1a202c; line-height: 1.6;">
            <h3 style="margin-top: 0; color: #bc0100;">Xin chào ${data.username},</h3>
            <p>Cảm ơn bạn đã lựa chọn sử dụng dịch vụ của <strong>Velocity Logistics</strong>. Để hoàn tất thủ tục đăng ký tài khoản khách hàng mới, vui lòng sử dụng mã xác thực OTP dưới đây:</p>
            
            <div style="background-color: #f7fafc; border: 1px solid #edf2f7; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
              <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #bc0100; letter-spacing: 6px; display: inline-block;">${data.otp}</span>
            </div>
            
            <p style="background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 12px; border-radius: 4px; font-size: 13px; color: #7b341e; margin-bottom: 20px;">
              <strong>* Lưu ý bảo mật:</strong> Mã OTP này sẽ có hiệu lực trong vòng <strong>5 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai khác.
            </p>
            
            <p>Nếu bạn không thực hiện yêu cầu đăng ký này, vui lòng bỏ qua email này.</p>
          </div>
          
          <div style="background-color: #f7fafc; padding: 16px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #edf2f7;">
            <p style="margin: 0;">Đây là email tự động từ hệ thống. Vui lòng không trả lời thư này.</p>
            <p style="margin: 4px 0 0 0;">&copy; 2026 Velocity Logistics. All Rights Reserved.</p>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`[MailWorker] Verification OTP email successfully sent to ${data.email}`);
  }

  private async sendCustomerWelcomeEmail(data: {
    email: string;
    username: string;
    fullName: string;
    phone?: string;
    password: string;
    customerCode: string;
  }) {
    const mailOptions = {
      from: `"Velocity Logistics" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: `[Velocity Logistics] Cấp tài khoản khách hàng mới - ${data.customerCode}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #bc0100; padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Velocity Logistics</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">Hệ thống Quản lý Vận tải & Điều phối Thông minh</p>
          </div>
          
          <div style="padding: 24px; background-color: #ffffff; color: #1a202c; line-height: 1.6;">
            <h3 style="margin-top: 0; color: #bc0100;">Xin chào anh/chị, ${data.fullName}</h3>
            <p>Hồ sơ khách hàng của anh/chị đã được thiết lập thành công trên hệ thống <strong>Velocity Logistics</strong> với mã khách hàng <strong>${data.customerCode}</strong>.</p>
            
            <p>Dưới đây là thông tin tài khoản dùng để đăng nhập vào hệ thống:</p>
            
            <div style="background-color: #f7fafc; border: 1px solid #edf2f7; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="width: 170px; font-weight: bold; color: #4a5568; padding-bottom: 8px;">Tài khoản đăng nhập:</td>
                  <td style="font-weight: bold; color: #1a202c; padding-bottom: 8px;">
                    Sử dụng <span style="color: #bc0100;">Địa chỉ Email</span> hoặc <span style="color: #bc0100;">Số điện thoại</span> dưới đây
                  </td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #4a5568; padding-bottom: 8px;">Địa chỉ email:</td>
                  <td style="font-family: monospace; font-weight: bold; color: #1a202c; padding-bottom: 8px;">${data.email}</td>
                </tr>
                ${data.phone ? `
                <tr>
                  <td style="font-weight: bold; color: #4a5568; padding-bottom: 8px;">Số điện thoại:</td>
                  <td style="font-family: monospace; font-weight: bold; color: #1a202c; padding-bottom: 8px;">${data.phone}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="font-weight: bold; color: #4a5568; padding-bottom: 8px;">Mật khẩu tạm thời:</td>
                  <td style="font-family: monospace; font-weight: bold; color: #bc0100; font-size: 15px; padding-bottom: 8px;">${data.password}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #4a5568;">Mã khách hàng:</td>
                  <td style="font-family: monospace; font-weight: bold; color: #1a202c;">${data.customerCode}</td>
                </tr>
              </table>
            </div>
            
            <p style="background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 12px; border-radius: 4px; font-size: 13px; color: #7b341e;">
              <strong>* Khuyến nghị bảo mật:</strong> Vui lòng đăng nhập và thay đổi mật khẩu ngay trong lần sử dụng đầu tiên để bảo vệ tài khoản của mình.
            </p>
          </div>
          
          <div style="background-color: #f7fafc; padding: 16px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #edf2f7;">
            <p style="margin: 0;">Đây là email tự động từ hệ thống. Vui lòng không trả lời thư này.</p>
            <p style="margin: 4px 0 0 0;">&copy; 2026 Velocity Logistics. All Rights Reserved.</p>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`[MailWorker] Welcome email successfully sent to ${data.email}`);
  }

  private async sendStaffWelcomeEmail(data: {
    email: string;
    username: string;
    fullName: string;
    phone?: string;
    password: string;
    facilityCode?: string;
    facilityName?: string;
  }) {
    const mailOptions = {
      from: `"Velocity Logistics" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: `[Velocity Logistics] Cấp tài khoản nhân viên vận hành mới - ${data.username}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #bc0100; padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Velocity Logistics</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">Hệ thống Quản lý Vận tải & Điều phối Thông minh</p>
          </div>
          
          <div style="padding: 24px; background-color: #ffffff; color: #1a202c; line-height: 1.6;">
            <h3 style="margin-top: 0; color: #bc0100;">Xin chào anh/chị, ${data.fullName}</h3>
            <p>Hồ sơ nhân viên của anh/chị đã được thiết lập thành công trên hệ thống <strong>Velocity Logistics</strong> với vai trò <strong>Nhân viên vận hành kho (STAFF)</strong>.</p>
            
            <p>Dưới đây là thông tin tài khoản dùng để đăng nhập vào trang quản trị (Velocity Dashboard):</p>
            
            <div style="background-color: #f7fafc; border: 1px solid #edf2f7; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="width: 170px; font-weight: bold; color: #4a5568; padding-bottom: 8px;">Tài khoản đăng nhập:</td>
                  <td style="font-weight: bold; color: #1a202c; padding-bottom: 8px;">
                    Sử dụng <span style="color: #bc0100;">Địa chỉ Email</span> hoặc <span style="color: #bc0100;">Số điện thoại</span> dưới đây
                  </td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #4a5568; padding-bottom: 8px;">Địa chỉ email:</td>
                  <td style="font-family: monospace; font-weight: bold; color: #1a202c; padding-bottom: 8px;">${data.email}</td>
                </tr>
                ${data.phone ? `
                <tr>
                  <td style="font-weight: bold; color: #4a5568; padding-bottom: 8px;">Số điện thoại:</td>
                  <td style="font-family: monospace; font-weight: bold; color: #1a202c; padding-bottom: 8px;">${data.phone}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="font-weight: bold; color: #4a5568; padding-bottom: 8px;">Mật khẩu tạm thời:</td>
                  <td style="font-family: monospace; font-weight: bold; color: #bc0100; font-size: 15px; padding-bottom: 8px;">${data.password}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #4a5568;">Kho / Bưu cục gán:</td>
                  <td style="font-weight: bold; color: #1a202c;">
                    ${data.facilityCode ? `${data.facilityCode} - ${data.facilityName}` : 'Chưa phân công kho bãi'}
                  </td>
                </tr>
              </table>
            </div>
            
            <p style="background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 12px; border-radius: 4px; font-size: 13px; color: #7b341e;">
              <strong>* Khuyến nghị bảo mật:</strong> Vui lòng đăng nhập và thay đổi mật khẩu ngay trong lần sử dụng đầu tiên để bảo vệ tài khoản của mình.
            </p>
          </div>
          
          <div style="background-color: #f7fafc; padding: 16px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #edf2f7;">
            <p style="margin: 0;">Đây là email tự động từ hệ thống. Vui lòng không trả lời thư này.</p>
            <p style="margin: 4px 0 0 0;">&copy; 2026 Velocity Logistics. All Rights Reserved.</p>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`[MailWorker] Welcome email successfully sent to ${data.email}`);
  }

  private async sendResetPasswordEmail(data: {
    email: string;
    username: string;
    resetToken: string;
  }) {
    const resetLink = `http://localhost:3000/reset-password?token=${data.resetToken}&email=${data.email}`;
    const mailOptions = {
      from: `"Velocity Logistics" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: `[Velocity Logistics] Yêu cầu khôi phục mật khẩu tài khoản`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #bc0100; padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Velocity Logistics</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">Khôi Phục Mật Khẩu</p>
          </div>
          
          <div style="padding: 24px; background-color: #ffffff; color: #1a202c; line-height: 1.6;">
            <h3 style="margin-top: 0; color: #bc0100;">Xin chào ${data.username},</h3>
            <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn tại <strong>Velocity Logistics</strong>. Vui lòng sử dụng mã đặt lại dưới đây:</p>
            
            <div style="background-color: #f7fafc; border: 1px solid #edf2f7; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
              <span style="font-family: monospace; font-size: 28px; font-weight: bold; color: #bc0100; letter-spacing: 4px; display: inline-block;">${data.resetToken}</span>
            </div>
            
            <p style="background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 12px; border-radius: 4px; font-size: 13px; color: #7b341e; margin-bottom: 20px;">
              <strong>* Lưu ý bảo mật:</strong> Mã khôi phục mật khẩu này sẽ hết hạn sau <strong>15 phút</strong>.
            </p>
            
            <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
          </div>
          
          <div style="background-color: #f7fafc; padding: 16px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #edf2f7;">
            <p style="margin: 0;">Đây là email tự động từ hệ thống. Vui lòng không trả lời thư này.</p>
            <p style="margin: 4px 0 0 0;">&copy; 2026 Velocity Logistics. All Rights Reserved.</p>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`[MailWorker] Reset password link email successfully sent to ${data.email}`);
  }
}

export const mailWorker = new MailWorker();
