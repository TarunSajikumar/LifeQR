// Patient Dashboard JS Module
let currentUser = null;
let currentProfile = null;
let reportsPage = 1;
let activitiesPage = 1;

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth and role
  currentUser = await checkDashboardAccess(['patient']);
  if (!currentUser) return;

  // Initialize Socket.IO connection for notifications
  initSocketConnection();

  // Load patient data
  await loadDashboardData();

  // Setup form listeners
  setupFormListeners();
});

function initSocketConnection() {
  try {
    // Socket.IO auto-authenticates via httpOnly cookie
    // Server assigns patient:{userId} room based on verified role
    const socket = io({ withCredentials: true });
    
    // Listen for authorized doctor accesses or SOS status updates
    socket.on('sos-acknowledged', (data) => {
      showToast(`Emergency crew (${data.responderName}) acknowledged your SOS alert!`, 'info');
      loadDashboardData();
    });
  } catch (e) {
    console.warn('Socket.IO connection failed. Offline notifications unavailable.');
  }
}

async function loadDashboardData() {
  showSkeletons();
  try {
    const response = await fetch('/api/v1/patient/me', {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || 'Failed to load details');
    
    currentUser = data.user;
    currentProfile = data.profile || {};

    renderProfileDetails();
    renderQRDetails();
    await loadReports();
    await loadActivities();
    await loadAccessRequests();
    await loadMedicalHistory();

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideSkeletons();
  }
}

function showSkeletons() {
  document.querySelectorAll('.dashboard-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.dashboard-skeleton').forEach(el => el.classList.remove('hidden'));
}

function hideSkeletons() {
  document.querySelectorAll('.dashboard-skeleton').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.dashboard-content').forEach(el => el.classList.remove('hidden'));
}

function renderProfileDetails() {
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('profileName').value = currentUser.name || '';
  document.getElementById('profilePhone').value = currentUser.phone || '+91 ';
  document.getElementById('profileAddress').value = currentUser.address || '';
  document.getElementById('profileCity').value = currentUser.city || '';
  document.getElementById('profileState').value = currentUser.state || '';
  document.getElementById('profileGender').value = currentUser.gender || '';
  
  document.getElementById('profileAge').value = currentProfile.age || '';
  document.getElementById('profileBloodGroup').value = currentProfile.bloodGroup || '';
  document.getElementById('profileAllergies').value = currentProfile.allergies || '';
  document.getElementById('profileMedications').value = currentProfile.medications || '';
  document.getElementById('profileHealthIssues').value = currentProfile.healthIssues || '';

  // Render profile photo
  const photoEl = document.getElementById('userProfilePhoto');
  if (currentUser.profilePhoto) {
    photoEl.src = '/api/v1/patient/photo';
  } else {
    photoEl.src = 'https://www.w3schools.com/howto/img_avatar.png'; // default avatar
  }

  // Set toggle visibility state
  document.getElementById('publicProfileToggle').checked = currentProfile.publicProfile !== false;

  // Render multiple emergency contacts
  const contactsList = document.getElementById('emergencyContactsContainer');
  contactsList.innerHTML = '';
  
  const contacts = currentProfile.emergencyContacts || [];
  if (contacts.length === 0) {
    contactsList.innerHTML = `<p class="text-sm text-gray-500 italic">No emergency contacts configured.</p>`;
  } else {
    contacts.forEach((c) => {
      const contactRow = document.createElement('div');
      contactRow.className = 'flex justify-between items-center p-3 bg-purple-50 rounded-xl border border-purple-100';
      contactRow.innerHTML = `
        <div>
          <p class="font-bold text-gray-800 text-sm">${c.name} (${c.relationship})</p>
          <p class="text-xs text-gray-600">${c.phone}</p>
        </div>
        <span class="px-2 py-1 bg-purple-100 text-[#6818f4] text-xs font-bold rounded-lg">Priority ${c.priority}</span>
      `;
      contactsList.appendChild(contactRow);
    });
  }

  // Populate emergency contact form fields
  for (let i = 1; i <= 3; i++) {
    const contact = contacts[i - 1] || {};
    const nameInput = document.getElementById(`emergencyContactName${i}`);
    const phoneInput = document.getElementById(`emergencyContactPhone${i}`);
    const relInput = document.getElementById(`emergencyContactRelationship${i}`);
    if (nameInput) nameInput.value = contact.name || '';
    if (phoneInput) phoneInput.value = contact.phone || '+91 ';
    if (relInput) relInput.value = contact.relationship || '';
  }
}

function renderQRDetails() {
  if (currentProfile.qrCode) {
    document.getElementById('qrCodeImage').src = currentProfile.qrCode;
    document.getElementById('qrCodeIdValue').textContent = currentProfile.qrCodeId;
    
    // Store QR code locally in cache for offline view triggers
    localStorage.setItem('offline_qrCode', currentProfile.qrCode);
    localStorage.setItem('offline_qrCodeId', currentProfile.qrCodeId);
    localStorage.setItem('offline_name', currentUser.name);
    localStorage.setItem('offline_bloodGroup', currentProfile.bloodGroup || 'N/A');
  }
}

async function loadReports() {
  try {
    const response = await fetch(`/api/v1/reports?page=${reportsPage}&limit=4`, {
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    const container = document.getElementById('medicalReportsList');
    container.innerHTML = '';

    if (data.reports.length === 0) {
      container.innerHTML = `
        <div class="text-center p-8 bg-gray-50 rounded-2xl border border-gray-100">
          <span class="material-symbols-outlined text-4xl text-gray-400">description</span>
          <p class="text-gray-500 mt-2 text-sm">No medical reports uploaded yet.</p>
        </div>
      `;
      document.getElementById('reportsPagination').innerHTML = '';
      return;
    }

    data.reports.forEach(r => {
      const card = document.createElement('div');
      card.className = 'p-4 bg-white border border-gray-100 rounded-2xl flex justify-between items-center hover:border-purple-200 transition';
      card.innerHTML = `
        <div style="flex-1; min-width: 0;">
          <h4 class="font-bold text-gray-800 text-sm truncate">${r.originalName}</h4>
          <p class="text-xs text-gray-500 mt-1">${r.category} • ${new Date(r.uploadedAt).toLocaleDateString()}</p>
          <p class="text-xs text-gray-600 truncate mt-1 italic">${r.description || 'No description'}</p>
        </div>
        <a href="${r.url}" target="_blank" class="p-2 text-[#6818f4] hover:bg-purple-50 rounded-full transition flex items-center justify-center">
          <span class="material-symbols-outlined">visibility</span>
        </a>
      `;
      container.appendChild(card);
    });

    renderPagination('reportsPagination', data.pagination, 'reportsPage', loadReports);

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadActivities() {
  try {
    // Read activities list
    const response = await fetch(`/api/v1/patient/me`, {
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    const list = data.profile.activities || [];
    const container = document.getElementById('activitiesList');
    container.innerHTML = '';

    // Paginate manually on client
    const limit = 4;
    const startIndex = (activitiesPage - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    if (paginated.length === 0) {
      container.innerHTML = `
        <div class="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <p class="text-gray-500 text-sm">No activity recorded yet.</p>
        </div>
      `;
      document.getElementById('activitiesPagination').innerHTML = '';
      return;
    }

    paginated.forEach(a => {
      const row = document.createElement('div');
      row.className = 'flex gap-3 items-start border-b border-gray-100 pb-3 last:border-b-0 last:pb-0';
      row.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-[#6818f4] flex-shrink-0">
          <span class="material-symbols-outlined text-sm">history</span>
        </div>
        <div style="flex-1;">
          <p class="text-xs font-bold text-gray-800">${a.title}</p>
          <p class="text-[11px] text-gray-600 mt-0.5">${a.description}</p>
          <span class="text-[10px] text-gray-400 block mt-1">${new Date(a.timestamp).toLocaleString()}</span>
        </div>
      `;
      container.appendChild(row);
    });

    const paginationData = {
      currentPage: activitiesPage,
      totalPages: Math.ceil(list.length / limit),
      hasNextPage: startIndex + limit < list.length,
      hasPrevPage: activitiesPage > 1
    };
    renderPagination('activitiesPagination', paginationData, 'activitiesPage', loadActivities);

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadAccessRequests() {
  try {
    const response = await fetch('/api/v1/doctor-access/requests', {
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    const container = document.getElementById('doctorAccessRequests');
    container.innerHTML = '';

    if (data.requests.length === 0) {
      container.innerHTML = `<p class="text-xs text-gray-500 italic">No pending doctor requests.</p>`;
      return;
    }

    data.requests.forEach(r => {
      const row = document.createElement('div');
      row.className = 'p-3 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2';
      row.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <p class="text-xs font-bold text-gray-800">Dr. ${r.metadata.doctorName}</p>
            <p class="text-[10px] text-gray-500">${r.metadata.specialization} • ${r.metadata.hospital}</p>
          </div>
          <span class="text-[9px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-bold">Pending</span>
        </div>
        <div class="flex gap-2 justify-end">
          <button onclick="respondToRequest('${r.metadata.requestId}', false)" class="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold">Decline</button>
          <button onclick="respondToRequest('${r.metadata.requestId}', true)" class="px-3 py-1 bg-[#6818f4] text-white rounded-lg text-xs font-semibold">Approve</button>
        </div>
      `;
      container.appendChild(row);
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.respondToRequest = async function(requestId, approve) {
  try {
    const response = await fetch('/api/v1/doctor-access/respond', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ requestId, approve })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    
    showToast(approve ? 'Request approved successfully!' : 'Request rejected successfully.', 'success');
    await loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

async function loadMedicalHistory() {
  try {
    const response = await fetch('/api/v1/history', {
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    const container = document.getElementById('historyTimelineContainer');
    container.innerHTML = '';

    if (data.history.length === 0) {
      container.innerHTML = `
        <div class="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <p class="text-gray-500 text-sm">No medical history entries registered.</p>
        </div>
      `;
      return;
    }

    data.history.forEach(h => {
      const item = document.createElement('div');
      item.className = 'border-l-2 border-purple-200 pl-4 pb-4 relative last:pb-0';
      
      // Select icons based on timeline type
      let icon = 'medical_services';
      let badgeColor = 'bg-blue-100 text-blue-800';
      if (h.type === 'vital') {
        icon = 'favorite';
        badgeColor = 'bg-green-100 text-green-800';
      }
      if (h.type === 'symptom') {
        icon = 'thermostat';
        badgeColor = 'bg-orange-100 text-orange-800';
      }

      item.innerHTML = `
        <span class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-purple-500 border-2 border-white flex items-center justify-center text-white">
          <span class="material-symbols-outlined" style="font-size: 8px;">${icon}</span>
        </span>
        <div class="bg-gray-50/50 p-3 border border-gray-100 rounded-xl">
          <div class="flex justify-between items-center mb-1">
            <h5 class="font-bold text-gray-800 text-xs">${h.title}</h5>
            <span class="text-[9px] px-2 py-0.5 rounded-full font-semibold ${badgeColor}">${h.type}</span>
          </div>
          <p class="text-xs text-gray-600">${h.description}</p>
          <div class="flex justify-between items-center mt-2 text-[9px] text-gray-400">
            <span>By ${h.author.name} (${h.author.role})</span>
            <span>${new Date(h.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderPagination(containerId, pagination, pageVarName, callback) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  if (pagination.totalPages <= 1) return;

  const btnPrev = document.createElement('button');
  btnPrev.className = `px-3 py-1 text-xs border rounded-lg ${pagination.hasPrevPage ? 'hover:bg-gray-50' : 'opacity-40 cursor-not-allowed'}`;
  btnPrev.textContent = 'Prev';
  btnPrev.disabled = !pagination.hasPrevPage;
  btnPrev.onclick = () => {
    if (pageVarName === 'reportsPage') reportsPage--;
    if (pageVarName === 'activitiesPage') activitiesPage--;
    callback();
  };

  const pageNum = document.createElement('span');
  pageNum.className = 'text-xs font-semibold text-gray-600 px-3 flex items-center';
  pageNum.textContent = `Page ${pagination.currentPage} of ${pagination.totalPages}`;

  const btnNext = document.createElement('button');
  btnNext.className = `px-3 py-1 text-xs border rounded-lg ${pagination.hasNextPage ? 'hover:bg-gray-50' : 'opacity-40 cursor-not-allowed'}`;
  btnNext.textContent = 'Next';
  btnNext.disabled = !pagination.hasNextPage;
  btnNext.onclick = () => {
    if (pageVarName === 'reportsPage') reportsPage++;
    if (pageVarName === 'activitiesPage') activitiesPage++;
    callback();
  };

  container.appendChild(btnPrev);
  container.appendChild(pageNum);
  container.appendChild(btnNext);
}

function setupFormListeners() {
  // Profile Form Edit Listener
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      
      // Restructure emergency contacts
      const contacts = [];
      for (let i = 1; i <= 3; i++) {
        const nameVal = document.getElementById(`emergencyContactName${i}`).value;
        const phoneVal = document.getElementById(`emergencyContactPhone${i}`).value;
        const relVal = document.getElementById(`emergencyContactRelationship${i}`).value;
        if (nameVal && phoneVal) {
          contacts.push({ name: nameVal, phone: phoneVal, relationship: relVal });
        }
      }
      data.emergencyContacts = contacts;

      const response = await fetch('/api/v1/patient/update', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error);

      showToast('Profile updated successfully!', 'success');
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });

  // Report Upload Listener
  document.getElementById('reportUploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('uploadReportBtn');
    btn.disabled = true;
    btn.textContent = 'Uploading...';

    try {
      const formData = new FormData(e.target);
      const response = await fetch('/api/v1/reports/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error);

      showToast('Report uploaded successfully!', 'success');
      e.target.reset();
      await loadReports();
      await loadActivities();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload Report';
    }
  });

  // Toggle Visibility Listener
  document.getElementById('publicProfileToggle').addEventListener('change', async (e) => {
    try {
      const response = await fetch('/api/v1/patient/visibility', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ publicProfile: e.target.checked })
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error);
      showToast(`Profile visibility changed to ${e.target.checked ? 'Public' : 'Private'}.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Symptom / Vital add listener
  document.getElementById('symptomForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('addHistoryBtn');
    btn.disabled = true;
    btn.textContent = 'Adding...';

    try {
      const type = document.getElementById('historyType').value;
      const title = document.getElementById('historyTitle').value;
      const description = document.getElementById('historyDesc').value;

      const response = await fetch('/api/v1/history/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ type, title, description })
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error);

      showToast('Timeline entry added successfully!', 'success');
      e.target.reset();
      await loadMedicalHistory();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add Entry';
    }
  });
}

// Upload profile photo
window.uploadProfilePhoto = async function() {
  const fileInput = document.getElementById('profilePhotoInput');
  if (fileInput.files.length === 0) return;

  const formData = new FormData();
  formData.append('photo', fileInput.files[0]);

  try {
    const response = await fetch('/api/v1/patient/upload-photo', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.error);

    showToast('Profile photo updated successfully!', 'success');
    document.getElementById('userProfilePhoto').src = res.profilePhoto;
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Regenerate QR
window.regenerateQR = async function() {
  try {
    const response = await fetch('/api/v1/patient/regenerate-qr', {
      method: 'POST',
      credentials: 'include'
    });
    const res = await response.json();
    if (!response.ok) throw new Error(res.error);
    showToast('QR Code successfully regenerated!', 'success');
    await loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Trigger SOS
window.triggerEmergencySOS = async function() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'error');
    return;
  }

  showToast('Acquiring location coordinates...', 'info');

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    try {
      const response = await fetch('/api/v1/sos/sos', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ lat, lng, message: 'Emergency Patient SOS Triggered!' })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      showToast('🚨 SOS Emergency broadcasted successfully!', 'emergency', 10000);
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, (err) => {
    showToast(`Location access denied: ${err.message}. Triggering generic SOS...`, 'warning');
    // Call SOS with mock coordinates
    triggerSOSWithFallback();
  }, { enableHighAccuracy: true });
};

async function triggerSOSWithFallback() {
  try {
    const response = await fetch('/api/v1/sos/sos', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ lat: 0, lng: 0, message: 'SOS Alert - Geolocation unavailable' })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    showToast('🚨 Emergency SOS alert sent without location.', 'emergency', 10000);
    await loadDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Share live location coordinate updates
window.shareLiveLocation = function() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported.', 'error');
    return;
  }

  showToast('Starting live location tracking...', 'info');
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const response = await fetch('/api/v1/patient/location', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      });
      if (!response.ok) throw new Error();
      showToast('Live location coordinates updated!', 'success');
    } catch (e) {
      showToast('Failed to update live coordinates.', 'error');
    }
  });
};

// Wallet card print download logic
window.downloadWalletCard = function() {
  // Create wallet card container dynamically
  const card = document.createElement('div');
  card.className = 'wallet-card-container wallet-card-print';
  card.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <h2>🚑 LifeQR ID</h2>
        <p style="margin: 4px 0 0 0; font-weight: bold; font-size: 13px;">${currentUser.name}</p>
        <p style="margin: 2px 0 0 0; font-size: 10px; color: #4b5563;">QR Code ID: ${currentProfile.qrCodeId}</p>
      </div>
      <div>
        <div style="display: flex; gap: 8px; margin-bottom: 4px;">
          <span style="background: #fef2f2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Blood: ${currentProfile.bloodGroup || 'N/A'}</span>
        </div>
        <p style="margin: 0; font-size: 9px; color: #dc2626; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          Allergies: ${currentProfile.allergies || 'None'}
        </p>
      </div>
    </div>
    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; border-left: 1px dashed #d1d5db; padding-left: 4mm;">
      <img src="${currentProfile.qrCode}" class="wallet-card-qr" />
      <span style="font-size: 8px; margin-top: 2px; font-weight: bold;">SCAN FOR LIFE</span>
    </div>
  `;

  document.body.appendChild(card);
  window.print();
  
  // Clean up
  setTimeout(() => {
    card.remove();
  }, 1000);
};

// Traditional Medical ID Download using browser print layout
window.downloadQR = function() {
  window.print();
};

// Auto-fill and format +91 for phone inputs in patient dashboard
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[type="tel"]').forEach(input => {
    input.addEventListener('focus', () => {
      if (!input.value.trim()) {
        input.value = '+91 ';
      }
    });
    input.addEventListener('input', () => {
      const raw = input.value.trim();
      if (!raw.startsWith('+91')) {
        const digits = raw.replace(/[^0-9]/g, '');
        if (digits.startsWith('91')) {
          input.value = '+' + digits.slice(0, 2) + ' ' + digits.slice(2);
        } else if (digits.length > 0) {
          input.value = '+91 ' + digits;
        }
      }
    });
  });
});
