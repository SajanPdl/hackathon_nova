// CONFIGURATION
const ORG = 'CAPEC';
const SUPABASE_URL = 'https://lhbipoprzdfzxkkrdpnw.supabase.co';
const SUPABASE_FUNC_URL = 'https://lhbipoprzdfzxkkrdpnw.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYmlwb3ByemRmenhra3JkcG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDg1MzgsImV4cCI6MjA4MzIyNDUzOH0.fiKd-WlOPtEdY6TKVDy329_DngEL3UJg_6b36Vu5ZlQ';

const { createClient } = supabase;
window.sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UTILS: Normalize code (hyphens vs spaces)
function normalizeCode(code) {
    if (!code) return "";
    return code.trim().toUpperCase().replace(/\s+/g, '-');
}

// STATE
let currentUser = null;
let currentAttendance = null;
let html5QrcodeScanner = null;

// DOM ELEMENTS
const views = {
    login: document.getElementById('view-login'),
    loading: document.getElementById('view-loading'),
    dashboard: document.getElementById('view-dashboard'),
    task: document.getElementById('view-task')
};
const manualCodeInput = document.getElementById('manual-code');
const loginForm = document.getElementById('login-form');
const taskForm = document.getElementById('task-form');
const historyList = document.getElementById('history-items');
const sessionTimer = document.getElementById('session-timer');
const toastContainer = document.getElementById('toast-container');

// INIT
document.addEventListener('DOMContentLoaded', () => {
    // Check if HTTPS (required for Camera)
    if (location.hostname !== 'localhost' && location.protocol !== 'https:') {
        showToast("⚠️ Camera requires HTTPS or Localhost. You may need to deploy this site or use a tunnel.", 10000);
    }

    checkRestoreSession();
    document.getElementById('btn-start-scan').addEventListener('click', startScanner);
    document.getElementById('btn-view-qr')?.addEventListener('click', showMyQR);
});

// NAVIGATION
function showView(viewName) {
    Object.values(views).forEach(el => el.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
}

function startScanner() {
    document.getElementById('btn-start-scan').style.display = 'none';
    document.getElementById('qr-reader').style.display = 'block';

    html5QrcodeScanner = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch(err => {
        console.error("Camera start failed", err);
        document.getElementById('scan-error').textContent = "Camera access denied or error. Use manual code.";
        document.getElementById('btn-start-scan').style.display = 'block'; // Show button again on fail
    });
}

function onScanSuccess(decodedText, decodedResult) {
    // Format: VOL|ORG|CODE
    console.log(`Scan result: ${decodedText}`);
    try {
        const parts = decodedText.split('|');
        if (parts.length === 3 && parts[0] === 'VOL') {
            const [_, scanOrg, code] = parts;
            if (scanOrg !== ORG) {
                showToast(`Invalid Organization. This is the ${ORG} portal.`);
                return;
            }
            handleCheckIn(code);
            html5QrcodeScanner.stop();
        } else {
            showToast("Invalid QR Code Format");
        }
    } catch (e) {
        console.error(e);
        showToast("Error parsing QR code");
    }
}

// LOGIC
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = manualCodeInput.value.toUpperCase();
    if(code.length < 3) return;
    handleCheckIn(code);
});

async function handleCheckIn(rawCode) {
    const code = normalizeCode(rawCode);
    showToast("Checking in...", 10000);
    try {
        const res = await fetch(`${SUPABASE_FUNC_URL}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: code,
                device_id: 'mobile-web',
                client_ts: new Date().toISOString(),
                org: ORG
            })
        });
        const data = await res.json();
        
        if (data.success) {
            currentUser = { unique_code: code }; // [FIX] Initialize with correct key
            currentAttendance = data.data;
            localStorage.setItem('volunteer_code', code); // [PERSISTENCE]
            await loadVolunteerData(code);
            showView('dashboard');
            showToast("Check-in Successful!");
        } else {
            // Check if already checked in, maybe restore session?
            if (data.error === 'Already checked in') {
                // Try to restore
                currentUser = { unique_code: code }; // [FIX] Initialize with correct key
                localStorage.setItem('volunteer_code', code); // [PERSISTENCE]
                await loadVolunteerData(code);
                showView('dashboard');
                showToast("Restored active session");
            } else {
                showToast(data.error || "Check-in failed");
            }
        }
    } catch (e) {
        showToast(`Network Error: ${e.message}`, 5000);
        console.error("Full Checkin Error:", e);
        alert("Network Error: check console. Ensure Edge Functions are deployed and SUPABASE_URL is correct.");
    }
}

async function loadVolunteerData(code) {
    try {
        const res = await fetch(`${SUPABASE_FUNC_URL}/volunteer?code=${code}&org=${ORG}`);
        const data = await res.json();
        if (data.success) {
            currentUser = data.data.volunteer;
            console.log("LOGGED IN AS:", currentUser.name, "CODE:", currentUser.unique_code);
            document.getElementById('user-name').textContent = currentUser.name;
            
            const img = document.getElementById('user-profile-img');
            const avatar = document.getElementById('user-avatar');
            if (currentUser.profile_image_url) {
                img.src = currentUser.profile_image_url;
                img.style.display = 'block';
                avatar.style.display = 'none';
            } else {
                img.style.display = 'none';
                avatar.style.display = 'flex';
            }

            await loadVolunteerRank(code);
            
            // Check for open attendance
            const openAtt = data.data.attendance.find(a => !a.exit_time);
            if (openAtt) {
                currentAttendance = openAtt;
                startTimer(new Date(openAtt.entry_time)); // Fix: Pass Date object
            } else {
                // If we are on dashboard but no open attendance, user effectively checked out? 
                // Wait, if we just checked in, we should have it. 
                // If we are restoring, and no open attendance, maybe redirect to login?
                // For now, assume if we loaded data, we are 'logged in' as that volunteer, 
                // but if not clocked in, show "Clock In" button? 
                // Requirement says "Check-in flow: after successful checkin... display buttons Log Task and Leave Venue".
                // So if not checked in, we should probably be on login screen.
            }

            renderHistory(data.data.attendance, data.data.tasks);
        }
    } catch (e) {
        console.error(e);
    }
}

// TASK LOGGING
document.getElementById('btn-log-task').addEventListener('click', () => {
    showView('task');
});
document.getElementById('btn-back-task').addEventListener('click', () => {
    showView('dashboard');
});

taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(taskForm);
    const payload = {
        code: currentUser.unique_code,
        title: formData.get('title'),
        category: formData.get('category'),
        description: formData.get('description'),
        time_spent_minutes: formData.get('minutes'),
        org: ORG, // [FIX] Required for table routing
        client_ts: new Date().toISOString()
    };

    try {
        const res = await fetch(`${SUPABASE_FUNC_URL}/task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showToast("Task Logged!");
            taskForm.reset();
            showView('dashboard');
            // Reload history
            loadVolunteerData(currentUser.unique_code);
        } else {
            showToast(data.error || "Failed to log task");
        }
    } catch (e) {
        showToast("Error logging task");
    }
});

// CHECKOUT
document.getElementById('btn-checkout').addEventListener('click', async () => {
    if (!confirm("Are you sure you want to clock out?")) return;

    try {
        const res = await fetch(`${SUPABASE_FUNC_URL}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: currentUser.unique_code,
                device_id: 'mobile-web',
                client_ts: new Date().toISOString(),
                org: ORG
            })
        });
        const data = await res.json();
        if (data.success) {
            showToast("Clocked Out. Goodbye!");
            localStorage.removeItem('volunteer_code'); // [PERSISTENCE]
            setTimeout(() => location.reload(), 2000);
        } else {
            showToast(data.error || "Checkout failed");
        }
    } catch (e) {
        showToast("Error checking out");
    }
});


// UTILS
function showToast(msg, duration=3000) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastContainer.appendChild(el);
    setTimeout(() => el.remove(), duration);
}

function renderHistory(attendance, tasks) {
    historyList.innerHTML = '';
    
    // Combine and sort (with null safety)
    const items = [
        ...(attendance || []).map(a => ({ type: 'attendance', date: a.entry_time, data: a })),
        ...(tasks || []).map(t => ({ type: 'task', date: t.created_at, data: t }))
    ].sort((a,b) => new Date(b.date) - new Date(a.date));

    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        
        let content = '';
        if (item.type === 'attendance') {
            const duration = item.data.duration_minutes ? `${item.data.duration_minutes}m` : 'Active';
            content = `
                <div>
                    <strong>Shift</strong> <small>${new Date(item.date).toLocaleTimeString()}</small>
                    <div class="meta">${duration}</div>
                </div>
                <div class="status status-${(item.data.status || 'pending').toLowerCase()}">${item.data.status || 'pending'}</div>
            `;
        } else {
            content = `
                <div>
                    <strong>${item.data.title}</strong>
                    <div class="meta">${item.data.time_spent_minutes}m • ${item.data.category}</div>
                </div>
                <div class="status status-${(item.data.status || 'pending').toLowerCase()}">${item.data.status || 'pending'}</div>
            `;
        }
        
        li.innerHTML = content;
        historyList.appendChild(li);
    });
}

let timerInterval;
function startTimer(startTime) {
    if (timerInterval) clearInterval(timerInterval);
    const display = document.getElementById('session-timer');
    
    function update() {
        if (!startTime) return; // Guard
        const now = new Date();
        const diff = Math.floor((now - startTime) / 1000);
        const hrs = Math.floor(diff / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        display.textContent = `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
    }
    
    update();
    timerInterval = setInterval(update, 60000);
}

function checkRestoreSession() {
    // 1. Check URL for code (priority from landing page scan)
    const urlParams = new URLSearchParams(window.location.search);
    const urlCode = urlParams.get('code');
    
    if (urlCode && urlCode.trim() !== '') {
        const normalizedCode = normalizeCode(urlCode);
        console.log("Auto-login via URL code:", normalizedCode);
        
        // Show loading state immediately
        showView('loading');
        
        // Clean URL immediately
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // Save to storage for future sessions
        localStorage.setItem('volunteer_code', normalizedCode);
        
        handleCheckIn(normalizedCode);
        return;
    }

    // 2. Fallback to localStorage
    const savedCode = localStorage.getItem('volunteer_code');
    if (savedCode) {
        console.log("Restoring session for:", savedCode);
        handleCheckIn(savedCode);
    }
}
async function loadVolunteerRank(code) {
    const { data: stats } = await window.sb.from('volunteer_stats_capec').select('rank').eq('unique_code', code).single();
    const rankEl = document.getElementById('user-rank');
    if (rankEl && stats) {
        rankEl.textContent = `Rank: #${stats.rank}`;
    }
}

window.showFullHistory = async () => {
    const code = localStorage.getItem('volunteer_code');
    if (!code) return;

    // Fetch all attendance and tasks
    const [{ data: att }, { data: tsk }] = await Promise.all([
        window.sb.from('attendance_capec').select('*').eq('unique_code', code).order('entry_time', { ascending: false }),
        window.sb.from('tasks_capec').select('*').eq('unique_code', code).order('created_at', { ascending: false })
    ]);

    const items = [
        ...(att || []).map(a => ({ ...a, type: 'attendance' })),
        ...(tsk || []).map(t => ({ ...t, type: 'task' }))
    ].sort((a, b) => new Date(b.created_at || b.entry_time) - new Date(a.created_at || a.entry_time));

    const list = document.getElementById('history-items-full');
    list.innerHTML = items.map(item => `
        <li class="history-item">
            <div class="item-icon">${item.type === 'attendance' ? '🕒' : '🛠️'}</div>
            <div class="item-info">
                <div class="item-title">${item.type === 'attendance' ? 'Shift' : (item.title || 'Task')}</div>
                <div class="item-meta">${new Date(item.created_at || item.entry_time).toLocaleDateString()} • ${item.duration_minutes || 0}m • ${item.status}</div>
            </div>
        </li>
    `).join('');

    document.getElementById('modal-history').classList.remove('hidden');
};

window.closeHistory = () => {
    document.getElementById('modal-history').classList.add('hidden');
};

// QR CODE DISPLAY
function showMyQR() {
    if (!currentUser) return;
    
    const modal = document.getElementById('modal-qr');
    const qrDisplay = document.getElementById('qr-display');
    const qrText = document.getElementById('qr-code-text');
    
    // Clear previous QR
    qrDisplay.innerHTML = '';
    
    // Generate QR Code
    const qrData = `VOL|${ORG}|${currentUser.unique_code}`;
    new QRCode(qrDisplay, {
        text: qrData,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff"
    });
    
    qrText.textContent = currentUser.unique_code;
    modal.classList.remove('hidden');
}

window.closeQRModal = () => {
    document.getElementById('modal-qr').classList.add('hidden');
};
