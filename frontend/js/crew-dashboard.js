// Crew Dashboard JS Module
let currentUser = null;
let activePatient = null;
let scannerInstance = null;
let mapInstance = null;
let mapMarker = null;
let activeSosId = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkDashboardAccess(['crew']);
  if (!currentUser) return;

  // Initialize Socket.IO connection for real-time SOS alerts
  initSocketConnection();

  // Setup form submit listeners
  setupCrewListeners();
});

function initSocketConnection() {
  try {
    // Socket.IO auto-authenticates via httpOnly cookie
    // Server assigns crew:all room based on verified role
    const socket = io({ withCredentials: true });

    // Real-time SOS Triggered alert listener
    socket.on('sos-alert', (data) => {
      activeSosId = data.sosId;
      showSosAlertPopup(data);
    });
  } catch (e) {
    console.warn('Real-time Socket.IO connection failed. Crew alert broadcast disabled.');
  }
}

function showSosAlertPopup(data) {
  const popup = document.getElementById('sosAlertPopup');
  popup.classList.remove('hidden');

  // Trigger emergency alert sound & toast
  showToast(`🚨 EMERGENCY: SOS triggered by ${data.name}!`, 'emergency', 10000);

  document.getElementById('sosPatName').textContent = data.name;
  document.getElementById('sosPatBlood').textContent = data.bloodGroup || 'N/A';
  document.getElementById('sosPatAllergies').textContent = data.allergies || 'None';
  document.getElementById('sosPatMessage').textContent = data.message || '';
  document.getElementById('sosPatLoc').textContent = `${data.location.lat.toFixed(4)}, ${data.location.lng.toFixed(4)}`;

  // Store scanned ID to quick access input
  document.getElementById('patientQrId').value = data.patientId;
  
  // Set accept/acknowledge button parameters
  const ackBtn = document.getElementById('ackSosBtn');
  ackBtn.onclick = async () => {
    try {
      const response = await fetch(`/api/v1/sos/acknowledge/${data.patientId}/${data.sosId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error);

      showToast('SOS Alert successfully acknowledged!', 'success');
      popup.classList.add('hidden');
      
      // Load patient details directly
      document.getElementById('patientQrId').value = data.patientId;
      await searchPatient();

      // Trigger arrival timeline stage
      logIncidentEvent('SOS Alert Acknowledged - Ambulance Dispatched');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

window.closeSosPopup = function() {
  document.getElementById('sosAlertPopup').classList.add('hidden');
};

// Search patient profile
window.searchPatient = async function() {
  const qrId = document.getElementById('patientQrId').value.trim();
  if (!qrId) {
    showToast('Please enter a patient QR Code ID', 'warning');
    return;
  }

  showPatientSkeleton();

  try {
    const response = await fetch(`/api/v1/patient/profile/${qrId}`, {
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Patient not found');

    activePatient = data;
    activePatient.qrCodeId = qrId;

    // Log the scan activity
    await logCrewScan(qrId);

    renderPatientDetails();
  } catch (err) {
    showToast(err.message, 'error');
    hidePatientView();
  }
};

async function logCrewScan(qrCodeId) {
  try {
    await fetch(`/api/v1/patient/log-scan/${qrCodeId}`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (e) {
    console.warn('Failed to log crew scan activity.');
  }
}

function showPatientSkeleton() {
  document.getElementById('patientDetailsPanel').classList.remove('hidden');
  document.getElementById('patientSkeleton').classList.remove('hidden');
  document.getElementById('patientContent').classList.add('hidden');
}

function hidePatientView() {
  document.getElementById('patientDetailsPanel').classList.add('hidden');
}

function renderPatientDetails() {
  document.getElementById('patientSkeleton').classList.add('hidden');
  document.getElementById('patientContent').classList.remove('hidden');

  document.getElementById('patName').textContent = activePatient.name;
  document.getElementById('patId').textContent = activePatient.qrCodeId;
  document.getElementById('patGender').textContent = activePatient.gender || 'N/A';
  document.getElementById('patAge').textContent = activePatient.age || 'N/A';
  
  document.getElementById('patBloodGroup').textContent = activePatient.bloodGroup || 'N/A';
  document.getElementById('patAllergies').textContent = activePatient.allergies || 'None';
  document.getElementById('patMedications').textContent = activePatient.medications || 'None';
  document.getElementById('patHealthIssues').textContent = activePatient.healthIssues || 'None';

  // Render first emergency contact details
  const contactContainer = document.getElementById('patEmergencyContact');
  contactContainer.innerHTML = '';
  
  if (activePatient.emergencyContacts && activePatient.emergencyContacts.length > 0) {
    const primaryContact = activePatient.emergencyContacts[0];
    contactContainer.innerHTML = `
      <div class="p-3 bg-red-50 border border-red-100 rounded-xl flex justify-between items-center">
        <div>
          <p class="font-bold text-gray-800 text-sm">${primaryContact.name} (${primaryContact.relationship})</p>
          <p class="text-xs text-gray-600">${primaryContact.phone}</p>
        </div>
        <a href="tel:${primaryContact.phone}" class="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition flex items-center justify-center">
          <span class="material-symbols-outlined text-sm">phone</span>
        </a>
      </div>
    `;
  } else {
    contactContainer.innerHTML = `<p class="text-xs text-gray-500 italic">No emergency contacts listed.</p>`;
  }

  // Setup Map Location
  setupPatientMap();
}

function setupPatientMap() {
  const loc = activePatient.lastLocation;
  if (!loc || !loc.lat || !loc.lng) {
    document.getElementById('mapWrapper').classList.add('hidden');
    return;
  }

  document.getElementById('mapWrapper').classList.remove('hidden');
  
  // Set navigation link
  const navBtn = document.getElementById('gmapsNavBtn');
  navBtn.href = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;

  // Initialize Leaflet Map
  setTimeout(() => {
    if (!mapInstance) {
      mapInstance = L.map('leafletMapContainer').setView([loc.lat, loc.lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance);
    } else {
      mapInstance.setView([loc.lat, loc.lng], 15);
    }

    if (mapMarker) {
      mapMarker.setLatLng([loc.lat, loc.lng]);
    } else {
      mapMarker = L.marker([loc.lat, loc.lng]).addTo(mapInstance)
        .bindPopup(`<b>${activePatient.name} Location</b>`).openPopup();
    }
  }, 300);
}

// Log incident checkpoints
window.logIncidentStage = function(stageName) {
  if (!activePatient) {
    showToast('No active patient loaded', 'warning');
    return;
  }
  logIncidentEvent(`Incident checkpoint: ${stageName}`);
  showToast(`Logged status: ${stageName}`, 'success');
};

async function logIncidentEvent(eventText) {
  try {
    // Add detail to patient history / activity log
    await fetch(`/api/v1/history/add/${activePatient.qrCodeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        type: 'vital', // save under vitals/symptoms
        title: 'Emergency Crew Checkpoint',
        description: eventText
      })
    });
  } catch (err) {
    console.warn('Failed to post timeline update.');
  }
}

function setupCrewListeners() {}

// QR Scanner setup
window.startQRScanner = function() {
  const container = document.getElementById('cameraScannerContainer');
  container.classList.remove('hidden');

  if (!scannerInstance) {
    scannerInstance = new QRScanner({
      onSuccess: (result) => {
        stopQRScanner();
        
        let parsedId = result;
        if (result.includes('id=')) {
          parsedId = new URL(result).searchParams.get('id');
        }
        
        document.getElementById('patientQrId').value = parsedId;
        searchPatient();
      },
      onError: (err) => {
        showToast(`Scanner issue: ${err.message || err}`, 'error');
      }
    });
  }

  scannerInstance.start();
};

window.stopQRScanner = function() {
  document.getElementById('cameraScannerContainer').classList.add('hidden');
  if (scannerInstance) {
    scannerInstance.stop();
  }
};
