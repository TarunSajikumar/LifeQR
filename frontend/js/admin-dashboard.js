// Admin Dashboard JS Module
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkDashboardAccess(['admin']);
  if (!currentUser) return;

  // Initialize display details
  document.getElementById('userName').textContent = currentUser.name;

  // Load stats and users list
  await loadAdminStats();
  await loadAdminUsers();
});

async function loadAdminStats() {
  try {
    const response = await fetch('/api/v1/admin/stats', {
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    // Render stats
    document.getElementById('statTotalUsers').textContent = data.users.total;
    document.getElementById('statPatients').textContent = data.users.patient;
    document.getElementById('statDoctors').textContent = data.users.doctor;
    document.getElementById('statCrew').textContent = data.users.crew;

    document.getElementById('statTotalScans').textContent = data.stats.scans;
    document.getElementById('statTotalSos').textContent = data.stats.sos;

  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadAdminUsers() {
  try {
    const response = await fetch('/api/v1/admin/users', {
      credentials: 'include'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    if (data.users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center p-6 text-xs text-gray-500 italic">No users found.</td>
        </tr>
      `;
      return;
    }

    data.users.forEach((u, index) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-gray-100 hover:bg-gray-50/50 transition';
      
      let badgeColor = 'bg-purple-100 text-purple-800';
      if (u.role === 'doctor') badgeColor = 'bg-blue-100 text-blue-800';
      if (u.role === 'crew') badgeColor = 'bg-red-100 text-red-800';
      if (u.role === 'admin') badgeColor = 'bg-green-100 text-green-800';

      const createdDate = new Date(u.createdAt).toLocaleDateString();

      // Show action buttons
      let actionBtn = '';
      if (u.role !== 'admin') {
        actionBtn = `
          <button 
            onclick="toggleUserStatus('${u._id}', ${!u.active})" 
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
              u.active 
                ? 'bg-red-50 hover:bg-red-100 text-red-700' 
                : 'bg-green-50 hover:bg-green-100 text-green-700'
            }"
          >
            ${u.active ? 'Deactivate' : 'Activate'}
          </button>
        `;
      } else {
        actionBtn = `<span class="text-xs text-gray-400 font-semibold italic">System Admin</span>`;
      }

      tr.innerHTML = `
        <td class="p-3 text-xs font-bold text-gray-800">${index + 1}</td>
        <td class="p-3 text-xs">
          <p class="font-bold text-gray-800">${u.name}</p>
          <p class="text-[10px] text-gray-500">${u.email}</p>
        </td>
        <td class="p-3 text-xs">
          <span class="px-2 py-0.5 rounded-full font-bold text-[10px] ${badgeColor}">${u.role}</span>
        </td>
        <td class="p-3 text-xs text-gray-500">${createdDate}</td>
        <td class="p-3 text-xs">${actionBtn}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.toggleUserStatus = async function(userId, activeState) {
  try {
    const response = await fetch(`/api/v1/admin/users/${userId}/toggle-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ active: activeState })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    showToast(data.message, 'success');
    await loadAdminStats();
    await loadAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
};
