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
