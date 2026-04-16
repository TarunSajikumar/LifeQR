# 🚀 Connect Backend to MongoDB Atlas - Step-by-Step Guide

## 📋 What is MongoDB Atlas?

MongoDB Atlas is a cloud-hosted MongoDB database service. It allows you to:
- Store data in the cloud instead of locally
- Access from anywhere
- Scale easily
- Get automatic backups
- Use a free tier for testing

---

## 🎯 Step 1: Create MongoDB Atlas Account

### 1A. Go to MongoDB Atlas
```
https://www.mongodb.com/cloud/atlas
```

### 1B. Sign Up
1. Click **"Try Free"** or **"Sign Up"**
2. Enter your email
3. Create a password
4. Accept terms and continue
5. Verify your email address

---

## 🏗️ Step 2: Create Your First Cluster

### 2A. Create Cluster
1. After login, click **"Create"** to create a new project
2. Name your project (e.g., "LifeQR")
3. Click **"Next"**
4. Skip organization settings
5. Click **"Create Project"**

### 2B. Build Your Cluster
1. Click **"Build a Database"**
2. Choose **"M0 Free"** tier (completely free!)
3. Select your cloud provider: **AWS**
4. Select region closest to you (e.g., **us-east-1**)
5. Click **"Create"**

⏳ Cluster will be created in 1-3 minutes

---

## 🔑 Step 3: Create Database User

### 3A. Create Username & Password
1. Once cluster is ready, click **"Security"** → **"Database Access"**
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Set username: `lifeqr_user` (or your choice)
5. Set password: Create a strong password (save it!)
   - Example: `LifeQR@Secure2024`
6. Click **"Add User"**

✅ User created!

---

## 🌐 Step 4: Allow Network Access

### 4A. Configure IP Whitelist
1. Go to **"Security"** → **"Network Access"**
2. Click **"Add IP Address"**
3. Choose **"Allow Access from Anywhere"** (for development)
   - This adds: `0.0.0.0/0`
4. Click **"Confirm"**

⚠️ **For Production:** Restrict to specific IPs instead

✅ Network access configured!

---

## 📍 Step 5: Get Your Connection String

### 5A. Copy Connection String
1. Go to **Dashboard** → Click **"Connect"** on your cluster
2. Choose **"Drivers"** → Select **"Node.js"**
3. Copy the connection string:

```
mongodb+srv://lifeqr_user:<password>@cluster0.xxxxx.mongodb.net/lifeqr?retryWrites=true&w=majority
```

### 5B. Replace Placeholders
```
Original:
mongodb+srv://lifeqr_user:<password>@cluster0.xxxxx.mongodb.net/lifeqr?retryWrites=true&w=majority

Replace <password> with your actual password:
mongodb+srv://lifeqr_user:LifeQR@Secure2024@cluster0.xxxxx.mongodb.net/lifeqr?retryWrites=true&w=majority
```

⚠️ **IMPORTANT:** Replace `<password>` with the password you created!

---

## 🔧 Step 6: Update Your .env File

### 6A. Edit backend/.env
Replace the MONGO_URI line:

**BEFORE:**
```env
MONGO_URI=mongodb://localhost:27017/lifeqr
```

**AFTER:**
```env
MONGO_URI=mongodb+srv://lifeqr_user:LifeQR@Secure2024@cluster0.xxxxx.mongodb.net/lifeqr?retryWrites=true&w=majority
```

### 6B. Complete .env File

```env
# MongoDB Atlas Connection
MONGO_URI=mongodb+srv://lifeqr_user:LifeQR@Secure2024@cluster0.xxxxx.mongodb.net/lifeqr?retryWrites=true&w=majority

# JWT Secret
JWT_SECRET=demo-secret-key-tarun-demo-2026

# Server Port
PORT=5000

# Frontend URL - Using local IP for phone scanning
FRONTEND_URL=http://192.168.100.82:5000

# Node Environment
NODE_ENV=development
```

---

## 🚀 Step 7: Restart Backend

### 7A. Stop Current Backend
```powershell
# Get Node process
Get-Process node

# Kill it
Get-Process node | Stop-Process -Force
```

### 7B. Start Backend Again
```powershell
cd "c:\Users\USER\Downloads\lifeqr-complete\lifeqr-complete\backend"
npm start
```

### 7C. Check Connection
You should see:
```
✅ MongoDB Connected Successfully
🚀 Server running on port 5000
```

---

## ✅ Verification Steps

### Test if Connected to MongoDB Atlas

#### Test 1: Check Health Endpoint
```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "message": "LifeQR backend is running 🚑",
  "timestamp": "2026-04-08T10:30:00.000Z"
}
```

#### Test 2: Create New User
```powershell
$body = @{
  name = "Atlas Test User"
  email = "atlas@test.com"
  password = "testpass123"
  role = "patient"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/auth/register" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body -UseBasicParsing
```

#### Test 3: View in MongoDB Atlas
1. Go to **MongoDB Atlas Dashboard**
2. Click your cluster
3. Click **"Collections"**
4. Select **"lifeqr"** database → **"users"** collection
5. Your new user should appear!

---

## 🎯 Connection String Components Explained

```
mongodb+srv://lifeqr_user:LifeQR@Secure2024@cluster0.xxxxx.mongodb.net/lifeqr
│              │            │                    │        │          │
│              │            │                    │        │          └─ Database name
│              │            │                    │        └─ Domain name
│              │            │                    └─ Cluster identifier
│              │            └─ Password
│              └─ Username
└─ Connection protocol (srv = service record)
```

---

## 📊 Common Connection String Issues

### ❌ Error: "Authentication failed"
**Solution:** Check username/password in connection string

### ❌ Error: "SSL handshake failed"
**Solution:** Download MongoDB certificates:
```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority&authSource=admin
```

### ❌ Error: "No server selected"
**Solution:** 
1. Check IP whitelist (must include your current IP)
2. Wait 1-2 minutes for changes to propagate
3. Check network connection

### ❌ Error: "Cannot connect to cluster"
**Solution:**
1. Verify connection string is correct
2. Check username/password
3. Ensure IP is whitelisted
4. Check internet connection

---

## 🔒 Security Best Practices

### 1. Don't Hardcode Passwords
```javascript
// ❌ WRONG
const mongoURI = "mongodb+srv://user:password@...";

// ✅ RIGHT
const mongoURI = process.env.MONGO_URI;
```

### 2. Use Strong Passwords
```
❌ Bad:    123456, password, lifeqr
✅ Good:   LifeQR@Secure2024!xyz789
```

### 3. Restrict IP in Production
- Development: Allow `0.0.0.0/0`
- Production: Only allow your server's IP

### 4. Keep .env Secret
```bash
# Add to .gitignore (never commit)
*.env
.env.local
.env.*.local
```

### 5. Use Read-Only Users (Optional)
For emergency responders, create a read-only user

---

## 📱 Production Deployment Considerations

### When deploying to production (e.g., Render, Heroku):

1. Create a new database user with restricted permissions
2. Update MongoDB Atlas IP whitelist with server IP
3. Set NODE_ENV to "production"
4. Use strong JWT_SECRET
5. Enable MongoDB Atlas encryption
6. Set up automated backups

---

## 🔄 Local to Atlas + Local Fallback

If you want to support both local and Atlas:

```javascript
// backend/server.js
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifeqr';

// This tries MongoDB Atlas first, falls back to local if MONGO_URI not set
```

---

## 📝 Quick Reference

| Step | Action | Result |
|------|--------|--------|
| 1 | Sign up on MongoDB Atlas | Account created |
| 2 | Create M0 free cluster | Cluster ready (3 min) |
| 3 | Create database user | Username/password ready |
| 4 | Whitelist IP address | Network access enabled |
| 5 | Get connection string | String copied |
| 6 | Update .env file | MONGO_URI configured |
| 7 | Restart backend | Connected to Atlas |
| 8 | Test endpoints | Verify working |

---

## ✨ READY TO GO!

Your backend is now connected to MongoDB Atlas! 🎉

### Next Steps:
1. ✅ Backend running with MongoDB Atlas
2. ✅ Access at `http://localhost:5000`
3. ✅ All data stored in cloud
4. ✅ Can access from anywhere

**Your LifeQR app now has a cloud database!** ☁️

---

## 💡 Useful MongoDB Atlas Links

- **Dashboard:** https://cloud.mongodb.com
- **Documentation:** https://docs.mongodb.com/atlas/
- **Pricing:** https://www.mongodb.com/pricing
- **Free Tier Limits:** 512 MB storage, 1 million reads/writes/month
