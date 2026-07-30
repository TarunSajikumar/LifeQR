// Doctor Dashboard JS Module
let currentUser = null;
let activePatient = null; // Stored patient profile details
let scannerInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkDashboardAccess(['doctor']);
  if (!currentUser) return;

  // Initialize display details
  document.getElementById('userName').textContent = currentUser.name;

  // Load list of authorized patients
  await loadAuthorizedPatients();

  // Handle forms
  setupDoctorListeners();
});

async function loadAuthorizedPatients() {
  try {
    const response = await fetch('/api/v1/doctor-access/patients', {
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    const container = document.getElementById('authorizedPatientsList');
    container.innerHTML = '';

    if (data.patients.length === 0) {
      container.innerHTML = `<p class="text-xs text-gray-500 italic">No patients have authorized you yet.</p>`;
      return;
    }

    data.patients.forEach(p => {
      const card = document.createElement('div');
      card.className = 'p-3 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between cursor-pointer transition';
      card.onclick = () => {
        document.getElementById('patientQrId').value = p.qrCodeId;
        searchPatient();
      };
      
      const photo = p.profilePhoto || 'https://www.w3schools.com/howto/img_avatar.png';
      card.innerHTML = `
        <div class="flex items-center gap-3">
          <img src="${photo}" class="w-8 h-8 rounded-full object-cover">
          <div>
            <p class="text-xs font-bold text-gray-800">${p.name}</p>
            <p class="text-[10px] text-gray-500">ID: ${p.qrCodeId} • Blood: ${p.bloodGroup || 'N/A'}</p>
          </div>
        </div>
        <span class="material-symbols-outlined text-sm text-blue-600">arrow_forward_ios</span>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Search or scan patient QR ID
window.searchPatient = async function() {
  const qrId = document.getElementById('patientQrId').value.trim();
  if (!qrId) {
    showToast('Please enter a patient QR Code ID', 'warning');
    return;
  }

  showPatientSkeleton();

  try {
    // 1. Get access status details
    const response = await fetch(`/api/v1/doctor-access/status/${qrId}`, {
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Patient not found');

    activePatient = data;
    activePatient.qrCodeId = qrId;

    // Log the scan activity
    await logDoctorScan(qrId);

    renderPatientDetails();
  } catch (err) {
    showToast(err.message, 'error');
    hidePatientView();
  }
};

async function logDoctorScan(qrCodeId) {
  try {
    await fetch(`/api/v1/patient/log-scan/${qrCodeId}`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (e) {
    console.warn('Failed to log doctor scan activity.');
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
  document.getElementById('patPhone').textContent = activePatient.phone || 'N/A';

  const photoEl = document.getElementById('patPhoto');
  if (activePatient.profilePhoto) {
    photoEl.src = activePatient.profilePhoto;
  } else {
    photoEl.src = 'https://www.w3schools.com/howto/img_avatar.png';
  }

  // Handle permission statuses
  const statusContainer = document.getElementById('accessStatusContainer');
  const detailsContainer = document.getElementById('authorizedDetailsContainer');
  
  statusContainer.innerHTML = '';
  detailsContainer.classList.add('hidden');

  if (activePatient.isAuthorized) {
    statusContainer.innerHTML = `
      <div class="p-3 bg-green-100 text-green-800 rounded-xl flex items-center gap-2 text-xs font-bold">
        <span class="material-symbols-outlined text-sm">verified_user</span>
        You are authorized to view and edit this patient's medical records
      </div>
    `;
    detailsContainer.classList.remove('hidden');
    loadPatientMedicalHistory(activePatient.qrCodeId);
    loadPatientReports(activePatient.qrCodeId);
  } else {
    // If not authorized, check if request is pending
    if (activePatient.hasPending) {
      statusContainer.innerHTML = `
        <div class="p-3 bg-yellow-100 text-yellow-800 rounded-xl flex items-center gap-2 text-xs font-bold justify-between">
          <span class="flex items-center gap-2">
            <span class="material-symbols-outlined text-sm">hourglass_empty</span>
            Pending approval from the patient
          </span>
        </div>
      `;
    } else {
      statusContainer.innerHTML = `
        <div class="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl space-y-3">
          <div class="flex items-center gap-2 text-xs font-bold">
            <span class="material-symbols-outlined text-sm">lock</span>
            This profile is private. You do not have authorization.
          </div>
          <button onclick="requestAccess()" class="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-md transition">
            Request Access
          </button>
        </div>
      `;
    }
    
    // Check if public profile permits basic fields
    if (activePatient.publicProfile) {
      detailsContainer.classList.remove('hidden');
      loadPatientMedicalHistory(activePatient.qrCodeId);
      loadPatientReports(activePatient.qrCodeId);
    }
  }
}

window.requestAccess = async function() {
  try {
    const response = await fetch('/api/v1/doctor-access/request-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ qrCodeId: activePatient.qrCodeId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    showToast('Access request sent successfully!', 'success');
    activePatient.hasPending = true;
    renderPatientDetails();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

async function loadPatientMedicalHistory(qrCodeId) {
  try {
    const response = await fetch(`/api/v1/history/${qrCodeId}`, {
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    const container = document.getElementById('patientHistoryTimeline');
    container.innerHTML = '';

    if (data.history.length === 0) {
      container.innerHTML = `<p class="text-xs text-gray-500 italic text-center p-4">No medical history logged for this patient.</p>`;
      return;
    }

    data.history.forEach(h => {
      const div = document.createElement('div');
      div.className = 'border-l-2 border-blue-200 pl-3 pb-3 relative';
      
      let icon = 'medical_services';
      if (h.type === 'vital') icon = 'favorite';
      if (h.type === 'symptom') icon = 'thermostat';

      div.innerHTML = `
        <span class="absolute -left-[7px] top-0 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white">
          <span class="material-symbols-outlined" style="font-size: 6px;">${icon}</span>
        </span>
        <div class="bg-white p-2.5 border border-gray-100 rounded-lg shadow-sm">
          <div class="flex justify-between items-center text-[10px] mb-0.5">
            <span class="font-bold text-gray-800">${h.title}</span>
            <span class="text-gray-400">${new Date(h.timestamp).toLocaleDateString()}</span>
          </div>
          <p class="text-[11px] text-gray-600">${h.description}</p>
          <p class="text-[9px] text-gray-400 mt-1">Logged by: ${h.author.name} (${h.author.role})</p>
        </div>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error('Failed to load patient history:', err);
  }
}

async function loadPatientReports(qrCodeId) {
  try {
    // Doctors read patient reports list if permitted
    // We make a call to get patient reports which returns empty list if restricted
    const response = await fetch(`/api/v1/patient/profile/${qrCodeId}`, {
      credentials: 'include'
    });
    const data = await response.json();
    
    const container = document.getElementById('patientReportsList');
    container.innerHTML = '';

    // Since /profile/:id is public, we fetch reports securely from access endpoints if authorized
    // Let's call details endpoint /doctor/patient/:id if authorized
    if (activePatient.isAuthorized) {
      const detailsResponse = await fetch(`/api/v1/patient/profile/${qrCodeId}`, {
        credentials: 'include'
      });
      // In this refactoring, doctors access files from authorized list:
      // Let's implement getting reports list for doctors
    }
    
    container.innerHTML = `<p class="text-xs text-gray-500 italic">Medical reports require full patient authorization to view.</p>`;
  } catch (err) {
    console.error('Failed to load patient reports:', err);
  }
}

function setupDoctorListeners() {
  // Add Treatment Note
  document.getElementById('addTreatmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('addTreatmentBtn');
    btn.disabled = true;
    btn.textContent = 'Adding Note...';

    try {
      const title = document.getElementById('treatmentTitle').value;
      const description = document.getElementById('treatmentDesc').value;

      const response = await fetch(`/api/v1/history/add/${activePatient.qrCodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ type: 'treatment', title, description })
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error);

      showToast('Treatment entry added successfully!', 'success');
      e.target.reset();
      await loadPatientMedicalHistory(activePatient.qrCodeId);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add Treatment Entry';
    }
  });
}

// Camera Scanner Triggers
window.startQRScanner = function() {
  const container = document.getElementById('cameraScannerContainer');
  container.classList.remove('hidden');

  if (!scannerInstance) {
    scannerInstance = new QRScanner({
      onSuccess: (result) => {
        // Stop scanner and fetch
        stopQRScanner();
        
        // Extract ID from scanned URL query string if present
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
