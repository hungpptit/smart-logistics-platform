import 'reflect-metadata'; // Must be imported at the very top for class-transformer decorators
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { connectRedis } from './config/redis';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { mailWorker } from './workers/mail.worker';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount central routing system
app.use('/api/v1', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', service: 'Smart Logistics API' });
});

// Real-time Gateway connection
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware (must be registered last)
app.use(errorMiddleware);

const startServer = async () => {
  await connectRedis();
  await mailWorker.start();
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`📚 API Swagger Docs available at http://localhost:${PORT}/api-docs`);
  });
};

startServer();
