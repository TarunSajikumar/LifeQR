const express = require("express");
const mongoose = require("mongoose");
const dns = require("dns");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
require("dotenv").config();

const app = express();

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  // HTTP origins
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://192.168.100.82:5000',
  'http://10.226.208.114:5000',
  // HTTPS origins (for camera access)
  'https://localhost:5000',
  'https://127.0.0.1:5000',
  'https://localhost:5500',
  'https://127.0.0.1:5500',
  'https://192.168.100.82:5000',
  'https://10.226.208.114:5000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      // Allow requests from non-browser clients or file:// local pages
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS policy violation: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patient");

app.use("/api/auth", authRoutes);
app.use("/api/patient", patientRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy",
    message: "LifeQR backend is running 🚑",
    timestamp: new Date().toISOString()
  });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Check if MongoDB URI is provided
    if (!process.env.MONGO_URI) {
      console.warn('⚠️  MONGO_URI not found in .env file');
      console.log('📝 Using default MongoDB connection string for development');
      console.log('💡 For production, please set MONGO_URI in your .env file');
    }

    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifeqr';

    if (mongoURI.startsWith('mongodb+srv://')) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      console.log('🔎 Using public DNS servers for Atlas SRV resolution');
    }

    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    
    console.log("✅ MongoDB Connected Successfully");

    // Start server - listen on all network interfaces
    const phoneIp = process.env.FRONTEND_URL?.split('://')[1]?.split(':')[0] || '10.226.208.114';
    
    // Check if HTTPS certificates exist
    const certPath = path.join(__dirname, 'certs', 'server.crt');
    const keyPath = path.join(__dirname, 'certs', 'server.key');
    const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);
    
    let server;
    
    if (useHttps) {
      // Use HTTPS for camera access
      const options = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
      };
      server = https.createServer(options, app);
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 HTTPS Server running on port ${PORT}`);
        console.log(`\n🔒 SECURE CONNECTION (HTTPS)`);
        console.log(`📍 Localhost: https://localhost:${PORT}`);
        console.log(`📱 Phone IP: https://${phoneIp}:${PORT}`);
        console.log(`🌐 Emergency Access (HTTPS): https://${phoneIp}:${PORT}/emergency_access.html`);
        console.log(`\n📱 Camera access is now enabled on all devices!`);
        console.log(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`\n⚠️  Note: You may see a security warning on first visit - this is normal for self-signed certificates. Click "Continue" or "Accept Risk".`);
      });
    } else {
      // Fall back to HTTP (camera won't work on mobile)
      server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 HTTP Server running on port ${PORT}`);
        console.log(`\n⚠️  WARNING: Using HTTP - Camera access will NOT work on mobile devices`);
        console.log(`📍 Localhost: http://localhost:${PORT}`);
        console.log(`📱 Phone IP: http://${phoneIp}:${PORT}`);
        console.log(`\n✅ TO FIX CAMERA ACCESS:`);
        console.log(`   1. Stop this server (Ctrl+C)`);
        console.log(`   2. Run: node generate-cert.js`);
        console.log(`   3. Run: npm start (again)`);
        console.log(`4. Access via HTTPS: https://${phoneIp}:${PORT}/emergency_access.html`);
        console.log(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    }

    server.on('error', (listenErr) => {
      if (listenErr.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please stop the process using it or set PORT to a free port.`);
      } else {
        console.error('❌ Server listen failed:', listenErr);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error("❌ Server failed to start:", err.message);
    console.log("\n⚠️  Attempting to start server without MongoDB connection...");
    
    // Start server anyway for frontend access
    const phoneIp = process.env.FRONTEND_URL?.split('://')[1]?.split(':')[0] || '10.226.208.114';
    
    // Check if HTTPS certificates exist
    const certPath = path.join(__dirname, 'certs', 'server.crt');
    const keyPath = path.join(__dirname, 'certs', 'server.key');
    const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);
    
    let server;
    
    if (useHttps) {
      const options = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
      };
      server = https.createServer(options, app);
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`\n⚠️  SERVER RUNNING WITHOUT DATABASE (HTTPS)`);
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📱 Phone HTTPS: https://${phoneIp}:${PORT}/emergency_access.html`);
        console.log(`\n💡 Note: Database features won\'t work until MongoDB is connected`);
      });
    } else {
      server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n⚠️  SERVER RUNNING WITHOUT DATABASE (HTTP)`);
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📍 Localhost: http://localhost:${PORT}`);
        console.log(`📱 Phone IP: http://${phoneIp}:${PORT}`);
        console.log(`\n💡 Note: Database features won\'t work until MongoDB is connected`);
        console.log(`🔒 For camera access on phone, generate HTTPS certificates:`);
        console.log(`   node generate-cert.js && npm start`);
      });
    }

    server.on('error', (listenErr) => {
      if (listenErr.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please stop the process using it or set PORT to a free port.`);
      } else {
        console.error('❌ Server listen failed:', listenErr);
      }
      process.exit(1);
    });
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
