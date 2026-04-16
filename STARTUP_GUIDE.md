# LifeQR Startup Guide

## Prerequisites

Before starting the application, ensure you have the following installed:
- **Node.js** (v14 or higher) - https://nodejs.org/
- **MongoDB** (local or MongoDB Atlas) - https://www.mongodb.com/

## Step-by-Step Startup Instructions

### 1. Start MongoDB

#### Option A: Local MongoDB (Windows)
```bash
# If MongoDB is installed locally, start it:
mongod
```

#### Option B: MongoDB Atlas (Cloud - Recommended)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a cluster
4. Get your connection string
5. Update `.env` file in the backend folder with your MongoDB Atlas URI:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/lifeqr
   ```

### 2. Install Backend Dependencies

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install
```

### 3. Start the Backend Server

From the `backend` folder, run:

```bash
# Start in development mode (with auto-reload)
npm run dev

# OR start in production mode
npm start
```

You should see:
```
✅ MongoDB Connected Successfully
🚀 Server running on port 5000
📍 API endpoint: http://localhost:5000/api
```

### 4. Start the Frontend

Open your browser and go to:
```
http://localhost:5000
```

## Troubleshooting

### "Failed to fetch" Error
This typically means the backend server is not running or MongoDB is not connected.

**Solution:**
1. ✅ Ensure MongoDB is running
2. ✅ Check backend server is started (see Step 3)
3. ✅ Verify the connection string in `.env`
4. ✅ Check that port 5000 is not in use

### MongoDB Connection Error
If you see: `MongooseServerSelectionError`

**Solution:**
1. Make sure MongoDB is running (local or Atlas)
2. Verify your connection string in `.env`
3. Check your network/firewall settings
4. Test MongoDB connection: `mongosh "mongodb://localhost:27017/lifeqr"`

### Port 5000 Already in Use
```bash
# Kill the process using port 5000 (Windows PowerShell)
Get-NetTCPConnection -LocalPort 5000 | Stop-Process -Force

# Or change PORT in backend/.env to a different port (e.g., 5001)
```

## Demo Account

After successful startup, you can create accounts with any role:
- **Patient**: Full medical information
- **Doctor**: Professional credentials
- **Crew**: Emergency response team

## Testing API Directly

Check if the backend is working:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "LifeQR backend is running 🚑",
  "timestamp": "2026-04-08T..."
}
```

## Need Help?

- Check the console output for error messages
- Ensure all dependencies are installed: `npm install`
- Verify environment variables in `.env`
- Check MongoDB logs for connection issues
