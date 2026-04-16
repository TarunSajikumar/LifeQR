# 📤 Export Local MongoDB Data to JSON

Run these commands in your terminal to export your existing data:

## Step 1: Export Users Collection
```bash
# Export users to JSON file
mongoexport --db lifeqr --collection users --out users_backup.json --jsonArray

# OR if mongoexport is not available, use mongosh:
mongosh --eval "db = connect('mongodb://localhost:27017/lifeqr'); printjson(db.users.find().toArray())" > users_backup.json
```

## Step 2: Verify Export
```bash
# Check if file was created and has data
type users_backup.json | head -20
```

## Step 3: Count Records
```bash
# Count how many users you have
mongosh --eval "use lifeqr; db.users.countDocuments()"
```

---

# ☁️ Import to MongoDB Atlas

## Step 1: Login to Your Atlas Account
- **Email:** tarunsajikumar123@gmail.com
- **URL:** https://cloud.mongodb.com

## Step 2: Create/Select Cluster
- If you don't have a cluster, create one (M0 Free tier)
- If you have one, select it

## Step 3: Get Connection String
- Click "Connect" on your cluster
- Choose "Drivers" → Node.js
- Copy the connection string

## Step 4: Update Your .env File
Replace the MONGO_URI in `backend/.env`:

```env
# Replace this:
MONGO_URI=mongodb://localhost:27017/lifeqr

# With your Atlas connection string:
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/lifeqr?retryWrites=true&w=majority
```

## Step 5: Import Data to Atlas
```bash
# Import users to Atlas (replace with your connection string)
mongoimport --uri "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/lifeqr" --collection users --file users_backup.json --jsonArray
```

## Step 6: Verify Import
```bash
# Connect to Atlas and check
mongosh "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/lifeqr" --eval "db.users.countDocuments()"
```

---

# 🔄 Switch Backend to Atlas

## Step 1: Stop Current Backend
```powershell
Get-Process node | Stop-Process -Force
```

## Step 2: Start Backend with Atlas
```powershell
cd backend
npm start
```

## Step 3: Test Connection
```bash
curl http://localhost:5000/api/health
```

---

# ✅ Verification

## Test Login with Existing Account
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@test.com","password":"testpass123"}'
```

## Check in Atlas Dashboard
1. Go to MongoDB Atlas
2. Click your cluster → Collections
3. Select "lifeqr" database → "users" collection
4. You should see your imported users!

---

# 🛡️ Backup Your Data First!

**IMPORTANT:** Before switching to Atlas, backup your local data:

```bash
# Create backup directory
mkdir mongodb_backup

# Export all collections
mongoexport --db lifeqr --collection users --out mongodb_backup/users.json --jsonArray

# Compress backup
# (optional) zip mongodb_backup.zip mongodb_backup/
```

---

# 🚨 Emergency Rollback

If something goes wrong, you can always switch back to local MongoDB:

```env
# In backend/.env
MONGO_URI=mongodb://localhost:27017/lifeqr
```

Then restart the backend.

---

# 📞 Need Help?

If you encounter issues:
1. Check your Atlas connection string
2. Verify username/password
3. Ensure IP whitelist includes your IP
4. Check Atlas dashboard for error messages
5. Use the backup to restore if needed