import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import billRoutes from './routes/bills.js';
import memoRoutes from './routes/memos.js';
import loadingSlipRoutes from './routes/loadingSlips.js';
import bankingRoutes from './routes/banking.js';
import cashbookRoutes from './routes/cashbook.js';
import partyRoutes from './routes/parties.js';
import supplierRoutes from './routes/suppliers.js';
import vehicleRoutes from './routes/vehicles.js';
import ledgerRoutes from './routes/ledgers.js';
import fuelRoutes from './routes/fuel.js';
import podRoutes from './routes/pod.js';
import partyCommissionLedgerRoutes from './routes/partyCommissionLedger.js';

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting - increased limits for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // limit each IP to 5000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for local development
    const ip = req.ip || req.connection.remoteAddress;
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.');
  }
});
app.use(limiter);

// CORS configuration for both LAN and Cloud deployment
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Get allowed origins from environment or use defaults
    const envOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
    
    const allowedOrigins = [
      // Local development
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:3000$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:3000$/,
      // Production domains
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.netlify\.app$/,
      // Environment specific origins
      ...envOrigins
    ];
    
    const isAllowed = allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') {
        return origin === pattern;
      }
      return pattern.test(origin);
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection with Atlas support
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/brc_transport';
    
    // MongoDB connection options optimized for Atlas
    const options = {
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
      bufferCommands: false // Disable mongoose buffering
    };

    await mongoose.connect(mongoURI, options);
    
    // Connection event handlers
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
      console.log(`📍 Database: ${mongoose.connection.name}`);
      console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    // Handle connection errors after initial connection
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    // More detailed error logging for Atlas connections
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('💡 Connection tips:');
      console.error('   - Check your MongoDB Atlas connection string');
      console.error('   - Verify network access settings in Atlas');
      console.error('   - Ensure your IP is whitelisted');
      console.error('   - Check username/password in connection string');
    }
    
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'BRC Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/memos', memoRoutes);
app.use('/api/loading-slips', loadingSlipRoutes);
app.use('/api/banking', bankingRoutes);
app.use('/api/cashbook', cashbookRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/ledgers', ledgerRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/pod', podRoutes);
app.use('/api/party-commission-ledger', partyCommissionLedgerRoutes);

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server - bind to 0.0.0.0 for both LAN and cloud access
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 BRC Backend server running on http://${HOST}:${PORT}`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 Production URL: ${process.env.RENDER_EXTERNAL_URL || `https://your-app.onrender.com`}`);
    console.log(`📊 Health check: ${process.env.RENDER_EXTERNAL_URL || `https://your-app.onrender.com`}/health`);
  } else {
    console.log(`🌐 Local access: http://localhost:${PORT}`);
    console.log(`🏠 LAN access: http://[YOUR_LAN_IP]:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});
