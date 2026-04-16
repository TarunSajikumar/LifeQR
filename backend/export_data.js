#!/usr/bin/env node

// Export MongoDB data to JSON for Atlas migration
const mongoose = require('mongoose');

async function exportData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/lifeqr');
    console.log('✅ Connected to local MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const users = await User.find({});

    console.log(`📊 Found ${users.length} users in database`);

    // Write to JSON file
    const fs = require('fs');
    fs.writeFileSync('../users_backup.json', JSON.stringify(users, null, 2));

    console.log('💾 Data exported to users_backup.json');

    // Show sample data (without sensitive info)
    if (users.length > 0) {
      console.log('\n📋 Sample user data:');
      const sample = users[0];
      console.log(`Name: ${sample.name}`);
      console.log(`Email: ${sample.email}`);
      console.log(`Role: ${sample.role}`);
      console.log(`Created: ${sample.createdAt}`);
      console.log(`Has QR Code: ${!!sample.qrCode}`);
      console.log(`QR Code ID: ${sample.qrCodeId}`);
    }

  } catch (error) {
    console.error('❌ Export failed:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

exportData();