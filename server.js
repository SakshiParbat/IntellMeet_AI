// server.js - IntellMeet Backend Entry Point
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const meetingRoutes = require('./routes/meetings');
const chatRoutes = require('./routes/chat');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const aiRoutes = require('./routes/ai');
const analyticsRoutes = require('./routes/analytics');

const { socketHandler } = require('./socket/socketHandler');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// ─── SOCKET.IO SETUP ───
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// ─── MIDDLEWARE ───
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiting - Brute force se bachao
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Bahut zyada requests! Thodi der baad try karein.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Login attempts limit exceeded. 15 minute baad try karein.' }
});
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── DATABASE CONNECTION ───
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/intellmeet')
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ─── ROUTES ───
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'IntellMeet server chal raha hai! 🚀',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ─── SOCKET HANDLER ───
socketHandler(io);

// ─── ERROR HANDLER ───
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 IntellMeet Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for real-time connections`);
  console.log(`🤖 AI features enabled`);
});

module.exports = { app, server, io };
