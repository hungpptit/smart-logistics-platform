import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Logistics Platform API',
      version: '1.0.0',
      description: 'Hệ thống điều vận và tối ưu hóa tuyến đường giao hàng tự động - Backend API Documentation',
      contact: {
        name: 'Velocity Logistics Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Cổng API Cục bộ (Local Development)',
      },
    ],
    tags: [
      { name: 'Authentication', description: 'Các API xác thực, đăng nhập và quản lý phiên làm việc' },
      { name: 'Customers', description: 'Quản lý thông tin khách hàng và sổ địa chỉ' },
      { name: 'Facilities', description: 'Quản lý mạng lưới bưu cục, kho bãi và phân khu hàng hóa' },
      { name: 'Orders', description: 'Tạo đơn hàng, tra cứu vận đơn, tính phí cước và xử lý kiện hàng' },
      { name: 'Drivers', description: 'Quản lý hồ sơ tài xế và phân bổ phương tiện' },
      { name: 'Routing', description: 'Định tuyến tự động bằng thuật toán AI và thủ công' },
      { name: 'Settings', description: 'Các cấu hình tham số hệ thống' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập JWT token dạng: Bearer <token>',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/**/*.ts',
    './dist/routes/*.js',
    './dist/routes/**/*.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
