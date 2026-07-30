// Emergency Access JS Module
let currentPatient = null;
let currentLanguage = 'en';

const translations = {
  en: {
    title: "Emergency Medical Profile",
    subtitle: "Verify medical lifeline details instantly",
    bloodGroup: "Blood Group",
    allergies: "Allergies",
    medications: "Current Medications",
    conditions: "Medical Conditions",
    contacts: "Emergency Contacts",
    callContact: "Call Contact",
    privateMessage: "This profile is private. Rescuer access is restricted.",
    age: "Age",
    gender: "Gender",
    phone: "Phone Number",
    address: "Location",
    emergencyBadge: "EMERGENCY ACCESS READY"
  },
  hi: {
    title: "आपातकालीन चिकित्सा प्रोफ़ाइल",
    subtitle: "चिकित्सा जीवन रेखा विवरण तुरंत सत्यापित करें",
    bloodGroup: "रक्त समूह",
    allergies: "एलर्जी",
    medications: "वर्तमान दवाएं",
    conditions: "स्वास्थ्य स्थितियां",
    contacts: "आपातकालीन संपर्क",
    callContact: "कॉल करें",
    privateMessage: "यह प्रोफ़ाइल निजी है। बचावकर्ता पहुंच प्रतिबंधित है।",
    age: "आयु",
    gender: "लिंग",
    phone: "फ़ोन नंबर",
    address: "पता",
    emergencyBadge: "आपातकालीन पहुंच तैयार"
  },
  kn: {
    title: "ತುರ್ತು ವೈದ್ಯಕೀಯ ವಿವರಗಳು",
    subtitle: "ವೈದ್ಯಕೀಯ ಜೀವರೇಖೆ ವಿವರಗಳನ್ನು ತಕ್ಷಣ ಪರಿಶೀಲಿಸಿ",
    bloodGroup: "ರಕ್ತದ ಗುಂಪು",
    allergies: "ಅಲರ್ಜಿಗಳು",
    medications: "ಪ್ರಸ್ತುತ ಔಷಧಿಗಳು",
    conditions: "ಆರೋಗ್ಯ ಸ್ಥಿತಿಗಳು",
    contacts: "ತುರ್ತು ಸಂಪರ್ಕಗಳು",
    callContact: "ಕರೆ ಮಾಡಿ",
    privateMessage: "ಈ ಪ್ರೊಫೈಲ್ ಖಾಸಗಿಯಾಗಿದೆ. ರಕ್ಷಕ ಪ್ರವೇಶವನ್ನು ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ.",
    age: "ವಯಸ್ಸು",
    gender: "ಲಿಂಗ",
    phone: "ದೂರವಾಣಿ ಸಂಖ್ಯೆ",
    address: "ವಿಳಾಸ",
    emergencyBadge: "ತುರ್ತು ಪ್ರವೇಶ ಸಿದ್ಧವಾಗಿದೆ"
  },
  ta: {
    title: "அவசர மருத்துவ சுயவிவரம்",
    subtitle: "மருத்துவ விவரங்களை உடனடியாக சரிபார்க்கவும்",
    bloodGroup: "இரத்த வகை",
    allergies: "ஒவ்வாமைகள்",
    medications: "தற்போதைய மருந்துகள்",
    conditions: "மருத்துவ நிலைமைகள்",
    contacts: "அவசர தொடர்புகள்",
    callContact: "அழைக்க",
    privateMessage: "இந்த சுயவிவரம் தனிப்பட்டது. மீட்பர் அணுகல் வரையறுக்கப்பட்டுள்ளது.",
    age: "வயது",
    gender: "பாலினம்",
    phone: "தொலைபேசி எண்",
    address: "முகவரி",
    emergencyBadge: "அவசர அணுகல் தயார்"
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const pathToken = pathParts[pathParts.length - 1];
  const token = (pathToken && pathToken !== 'emergency_access.html' && pathToken !== 'e')
    ? pathToken
    : (urlParams.get('token') || urlParams.get('id'));

  if (!token) {
    showToast('Invalid Access URL: emergency token missing', 'error');
    document.getElementById('emergencyDetailsCard').innerHTML = `
      <div class="text-center p-8 bg-red-50 text-red-800 rounded-3xl border border-red-200">
        <span class="material-symbols-outlined text-4xl">warning</span>
        <p class="font-bold mt-2">Error: QR ID not supplied.</p>
        <p class="text-xs mt-1 text-gray-500">Scan a valid LifeQR card to view medical information.</p>
      </div>
    `;
    return;
  }

  await fetchEmergencyProfile(token);

  // Setup Language Selector Change Listener
  document.getElementById('languageSelector').addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    translateLabels();
  });
});

async function fetchEmergencyProfile(token) {
  try {
    const response = await fetch(`/api/v1/emergency-access/${token}`);
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || 'Failed to fetch medical details');

    currentPatient = data;
    renderEmergencyDetails();
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('emergencyDetailsCard').innerHTML = `
      <div class="text-center p-8 bg-red-50 text-red-800 rounded-3xl border border-red-200">
        <span class="material-symbols-outlined text-4xl">error</span>
        <p class="font-bold mt-2">Error: Patient details unavailable.</p>
        <p class="text-xs mt-1 text-gray-500">${err.message}</p>
      </div>
    `;
  }
}

function renderEmergencyDetails() {
  const container = document.getElementById('emergencyDetailsCard');
  const patientName = currentPatient.firstName || currentPatient.name || 'Patient';
  const photo = currentPatient.photo ? `/api/v1/emergency-access/${window.location.pathname.split('/').filter(Boolean).pop()}/photo` : 'https://www.w3schools.com/howto/img_avatar.png';
  const allergies = currentPatient.allergies?.join ? currentPatient.allergies.join(', ') : (currentPatient.allergies || 'None');
  const medications = currentPatient.currentMedications?.join ? currentPatient.currentMedications.join(', ') : (currentPatient.currentMedications || currentPatient.medications || 'None');
  const conditions = currentPatient.medicalConditions?.join ? currentPatient.medicalConditions.join(', ') : (currentPatient.medicalConditions || currentPatient.healthIssues || 'None');
  
  let sensitiveDetailsHTML = `
    <div class="grid md:grid-cols-3 gap-4">
      <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
        <p class="text-[10px] text-gray-400 font-bold uppercase" id="lblAllergies">${translations[currentLanguage].allergies}</p>
        <p class="text-sm font-semibold text-gray-800 mt-1">${allergies}</p>
      </div>
      <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
        <p class="text-[10px] text-gray-400 font-bold uppercase" id="lblMedications">${translations[currentLanguage].medications}</p>
        <p class="text-sm font-semibold text-gray-800 mt-1">${medications}</p>
      </div>
      <div class="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
        <p class="text-[10px] text-gray-400 font-bold uppercase" id="lblConditions">${translations[currentLanguage].conditions}</p>
        <p class="text-sm font-semibold text-gray-800 mt-1">${conditions}</p>
      </div>
    </div>
  `;

  // Render multiple emergency contacts
  let contactsHTML = '';
  const contacts = currentPatient.emergencyContacts || [];
  
  if (contacts.length === 0) {
    contactsHTML = `<p class="text-xs text-gray-500 italic text-center py-2">No emergency contacts registered.</p>`;
  } else {
    contactsHTML = `<div class="space-y-3">`;
    contacts.forEach((c, index) => {
      contactsHTML += `
        <div class="p-3 bg-red-50/50 border border-red-100 rounded-xl flex justify-between items-center">
          <div>
            <p class="text-xs font-bold text-gray-800">${c.name} (${c.relationship})</p>
            <p class="text-[11px] text-gray-500">${c.phone}</p>
          </div>
          <a href="tel:${c.phone}" class="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">phone</span>
            <span class="btn-call-text">${translations[currentLanguage].callContact}</span>
          </a>
        </div>
      `;
    });
    contactsHTML += `</div>`;
  }

  container.innerHTML = `
    <!-- Top badge & Print triggers -->
    <div class="flex justify-between items-center mb-6 no-print">
      <span class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold" id="lblEmergencyBadge">
        ${translations[currentLanguage].emergencyBadge}
      </span>
      <button onclick="window.print()" class="text-xs text-gray-500 hover:text-purple-600 font-semibold transition flex items-center gap-1">
        <span class="material-symbols-outlined text-sm">print</span> Print Profile
      </button>
    </div>

    <!-- Patient Header Card -->
    <div class="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
      <img src="${photo}" class="w-16 h-16 rounded-full object-cover border-2 border-red-200">
      <div>
        <h3 class="font-headline text-2xl font-bold text-gray-900">${patientName}</h3>
        <p class="text-xs text-gray-500 font-mono">Emergency Credential</p>
      </div>
    </div>

    <!-- Vitals Block -->
    <div class="grid grid-cols-3 gap-4 text-center bg-red-50/50 p-4 border border-red-100 rounded-2xl mb-6">
      <div>
        <p class="text-[10px] text-red-500 font-bold uppercase" id="lblBloodGroup">${translations[currentLanguage].bloodGroup}</p>
        <p class="text-xl font-extrabold text-red-600 mt-1">${currentPatient.bloodGroup || 'N/A'}</p>
      </div>
      <div>
        <p class="text-[10px] text-gray-400 font-bold uppercase" id="lblAge">${translations[currentLanguage].age}</p>
        <p class="text-sm font-bold text-gray-800 mt-2">${currentPatient.age || 'N/A'}</p>
      </div>
      <div>
        <p class="text-[10px] text-gray-400 font-bold uppercase" id="lblGender">${translations[currentLanguage].gender}</p>
        <p class="text-sm font-bold text-gray-800 mt-2 capitalize">${currentPatient.gender || 'N/A'}</p>
      </div>
    </div>

    <!-- Sensitive Fields Container -->
    <div class="mb-6">
      ${sensitiveDetailsHTML}
    </div>

    <!-- Contacts list -->
    <div class="border-t border-gray-100 pt-6">
      <h4 class="font-headline font-bold text-gray-800 mb-4" id="lblContacts">${translations[currentLanguage].contacts}</h4>
      ${contactsHTML}
    </div>
  `;
}

function translateLabels() {
  if (!currentPatient) return;
  
  // Re-render template to map correct translated words
  renderEmergencyDetails();
  
  // Update header text elements
  document.getElementById('mainTitle').textContent = translations[currentLanguage].title;
  document.getElementById('mainSubtitle').textContent = translations[currentLanguage].subtitle;
}
