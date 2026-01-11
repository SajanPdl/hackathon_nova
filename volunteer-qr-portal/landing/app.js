// ========================================
// CONFIGURATION & STATE
// ========================================

let detectedOrg = null;
let html5QrCode = null;
let isScanning = false;
let feedbackTimeout = null;

const SUPABASE_FUNC_URL = 'https://lhbipoprzdfzxkkrdpnw.supabase.co/functions/v1';

// DOM Elements
const elements = {
    orgBadge: document.getElementById('org-badge'),
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    participantCard: document.getElementById('participant-card'),
    manualModal: document.getElementById('manual-modal'),
    manualForm: document.getElementById('manual-form'),
    manualCodeInput: document.getElementById('manual-code'),
    loadingOverlay: document.getElementById('loading-overlay'),
    cameraWarning: document.getElementById('camera-warning')
};

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    detectOrganization();
    initScanner();
    setupListeners();
});

function detectOrganization() {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('capec')) {
        detectedOrg = 'CAPEC';
    } else if (hostname.includes('itecpec') || hostname.includes('itec')) {
        detectedOrg = 'ITECPEC';
    } else {
        detectedOrg = 'BOTH';
    }
    
    elements.orgBadge.textContent = detectedOrg === 'BOTH' ? 'UNIVERSAL' : detectedOrg;
    elements.orgBadge.className = `badge ${detectedOrg.toLowerCase()}`;
}

function setupListeners() {
    // Manual Scan Toggle
    document.getElementById('btn-manual-scan').onclick = () => elements.manualModal.classList.remove('hidden');
    document.getElementById('btn-close-manual').onclick = () => elements.manualModal.classList.add('hidden');
    
    // Enable Camera Button (Fallback)
    document.getElementById('btn-enable-camera').onclick = () => initScanner();

    // Manual Form Submit
    elements.manualForm.onsubmit = (e) => {
        e.preventDefault();
        const code = elements.manualCodeInput.value.trim().toUpperCase();
        if (code) {
            elements.manualModal.classList.add('hidden');
            processCheckIn(code, detectedOrg === 'BOTH' ? 'ITECPEC' : detectedOrg);
        }
    };
}

// ========================================
// SCANNER LOGIC
// ========================================

async function initScanner() {
    updateUIStatus('idle', 'Ready to Scan');
    
    // Create clear instance
    if (html5QrCode) {
        try { await html5QrCode.stop(); } catch(e) {}
    }
    
    html5QrCode = new Html5Qrcode("qr-reader");
    
    const config = { 
        fps: 30, // Higher FPS for faster detection
        qrbox: { width: 280, height: 280 }, // Slightly larger box for easier alignment
        aspectRatio: 1.0,
        rememberLastUsedCamera: true
    };

    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess
        );
        isScanning = true;
        elements.cameraWarning.classList.add('hidden');
    } catch (err) {
        console.error("Camera Error:", err);
        elements.cameraWarning.classList.remove('hidden');
        updateUIStatus('error', 'Camera Error');
    }
}

function onScanSuccess(decodedText) {
    if (!isScanning) return; // Prevent double scans
    
    // Haptic Feedback (Vibration)
    if (navigator.vibrate) navigator.vibrate(100);
    
    // Visual Feedback
    updateUIStatus('scanning', 'Reading QR...');
    
    // Stop scanning to process
    isScanning = false;
    
    try {
        const parts = decodedText.split('|');
        if (parts.length === 3 && parts[0] === 'VOL') {
            const [_, org, code] = parts;
            processCheckIn(code, org);
        } else {
            handleError('Invalid QR Format');
        }
    } catch (e) {
        handleError('Scan Error');
    }
}

// ========================================
// CHECK-IN PROCESSING
// ========================================

async function processCheckIn(code, org) {
    elements.loadingOverlay.classList.remove('hidden');
    
    try {
        const res = await fetch(`${SUPABASE_FUNC_URL}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code,
                device_id: 'web-landing',
                client_ts: new Date().toISOString(),
                org: org
            })
        });
        
        const data = await res.json();
        elements.loadingOverlay.classList.add('hidden');

        if (data.success || data.error === 'Already checked in') {
            const isRestored = data.error === 'Already checked in';
            handleSuccess(code, org, isRestored, data.participant);
        } else {
            handleError(data.error || 'Check-in failed');
        }
    } catch (e) {
        elements.loadingOverlay.classList.add('hidden');
        handleError('Network Error');
    }
}

// ========================================
// UI FEEDBACK TRIGGERS
// ========================================

function updateUIStatus(state, message) {
    elements.statusIndicator.className = `status-indicator ${state}`;
    elements.statusText.textContent = message;
}

function handleSuccess(code, org, isRestored, participant = {}) {
    updateUIStatus('success', isRestored ? 'Already Checked-In' : 'Check-In Successful');
    
    // Save session for the portal to pick up
    localStorage.setItem('volunteer_code', code);

    // Show Participant Card
    showParticipantCard({
        name: participant.name || 'Volunteer',
        // Fallback: If no specific team is defined, show the Organization (CAPEC/ITECPEC) as the Team
        team: participant.team || org || 'N/A',
        role: participant.role || 'Volunteer',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    
    // Redirect to appropriate portal on subdomains after 1 second (Faster transition)
    if (feedbackTimeout) clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => {
        const subdomain = org.toLowerCase() === 'capec' ? 'capec' : 'itecpec';
        window.location.replace(`https://${subdomain}.hackathon-nova.com/?code=${code}`);
    }, 1000);
}

function handleError(message) {
    updateUIStatus('error', message);
    if (feedbackTimeout) clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => {
        resetUI();
    }, 2500);
}

function showParticipantCard(data) {
    document.getElementById('part-name').textContent = data.name;
    document.getElementById('part-team').textContent = data.team;
    document.getElementById('part-role').textContent = data.role;
    document.getElementById('part-time').textContent = data.time;
    
    elements.participantCard.classList.remove('hidden');
    // Force reflow for animation
    elements.participantCard.offsetHeight; 
    elements.participantCard.classList.add('active');
}

function resetUI() {
    elements.participantCard.classList.remove('active');
    setTimeout(() => {
        elements.participantCard.classList.add('hidden');
    }, 400);
    
    updateUIStatus('idle', 'Ready to Scan');
    isScanning = true; // Resume scanning
}
