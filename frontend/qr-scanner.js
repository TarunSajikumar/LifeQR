/**
 * QR Code Scanner Module using Camera and jsQR library
 * Provides camera access and QR code detection
 */

class QRScanner {
  constructor(options = {}) {
    this.onSuccess = options.onSuccess || (() => {});
    this.onError = options.onError || (() => {});
    this.videoStream = null;
    this.isScanning = false;
  }

  /**
   * Request camera permission and start scanner
   */
  async start() {
    try {
      console.log('🔔 QRScanner START - Requesting camera access...');
      
      // CHECK IF CAMERA API IS AVAILABLE FIRST
      if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('CAMERA_API_NOT_AVAILABLE');
      }
      
      console.log('✅ Camera API is available');
      
      // Create modal first
      if (!document.getElementById('qrScannerModal')) {
        this.createModal();
      }

      const modal = document.getElementById('qrScannerModal');
      modal.classList.remove('hidden');

      // DIRECTLY request camera - this MUST trigger permission dialog
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      console.log('📱 Calling getUserMedia - PERMISSION DIALOG SHOULD APPEAR NOW');
      console.log('Constraints:', constraints);

      // This line MUST trigger the browser's permission dialog
      this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log('✅ Permission GRANTED - Camera access acquired');
      console.log('Video stream:', this.videoStream);

      // Get video element and set up
      const video = document.getElementById('qrScannerVideo');
      if (!video) {
        throw new Error('Video element not found');
      }

      video.srcObject = this.videoStream;
      
      console.log('Setting video source...');
      
      // Wait for video to be playable
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Video timeout')), 5000);
        
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          console.log('✅ Video metadata loaded');
          resolve();
        };
        
        video.play().catch(reject);
      });

      console.log('✅ Video playing - Starting QR scan');
      this.isScanning = true;
      this.scanFrame();

    } catch (error) {
      console.error('❌ CAMERA ERROR:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);

      // Close modal
      const modal = document.getElementById('qrScannerModal');
      if (modal) {
        modal.classList.add('hidden');
      }

      // Handle specific error types
      let errorMsg = '';

      if (error.message === 'CAMERA_API_NOT_AVAILABLE') {
        errorMsg = '❌ CAMERA API NOT AVAILABLE\n\n';
        errorMsg += 'Your browser or connection doesn\'t support camera access.\n\n';
        errorMsg += 'SOLUTIONS:\n';
        errorMsg += '1. Use Chrome, Firefox, or Edge browser\n';
        errorMsg += '2. The site MUST use HTTPS (not HTTP)\n';
        errorMsg += '3. Make sure you\'re on the same WiFi as the computer\n\n';
        errorMsg += 'Your URL should start with: https://\n';
        errorMsg += '(You\'re currently on: ' + window.location.protocol + '//)';
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMsg = '❌ PERMISSION DENIED\n\n';
        errorMsg += 'Your browser blocked camera access.\n\n';
        errorMsg += 'TO FIX:\n';
        errorMsg += '1. Open browser Settings\n';
        errorMsg += '2. Find "Site Permissions" or "Camera"\n';
        errorMsg += '3. Allow camera for this website\n';
        errorMsg += '4. Reload the page and try again\n\n';
        errorMsg += 'For Safari (iPhone): Settings > Safari > Camera > Allow';
      } else if (error.name === 'NotFoundError') {
        errorMsg = '❌ NO CAMERA FOUND\n\nYour device does not have a working camera.';
      } else if (error.name === 'NotReadableError') {
        errorMsg = '❌ CAMERA IN USE\n\nAnother app is using the camera.\n\nClose it and try again.';
      } else if (error.name === 'SecurityError') {
        errorMsg = '❌ SECURITY ERROR\n\nThis site must use HTTPS for camera access.\n\nAccess via HTTPS instead of HTTP.';
      } else {
        errorMsg = `❌ CAMERA ERROR\n\n${error.message || 'Unknown error'}`;
      }

      console.error('Final error message:', errorMsg);
      this.onError(errorMsg);
    }
  }

  /**
   * Stop camera and close modal
   */
  stop() {
    console.log('🛑 Stopping scanner');
    this.isScanning = false;

    if (this.videoStream) {
      console.log('Closing video stream');
      this.videoStream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      this.videoStream = null;
    }

    const modal = document.getElementById('qrScannerModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /**
   * Scan video frame for QR codes
   */
  scanFrame() {
    if (!this.isScanning) return;

    const video = document.getElementById('qrScannerVideo');
    const canvas = document.getElementById('qrScannerCanvas');

    if (!video || !canvas) {
      console.error('Video or canvas element missing');
      return;
    }

    const context = canvas.getContext('2d');

    // Check if video is ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      requestAnimationFrame(() => this.scanFrame());
      return;
    }

    // Set canvas size and draw video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Detect QR code
    try {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code) {
        console.log('✅ QR CODE DETECTED:', code.data);
        const qrValue = this.extractQRId(code.data);
        this.stop();
        this.onSuccess(qrValue);
        return;
      }
    } catch (err) {
      console.error('QR detection error:', err);
    }

    // Continue scanning
    requestAnimationFrame(() => this.scanFrame());
  }

  /**
   * Extract QR ID from URL or text
   */
  extractQRId(qrData) {
    // If it's a URL with id parameter, extract it
    if (qrData.includes('id=')) {
      try {
        const url = new URL(qrData);
        return url.searchParams.get('id');
      } catch (e) {
        // Not a valid URL, continue
      }
    }

    // If it's a full URL, extract the last part
    if (qrData.includes('/')) {
      const parts = qrData.split('/');
      return parts[parts.length - 1];
    }

    // Otherwise return as-is (assume it's the ID)
    return qrData;
  }

  /**
   * Create scanner modal UI
   */
  createModal() {
    const modal = document.createElement('div');
    modal.id = 'qrScannerModal';
    modal.className = 'hidden fixed inset-0 bg-black/80 flex items-center justify-center z-50';

    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-md w-full mx-4 overflow-hidden shadow-2xl">
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-bold text-xl">Scan QR Code</h3>
            <button onclick="window.qrScanner?.stop()" class="text-white hover:bg-white/20 p-2 rounded-lg transition">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <p class="text-white/90 text-sm">📱 Point camera at QR code</p>
        </div>

        <!-- Camera View -->
        <div class="relative bg-black aspect-square overflow-hidden">
          <video 
            id="qrScannerVideo" 
            autoplay
            muted
            playsinline
            style="width: 100%; height: 100%; display: block; object-fit: cover;"
          ></video>
          <canvas 
            id="qrScannerCanvas" 
            class="hidden"
          ></canvas>

          <!-- Scanner frame overlay -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="relative w-64 h-64 border-2 border-green-400 rounded-lg opacity-70">
              <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
              <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
              <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
              <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
            </div>
          </div>

          <!-- Scanning indicator -->
          <div class="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <div class="flex items-center gap-2 text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur">
              <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span class="text-sm font-medium">Scanning...</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-6 bg-gray-50 border-t">
          <button 
            onclick="window.qrScanner?.stop()" 
            class="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }
}

// Global instance
window.qrScanner = null;

/**
 * Initialize QR Scanner
 */
window.initQRScanner = function(onSuccess, onError) {
  console.log('🔷 initQRScanner called');
  window.qrScanner = new QRScanner({
    onSuccess: onSuccess,
    onError: onError || ((err) => {
      console.error('Scanner error callback:', err);
      alert(err);
    })
  });
};

/**
 * Start scanning with fresh permission request
 */
window.startQRScanner = function() {
  console.log('🔷 startQRScanner called');
  
  if (!window.qrScanner) {
    console.log('Creating new scanner...');
    window.initQRScanner(
      (qrValue) => {
        console.log('✅ Success callback - QR Value:', qrValue);
      },
      (error) => {
        console.error('❌ Error callback:', error);
      }
    );
  }
  
  console.log('Starting scanner.start()...');
  window.qrScanner.start();
};
