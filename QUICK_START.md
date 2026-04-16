# 🚀 LifeQR Quick Start Guide

Get your LifeQR system up and running in 5 minutes!

## 🎯 What You're Building

A complete emergency medical QR code system with:
- Patient registration and profile management
- QR code generation for medical information
- Emergency responder access to patient data
- Secure authentication and data encryption

## 📋 Prerequisites

- **Node.js** (v16+) - [Download here](https://nodejs.org/)
- **MongoDB** - Choose ONE:
  - Local MongoDB - [Download here](https://www.mongodb.com/try/download/community)
  - MongoDB Atlas (Cloud, Free) - [Sign up here](https://www.mongodb.com/cloud/atlas)

## ⚡ Quick Start (3 Steps)

### Step 1: Setup MongoDB

**Option A: Use MongoDB Atlas (Recommended - No installation needed)**

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster (Free M0 tier)
4. Create database user (Database Access → Add User)
5. Whitelist IP (Network Access → Add `0.0.0.0/0`)
6. Get connection string:
   - Clusters → Connect → Connect Application
   - Copy: `mongodb+srv://username:password@cluster.mongodb.net/lifeqr`

**Option B: Use Local MongoDB**

1. Install MongoDB Community Edition
2. Start MongoDB:
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Windows
   net start MongoDB
   
   # Linux
   sudo systemctl start mongod
   ```

### Step 2: Configure Backend

1. Open terminal in project folder
2. Navigate to backend:
   ```bash
   cd backend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create `.env` file in `backend` folder:
   ```env
   # For MongoDB Atlas:
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/lifeqr
   
   # OR for Local MongoDB:
   # MONGO_URI=mongodb://localhost:27017/lifeqr
   
   JWT_SECRET=change-this-to-random-secret-key-32-chars
   PORT=5000
   FRONTEND_URL=http://localhost:5000
   NODE_ENV=development
   ```

   **Generate secure JWT_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### Step 3: Start the Application

```bash
npm start
```

**That's it!** 🎉

Open your browser:
- **Landing Page:** http://localhost:5000
- **Login:** http://localhost:5000/lifeqr_login.html
- **Signup:** http://localhost:5000/lifeqr_signup.html

## 🧪 Test the System

### Create a Patient Account

1. Go to http://localhost:5000/lifeqr_signup.html
2. Select "Patient" role
3. Fill in details:
   - Name: John Doe
   - Email: john@example.com
   - Password: password123
   - Age: 30
   - Blood Group: O+
   - Allergies: Penicillin
   - Emergency Contact: Jane Doe, +1234567890
4. Click "Create Account"

### View Your QR Code

1. You'll be redirected to patient dashboard
2. See your generated QR code
3. Download or print it

### Test Emergency Access

1. Open new tab: http://localhost:5000/emergency_access.html
2. Copy your QR Code ID from dashboard
3. Enter it in emergency access page
4. View your medical information

## 🌐 Deploy to Production

Ready to go live? Follow our [Deployment Guide](DEPLOYMENT_GUIDE.md)

**Recommended:** Railway (Easiest)
1. Push code to GitHub
2. Connect to Railway
3. Add MongoDB Atlas connection
4. Deploy!

## 📱 Features Walkthrough

### For Patients:
- ✅ Register with medical information
- ✅ Get unique QR code
- ✅ Download/Print QR code
- ✅ Update medical information anytime
- ✅ Add emergency contacts

### For Emergency Responders:
- ✅ Scan QR code or enter ID
- ✅ Instant access to critical info
- ✅ See blood type, allergies, medications
- ✅ Call emergency contact directly
- ✅ Print patient information

### Security:
- ✅ Encrypted passwords (bcrypt)
- ✅ JWT authentication
- ✅ Secure API endpoints
- ✅ Access logging

## 🐛 Troubleshooting

### "MongoDB connection failed"
- Check if MongoDB is running: `mongosh` or check Atlas
- Verify MONGO_URI in .env file
- For Atlas: Check IP whitelist (0.0.0.0/0)

### "Port 5000 already in use"
- Change PORT in .env to 3000 or 8000
- Or stop the process using port 5000

### QR Code not showing
- Check browser console for errors
- Verify backend is running
- Check all required patient fields are filled

### Login not working
- Clear browser cache/localStorage
- Check backend logs for errors
- Verify JWT_SECRET is set

## 📊 Project Structure

```
lifeqr-complete/
├── backend/                  # Server-side code
│   ├── models/User.js       # Database schema
│   ├── routes/              # API endpoints
│   ├── server.js            # Main server file
│   └── .env                 # Configuration (create this)
│
└── frontend/                # Client-side code
    ├── index.html           # Landing page
    ├── lifeqr_login.html    # Login page
    ├── lifeqr_signup.html   # Registration
    ├── patient_dashboard.html # Patient dashboard
    └── emergency_access.html  # Emergency access
```

## 🔧 Development Mode

For auto-reload during development:

```bash
npm install -g nodemon
cd backend
nodemon server.js
```

## 📚 API Endpoints

```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login
GET    /api/auth/verify        - Verify token
GET    /api/patient/me         - Get user profile
PUT    /api/patient/update     - Update profile
GET    /api/patient/profile/:id - Get patient by QR ID
POST   /api/patient/regenerate-qr - New QR code
```

## 🎨 Customize

### Change Colors
Edit the gradient in HTML files:
```css
.hero-gradient {
  background: linear-gradient(135deg, #6818f4 0%, #4f3bb3 100%);
}
```

### Add Features
1. Add routes in `backend/routes/`
2. Add models in `backend/models/`
3. Create frontend pages
4. Update API calls

## 📖 Next Steps

1. ✅ Get it running locally
2. ✅ Test all features
3. ✅ Customize branding
4. ✅ Deploy to production
5. ✅ Share with users!

## 🆘 Get Help

- Check [README.md](README.md) for detailed docs
- Review [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for deployment
- Check backend logs for errors
- Verify all environment variables

## 🎉 You're Ready!

Your LifeQR system is now running. Start creating accounts and testing the emergency access features!

**Pro Tip:** Keep your QR code on your phone's lock screen, wallet, or ID card for quick emergency access.

---

Made with ❤️ for saving lives, one scan at a time.
