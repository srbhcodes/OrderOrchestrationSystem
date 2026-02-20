import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { redisClient } from './config/redis';
import orderRoutes from './routes/orderRoutes';
import taskRoutes from './routes/taskRoutes';
import { startTaskWorker } from './queues/workers/taskWorker';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});
app.use('/api/orders', orderRoutes);
app.use('/api/tasks', taskRoutes);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('subscribe:orders', () => {
    socket.join('orders');
    console.log('Client subscribed to orders');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available globally
(global as any).io = io;

const PORT = process.env.PORT || 3001;

// Start server
async function startServer() {
  try {
    await connectDatabase();
    startTaskWorker();

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

