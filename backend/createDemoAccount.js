const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require('crypto');
require("dotenv").config();

const User = require("./models/User");

async function createDemoAccount() {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifeqr';
    
    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log("✅ MongoDB Connected");

    // Check if user already exists
    const existingUser = await User.findOne({ email: "tarunsajikumar123@gmail.com" });
    if (existingUser) {
      console.log("⚠️  User already exists with this email");
      console.log("Email:", existingUser.email);
      console.log("Name:", existingUser.name);
      console.log("Role:", existingUser.role);
      await mongoose.connection.close();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("tarun123", 10);

    async function generateShortQrCodeId() {
      let id;
      let exists = null;
      do {
        id = crypto.randomBytes(4).toString('hex');
        exists = await User.findOne({ qrCodeId: id });
      } while (exists);
      return id;
    }

    const qrCodeId = await generateShortQrCodeId();

    // Create demo user
    const demoUser = await User.create({
      name: "Tarun Saji Kumar",
      email: "tarunsajikumar123@gmail.com",
      password: hashedPassword,
      role: "patient",
      age: 28,
      bloodGroup: "O+",
      healthIssues: "None",
      allergies: "None",
      medications: "None",
      phone: "+91-9876543210",
      address: "123 Main Street",
      city: "Kochi",
      state: "Kerala",
      qrCodeId: qrCodeId,
      verified: true,
      active: true,
      emergencyContact: {
        name: "Family Member",
        phone: "+91-9876543211",
        relationship: "Brother"
      }
    });

    console.log("✅ Demo account created successfully!");
    console.log("\n📝 Login Credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Email:    tarunsajikumar123@gmail.com");
    console.log("Password: tarun123");
    console.log("Role:     patient");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\nUser ID:", demoUser._id);
    console.log("QR Code ID:", qrCodeId);

    await mongoose.connection.close();
    console.log("\n✅ Done!");
  } catch (error) {
    console.error("❌ Error creating demo account:", error.message);
    if (error.name === 'MongooseServerSelectionError') {
      console.error("\n⚠️  MongoDB is not running or not accessible.");
      console.error("Please ensure MongoDB is running on localhost:27017");
      console.error("\nAlternatives:");
      console.error("1. Install MongoDB Community Edition locally");
      console.error("2. Use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas");
    }
    process.exit(1);
  }
}

createDemoAccount();
