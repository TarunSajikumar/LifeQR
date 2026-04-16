/**
 * Generate self-signed SSL certificates for HTTPS
 * Run: node generate-cert.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const certDir = path.join(__dirname, 'certs');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
  console.log('✅ Created certs directory');
}

const keyPath = path.join(certDir, 'server.key');
const certPath = path.join(certDir, 'server.crt');

// Check if certificate already exists
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('✅ Certificates already exist');
  process.exit(0);
}

try {
  console.log('🔧 Generating self-signed certificate...');
  
  // Generate self-signed certificate valid for 365 days
  const command = `openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=LifeQR/CN=localhost"`;
  
  execSync(command, { stdio: 'inherit' });
  
  console.log('✅ Certificate generated successfully!');
  console.log(`📄 Key: ${keyPath}`);
  console.log(`📄 Cert: ${certPath}`);
  console.log('\n🚀 You can now run: npm start');
  
} catch (error) {
  console.error('❌ Error generating certificate:', error.message);
  console.log('\n📝 Make sure OpenSSL is installed:');
  console.log('   Windows: ' + 'Check if openssl is in PATH or install from https://slproweb.com/products/Win32OpenSSL.html');
  console.log('   Mac: brew install openssl');
  console.log('   Linux: sudo apt-get install openssl');
  process.exit(1);
}
