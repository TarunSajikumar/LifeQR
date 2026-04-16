#!/usr/bin/env node

// Import data to MongoDB Atlas
const mongoose = require('mongoose');
const fs = require('fs');

async function importData() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect('mongodb+srv://lifeqr:lifeqr@cluster.wkoe6nz.mongodb.net/lifeqr?retryWrites=true&w=majority');

    console.log('✅ Connected to MongoDB Atlas');

    // Read backup file
    const data = fs.readFileSync('../users_backup.json', 'utf8');
    const users = JSON.parse(data);

    console.log(`📊 Found ${users.length} users to import`);

    // Create User model
    const userSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true },
      password: String,
      role: String,
      age: Number,
      bloodGroup: String,
      healthIssues: String,
      allergies: String,
      medications: String,
      emergencyContact: {
        name: String,
        phone: String,
        relationship: String
      },
      qrCode: String,
      qrCodeId: String,
      lastLocation: {
        lat: Number,
        lng: Number,
        updatedAt: Date
      },
      specialization: String,
      licenseNumber: String,
      hospital: String,
      vehicleNumber: String,
      crewType: String,
      station: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      verified: { type: Boolean, default: false },
      active: { type: Boolean, default: true }
    }, { timestamps: true });

    const User = mongoose.model('User', userSchema);

    // Clear existing data (optional - comment out if you want to keep existing Atlas data)
    console.log('🧹 Clearing existing users collection...');
    await User.deleteMany({});

    // Import users
    console.log('📤 Importing users...');
    const importedUsers = await User.insertMany(users);

    console.log(`✅ Successfully imported ${importedUsers.length} users to Atlas!`);

    // Verify import
    const count = await User.countDocuments();
    console.log(`📊 Total users in Atlas: ${count}`);

    // Show sample
    const sampleUser = await User.findOne({}, 'name email role createdAt');
    if (sampleUser) {
      console.log('\n📋 Sample imported user:');
      console.log(`Name: ${sampleUser.name}`);
      console.log(`Email: ${sampleUser.email}`);
      console.log(`Role: ${sampleUser.role}`);
      console.log(`Created: ${sampleUser.createdAt}`);
    }

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    if (error.code === 11000) {
      console.log('⚠️  Duplicate key error - some users may already exist');
    }
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB Atlas');
  }
}

importData();