const mongoose = require("mongoose");
const QRCode = require('qrcode');
const User = require("./models/User");
require("dotenv").config();

async function generateQRForDemoAccount() {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifeqr';
    
    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log("✅ MongoDB Connected");

    // Find the demo user
    const user = await User.findOne({ email: "tarunsajikumar123@gmail.com" });
    
    if (!user) {
      console.log("❌ User not found");
      await mongoose.connection.close();
      return;
    }

    // Generate QR code with URL that points to emergency access page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const qrUrl = `${frontendUrl}/emergency_access.html?id=${user.qrCodeId}`;

    console.log("📝 Generating QR code...");
    console.log("QR Code URL:", qrUrl);
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Update user with QR code
    user.qrCode = qrCodeDataUrl;
    await user.save();

    console.log("✅ QR Code generated and saved successfully!");
    console.log("\n📊 User Details:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Name:", user.name);
    console.log("Email:", user.email);
    console.log("QR Code ID:", user.qrCodeId);
    console.log("Blood Group:", user.bloodGroup);
    console.log("QR Code Length:", qrCodeDataUrl.length, "bytes");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    await mongoose.connection.close();
    console.log("\n✅ Done! Try logging in again to see the QR code");
  } catch (error) {
    console.error("❌ Error generating QR code:", error.message);
    process.exit(1);
  }
}

generateQRForDemoAccount();
