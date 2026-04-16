# 🚑 LifeQR - Emergency Medical QR Code System

## 📋 Overview

LifeQR is a comprehensive emergency medical information system that provides instant access to critical patient data through QR codes. The system enables patients to store their medical information securely and allows emergency responders to access it instantly by scanning a QR code.

## ✨ Features

### For Patients
- 🏥 **Medical Profile Management** - Store allergies, medications, blood type, and health conditions
- 📱 **QR Code Generation** - Unique, scannable QR codes with medical data
- 👤 **Emergency Contacts** - Quick access to emergency contact information
- 🔒 **Secure & Private** - Encrypted data storage and access
- 📥 **Download & Print** - Save or print your QR code for physical access

### For Emergency Responders
- ⚡ **Instant Access** - Scan QR code or enter ID for immediate medical information
- 🩸 **Critical Info Display** - Blood type, allergies, and emergency contacts highlighted
- 📞 **Direct Contact** - Call emergency contacts with one click
- 🖨️ **Print Records** - Print patient information for record keeping

### For Medical Professionals
- 👨‍⚕️ **Doctor Dashboard** - Manage professional profile and credentials
- 🚑 **Crew Dashboard** - Emergency crew access and management

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **QRCode** library for QR generation
- **CORS** enabled for cross-origin requests

### Frontend
- **HTML5** with responsive design
- **Tailwind CSS** for styling
- **Vanilla JavaScript** for interactivity
- **Material Icons** for UI elements
- **Custom design system** (The Ethereal Guardian)

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Local Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd lifeqr-complete
```

2. **Backend Setup**
```bash
cd backend
npm install
```

3. **Configure Environment Variables**
Create a `.env` file in the backend directory:
```env
MONGO_URI=mongodb://localhost:27017/lifeqr
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/lifeqr

JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=5000
FRONTEND_URL=http://localhost:5000
NODE_ENV=development
```

4. **Start Backend Server**
```bash
npm start
# OR for development with auto-reload:
npm run dev
```

The server will start on `http://localhost:5000`

5. **Access the Application**
Open your browser and navigate to:
- Landing Page: `http://localhost:5000`
- Login: `http://localhost:5000/lifeqr_login.html`
- Signup: `http://localhost:5000/lifeqr_signup.html`

## 🚀 Deployment

### Deploy to Railway (Backend + Frontend)

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
```

2. **Login to Railway**
```bash
railway login
```

3. **Initialize Project**
```bash
cd backend
railway init
```

4. **Add MongoDB**
- Go to Railway Dashboard
- Add MongoDB plugin to your project
- Copy the `MONGO_URI` connection string

5. **Set Environment Variables**
```bash
railway variables set JWT_SECRET=your-secret-key
railway variables set FRONTEND_URL=https://your-app.railway.app
railway variables set NODE_ENV=production
```

6. **Deploy**
```bash
railway up
```

### Deploy to Render

1. **Create New Web Service** on Render Dashboard

2. **Connect Repository**

3. **Configure Build Settings**
- Build Command: `cd backend && npm install`
- Start Command: `cd backend && npm start`

4. **Set Environment Variables** in Render Dashboard:
- `MONGO_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- `NODE_ENV=production`

5. **Deploy**

### Deploy to Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel):**
```bash
cd frontend
vercel
```

**Backend (Railway):**
Follow Railway deployment steps above

Update `FRONTEND_URL` in backend to your Vercel URL.

### MongoDB Atlas Setup

1. **Create Account** at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

2. **Create Cluster**
- Choose free tier (M0)
- Select region closest to your users

3. **Create Database User**
- Database Access → Add New Database User
- Set username and password

4. **Whitelist IP**
- Network Access → Add IP Address
- Add `0.0.0.0/0` for all IPs (or specific IPs)

5. **Get Connection String**
- Clusters → Connect → Connect your application
- Copy the connection string
- Replace `<password>` with your database user password

6. **Update Environment Variables**
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/lifeqr?retryWrites=true&w=majority
```

## 📱 Usage

### Patient Workflow
1. Sign up as a patient
2. Fill in medical information (allergies, medications, blood type)
3. Add emergency contact details
4. Download or print your QR code
5. Keep QR code accessible (phone, wallet, ID card)

### Emergency Responder Workflow
1. Scan patient's QR code OR
2. Go to Emergency Access page
3. Enter QR Code ID
4. View critical medical information
5. Contact emergency contact if needed

### Doctor/Crew Workflow
1. Sign up with professional credentials
2. Access dashboard for patient scanning
3. View and manage professional profile

## 🔐 Security Features

- **Password Hashing** - bcrypt with salt rounds
- **JWT Authentication** - Secure token-based auth
- **HTTPS Ready** - SSL/TLS support
- **CORS Protection** - Configured origins
- **Input Validation** - Server-side validation
- **Access Logging** - Emergency access tracking

## 🗂️ Project Structure

```
lifeqr-complete/
├── backend/
│   ├── models/
│   │   └── User.js           # User schema with patient/doctor/crew fields
│   ├── routes/
│   │   ├── auth.js           # Authentication routes (login, register)
│   │   └── patient.js        # Patient profile and QR management
│   ├── server.js             # Express server setup
│   ├── package.json          # Backend dependencies
│   └── .env.example          # Environment variables template
│
└── frontend/
    ├── index.html            # Landing page
    ├── lifeqr_login.html     # Login page
    ├── lifeqr_signup.html    # Registration page
    ├── patient_dashboard.html # Patient dashboard
    ├── emergency_access.html  # Emergency responder access
    ├── LifeQR.png            # Logo
    └── lifeqr_transparent.png # Transparent logo
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Patient
- `GET /api/patient/profile/:qrCodeId` - Get patient profile by QR ID (public)
- `GET /api/patient/me` - Get authenticated user profile
- `PUT /api/patient/update` - Update patient profile
- `POST /api/patient/regenerate-qr` - Regenerate QR code

### Health Check
- `GET /api/health` - Server health status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support, please contact:
- Email: support@lifeqr.com
- Documentation: [Link to docs]
- Issues: [GitHub Issues]

## 🎨 Design System

This project uses "The Ethereal Guardian" design system with:
- **Soft Minimalism** philosophy
- **Glassmorphism** effects
- **Purple gradient** primary colors (#6818f4 to #5c4dbe)
- **Manrope** for headlines
- **Inter** for body text

## 🔮 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] SMS notifications to emergency contacts
- [ ] Medical history timeline
- [ ] Integration with hospital systems
- [ ] Wearable device support
- [ ] Offline QR code access
- [ ] Family account linking

## ⚠️ Disclaimer

LifeQR is designed to assist in emergency situations but should not replace professional medical advice. Always consult healthcare professionals for medical decisions.

---

Made with ❤️ for saving lives, one scan at a time.
