# 🚀 LifeQR Deployment Guide

This guide will help you deploy LifeQR to make it live and accessible to everyone.

## 📋 Quick Start Options

Choose one of these deployment methods:

1. **Railway** (Recommended - Easiest) ⭐
2. **Render** (Free tier available)
3. **Vercel + Railway** (Frontend + Backend separation)
4. **Docker + Any Cloud** (Most flexible)

---

## Option 1: Railway (Recommended) ⭐

Railway provides easy deployment with automatic HTTPS and database hosting.

### Step 1: Setup MongoDB

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (Free M0 tier)
4. Create a database user:
   - Go to "Database Access"
   - Click "Add New Database User"
   - Username: `lifeqr`
   - Password: Generate a secure password
5. Whitelist all IPs:
   - Go to "Network Access"
   - Click "Add IP Address"
   - Enter `0.0.0.0/0` (allows all IPs)
6. Get your connection string:
   - Go to "Clusters" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password
   - Example: `mongodb+srv://lifeqr:yourpassword@cluster0.xxxxx.mongodb.net/lifeqr?retryWrites=true&w=majority`

### Step 2: Deploy to Railway

1. **Create Railway Account**
   - Go to [Railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Connect your repository

3. **Configure Environment Variables**
   Click on your service → Variables → Add these:
   ```
   MONGO_URI=mongodb+srv://lifeqr:yourpassword@cluster0.xxxxx.mongodb.net/lifeqr
   JWT_SECRET=your-random-secret-key-at-least-32-characters-long
   NODE_ENV=production
   PORT=5000
   ```
   
   To generate a secure JWT_SECRET, run in terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Configure Build Settings**
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && node server.js`

5. **Deploy**
   - Railway will automatically deploy
   - You'll get a URL like: `https://lifeqr-production.up.railway.app`

6. **Update FRONTEND_URL**
   - Add another environment variable:
   - `FRONTEND_URL=https://your-app-url.railway.app`
   - Redeploy

### Step 3: Test Your Deployment

1. Visit your Railway URL
2. Click "Sign Up"
3. Create a patient account
4. Check if QR code is generated
5. Test emergency access page

**✅ You're Live!** Share your URL with others.

---

## Option 2: Render

Render offers free tier hosting with automatic SSL.

### Step 1: Setup MongoDB Atlas
(Follow the same MongoDB setup from Option 1)

### Step 2: Deploy to Render

1. **Create Render Account**
   - Go to [Render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure Service**
   - Name: `lifeqr`
   - Environment: `Node`
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && node server.js`

4. **Environment Variables**
   Add these in the Environment section:
   ```
   MONGO_URI=your-mongodb-atlas-connection-string
   JWT_SECRET=your-random-secret-key
   NODE_ENV=production
   PORT=5000
   FRONTEND_URL=https://lifeqr.onrender.com
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - You'll get a URL like: `https://lifeqr.onrender.com`

**Note:** Free tier may sleep after inactivity. First request might take 30 seconds to wake up.

---

## Option 3: Vercel (Frontend) + Railway (Backend)

Best for separating frontend and backend deployments.

### Frontend (Vercel):

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy Frontend**
   ```bash
   cd frontend
   vercel
   ```

3. **Follow prompts**
   - Link to Vercel account
   - Set up project
   - Deploy

4. **Get your Vercel URL**
   Example: `https://lifeqr.vercel.app`

### Backend (Railway):

1. Follow Railway steps from Option 1
2. Set `FRONTEND_URL` to your Vercel URL
3. Update frontend API calls to point to Railway backend URL

**Update API_URL in Frontend:**
In each HTML file, change:
```javascript
const API_URL = 'https://your-railway-backend.up.railway.app/api';
```

---

## Option 4: Docker Deployment

### Build Docker Image

```bash
docker build -t lifeqr .
```

### Run Locally

```bash
docker run -p 5000:5000 \
  -e MONGO_URI="your-mongodb-uri" \
  -e JWT_SECRET="your-jwt-secret" \
  -e FRONTEND_URL="http://localhost:5000" \
  lifeqr
```

### Deploy to Any Cloud

**AWS ECS:**
1. Push to Amazon ECR
2. Create ECS task definition
3. Deploy to ECS cluster

**Google Cloud Run:**
```bash
gcloud run deploy lifeqr \
  --image gcr.io/your-project/lifeqr \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**Azure Container Instances:**
```bash
az container create \
  --resource-group lifeqr-rg \
  --name lifeqr \
  --image your-registry/lifeqr \
  --dns-name-label lifeqr \
  --ports 5000
```

---

## 🔒 Security Checklist

Before going live, ensure:

- [ ] Strong JWT_SECRET (at least 32 characters)
- [ ] MongoDB Atlas IP whitelist configured
- [ ] HTTPS enabled (automatic on Railway/Render/Vercel)
- [ ] Environment variables set (never commit .env)
- [ ] CORS properly configured
- [ ] MongoDB user has strong password
- [ ] Changed default passwords/secrets

---

## 🎯 Post-Deployment Steps

### 1. Custom Domain (Optional)

**Railway:**
- Settings → Domains → Add Custom Domain
- Add CNAME record: `CNAME your-domain.com → your-app.up.railway.app`

**Render:**
- Settings → Custom Domain → Add Domain
- Configure DNS records as shown

**Vercel:**
- Settings → Domains → Add Domain
- Update DNS settings

### 2. Monitor Your App

**Railway:**
- View logs in dashboard
- Set up health checks
- Monitor usage

**Render:**
- Check logs in dashboard
- Set up notifications
- Monitor free tier limits

### 3. Backup Database

MongoDB Atlas:
- Set up automated backups
- Enable point-in-time recovery
- Export data regularly

---

## 🐛 Troubleshooting

### App not loading?
- Check environment variables are set
- Verify MongoDB connection string
- Check logs for errors
- Ensure PORT is set to 5000

### QR Code not generating?
- Verify all patient fields are filled
- Check backend logs
- Ensure frontend can reach backend API

### Database connection failed?
- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Ensure database user exists
- Test connection locally first

### CORS errors?
- Set FRONTEND_URL correctly
- Verify CORS configuration in server.js
- Check browser console for specific errors

---

## 📊 Monitoring & Maintenance

### Check App Health
Visit: `https://your-app-url.com/api/health`

Should return:
```json
{
  "status": "healthy",
  "message": "LifeQR backend is running 🚑",
  "timestamp": "2025-01-XX..."
}
```

### View Logs

**Railway:**
```bash
railway logs
```

**Render:**
View in dashboard under "Logs" tab

### Update Deployment

**Git Push:**
```bash
git add .
git commit -m "Update features"
git push origin main
```

Railway/Render will auto-deploy on push.

---

## 💰 Cost Estimate

### Free Tier:
- **MongoDB Atlas:** Free M0 cluster (512MB)
- **Railway:** $5/month credit (may cover small usage)
- **Render:** Free tier with limitations
- **Vercel:** Free for frontend

### Paid Tier (Recommended for Production):
- **MongoDB Atlas:** ~$9/month (M10 cluster)
- **Railway:** ~$5-20/month based on usage
- **Render:** ~$7/month (Starter plan)
- **Domain:** ~$10-15/year

**Total:** ~$20-40/month for production-ready setup

---

## 🎉 Success!

Your LifeQR app is now live and accessible to everyone!

Share your URL:
- Landing Page: `https://your-app-url.com`
- Login: `https://your-app-url.com/lifeqr_login.html`
- Signup: `https://your-app-url.com/lifeqr_signup.html`

---

## 📞 Need Help?

- Check the main README.md
- Review error logs
- Test locally first
- Verify all environment variables
- Ensure MongoDB is accessible

Good luck! 🚀
