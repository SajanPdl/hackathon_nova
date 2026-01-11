const SUPABASE_URL = 'https://lhbipoprzdfzxkkrdpnw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYmlwb3ByemRmenhra3JkcG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDg1MzgsImV4cCI6MjA4MzIyNDUzOH0.fiKd-WlOPtEdY6TKVDy329_DngEL3UJg_6b36Vu5ZlQ'; 
// No, Admin Panel should use Anon Key + Login. Access is controlled by RLS policies 
// where "auth.role() = 'authenticated'".
// So we use standard Auth flow. Admin users must be created in Supabase Auth.

const ADMIN_ORG = 'ITECPEC';
const SUFFIX = 'itecpec';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// STATE
let user = null;
let activeTab = 'dashboard';
let currentDetailVolId = null;

window.openEditModalFromDetail = () => {
    if (currentDetailVolId) openEditModal(currentDetailVolId);
};

// DOM
const views = {
    login: document.getElementById('auth-overlay'),
    dashboard: document.getElementById('view-dashboard'),
    approvals: document.getElementById('view-approvals'),
    volunteers: document.getElementById('view-volunteers'),
    leaderboard: document.getElementById('view-leaderboard'),
    'daily-activity': document.getElementById('view-daily-activity'),
    devices: document.getElementById('view-devices'),
    reports: document.getElementById('view-reports'),
    scan: document.getElementById('view-scan')
};

// INIT
document.addEventListener('DOMContentLoaded', async () => {
    // Check session    
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        user = session.user;
        showApp();
    } else {
        views.login.classList.remove('hidden'); // Ensure overlay is visible
    }

    // Bind Nav
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(btn.dataset.view);
        });
    });

    // Login
    document.getElementById('btn-login-email').addEventListener('click', handleLogin);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // Mobile Menu Toggle
    document.getElementById('menu-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // Check for WhatsApp Action Token
    checkWhatsAppToken();

    if (user) {
        showApp();
    }
});

async function handleLogin(e) {
    if(e) e.preventDefault();
    
    // Email/Password login
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('auth-error');

    if (!email || !password) {
        errorEl.textContent = "Please enter email and password";
        errorEl.style.display = 'block';
        return;
    }

    errorEl.textContent = "Logging in...";
    errorEl.style.display = 'block';
    errorEl.style.color = '#666';

    const { data, error } = await sb.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        errorEl.textContent = error.message;
        errorEl.style.color = 'red';
    } else {
        user = data.user;
        errorEl.style.display = 'none';
        showApp();
    }
}
async function handleLogout() {
    await sb.auth.signOut();
    window.location.reload();
}

// --- WHATSAPP ACTION HANDLERS ---
async function checkWhatsAppToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('t');
    if (!token) return;

    try {
        // Show loading state
        document.getElementById('modal-action-confirm').classList.remove('hidden');
        document.getElementById('action-vol-name').textContent = "Fetching details...";
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/action-page?t=${token}`);
        const data = await response.json();

        if (!data.success) {
            alert("This link is invalid or has expired.");
            closeModal('modal-action-confirm');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        // Populate Modal
        document.getElementById('action-vol-name').textContent = data.volunteer?.name || "Unknown Volunteer";
        document.getElementById('action-type-label').textContent = data.token?.action_type?.replace(/_/g, ' ').toUpperCase() || "ACTION";
        
        // Save token for submission
        window.activeActionToken = token;
        
    } catch (err) {
        console.error("Token error:", err);
        closeModal('modal-action-confirm');
    }
}

window.submitWhatsAppAction = async (action) => {
    const token = window.activeActionToken;
    const note = document.getElementById('action-admin-note').value;
    
    if (!token) return;

    try {
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = "Processing...";
        btn.disabled = true;

        const response = await fetch(`${SUPABASE_URL}/functions/v1/action-apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                action: action,
                notes: note
            })
        });

        const result = await response.json();
        
        if (result.success) {
            alert(`Success: Request ${action}d!`);
            closeModal('modal-action-confirm');
            // Clear URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // Refresh dashboard if logged in
            if (user) loadDashboard();
        } else {
            alert("Error: " + result.error);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } catch (err) {
        alert("System error. Please try again later.");
        console.error(err);
    }
};

function showApp() {
    views.login.classList.add('hidden');
    // Fix ID mapping
    const emailEl = document.getElementById('user-email');
    const initialsEl = document.getElementById('user-initials');
    if(emailEl) emailEl.textContent = user.email;
    if(initialsEl) initialsEl.textContent = user.email[0].toUpperCase();

    // Init realtime if needed
    if(typeof setupRealtime === 'function') setupRealtime();

    switchTab('dashboard');
}

function switchTab(tab) {
    console.log("Switching to tab:", tab);
    activeTab = tab;
    // UI Update
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.nav-item[data-view="${tab}"]`);
    if(activeBtn) activeBtn.classList.add('active');
    
    // View Switch
    Object.values(views).forEach(v => {
        if (!v.classList.contains('overlay')) v.classList.add('hidden');
    });
    if(views[tab]) views[tab].classList.remove('hidden');

    // Load Data
    if (tab === 'dashboard') loadDashboard();
    if (tab === 'approvals') loadApprovals();
    if (tab === 'volunteers') loadVolunteers();
    if (tab === 'leaderboard') loadLeaderboard();
    if (tab === 'daily-activity') loadDailyActivity();
    if (tab === 'reports') loadDailyLogs();
    if (tab === 'devices') loadDevices();
}

// --- DATA LOADERS ---

async function loadDashboard() {
    // Stats
    const { count: activeCount } = await sb.from('attendance_itecpec').select('id', { count: 'exact' }).is('exit_time', null);
    const { count: pendingCount } = await sb.from('attendance_itecpec').select('id', { count: 'exact' }).eq('status', 'pending');
    // For tasks pending, separate? Combined pending
    const { count: pendingTasks } = await sb.from('tasks_itecpec').select('id', { count: 'exact' }).eq('status', 'pending');
    
    document.getElementById('stat-active').textContent = activeCount || 0;
    document.getElementById('stat-pending').textContent = (pendingCount || 0) + (pendingTasks || 0);

    // Calculate Total Hours (Approved only)
    const { data: hrData } = await sb.from('attendance_itecpec').select('duration_minutes').eq('status', 'approved');
    const totalMinutes = (hrData || []).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
    document.getElementById('stat-hours').textContent = (totalMinutes / 60).toFixed(1);

    // Recent Activity (Audit Log)
    const { data: logs, error: logError } = await sb.from('audit_log').select('*').eq('org', ADMIN_ORG).order('created_at', { ascending: false }).limit(10);
    
    if (logError) {
        console.error("Audit log fetch failed:", logError);
    }
    
    const list = document.getElementById('activity-list');
    if (list) {
         if (logError) {
             list.innerHTML = `<li class="activity-item" style="color:red; justify-content:center;">Error: ${logError.message}</li>`;
             return;
         }
         if (!logs || logs.length === 0) {
             list.innerHTML = '<li class="activity-item" style="justify-content:center; opacity:0.6;">No recent activity</li>';
         } else {
             list.innerHTML = logs.map(l => {
                 const time = new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                 let icon = '📝';
                 let colorClass = 'activity-default';
                 
                 const actionRaw = l.action || '';
                 const action = actionRaw.toLowerCase();
                 let actionText = actionRaw;

                 if (action.includes('checkin') || action.includes('check-in')) { 
                     icon = '📥'; colorClass = 'activity-checkin'; 
                     actionText = 'Checked In';
                 }
                 else if (action.includes('checkout') || action.includes('check-out')) { 
                     icon = '📤'; colorClass = 'activity-checkout'; 
                     actionText = 'Checked Out';
                 }
                 else if (action.includes('task')) { 
                     icon = '🛠️'; colorClass = 'activity-task'; 
                     actionText = 'Task Logged';
                 }
                 else if (action.includes('approve')) { 
                     const isDecline = l.payload?.status === 'declined';
                     icon = isDecline ? '❌' : '✅'; 
                     colorClass = isDecline ? 'activity-declined' : 'activity-approved'; 
                     actionText = isDecline ? 'Declined' : 'Approved';
                 }

                 return `
                    <li class="activity-item ${colorClass}">
                        <span class="activity-icon">${icon}</span>
                        <div class="activity-content">
                            <div class="activity-text">${actionText}</div>
                            <div class="activity-meta">${time} • ${l.actor || 'System'}</div>
                        </div>
                    </li>
                 `;
             }).join('');
         }
    }
}

async function loadApprovals() {
    const typeFilter = document.getElementById('filter-type')?.value || 'all';
    const statusFilter = document.getElementById('filter-status')?.value || 'pending';

    // Fetch attendance
    let att = [];
    if (typeFilter === 'all' || typeFilter === 'attendance') {
        const { data } = await sb.from('attendance_itecpec').select('*, volunteers_itecpec(name)').eq('status', statusFilter);
        att = (data || []).map(a => ({ type: 'attendance', ...a, volunteer_name: a.volunteers_itecpec?.name }));
    }

    // Fetch tasks
    let tsk = [];
    if (typeFilter === 'all' || typeFilter === 'task') {
        const { data } = await sb.from('tasks_itecpec').select('*, volunteers_itecpec(name)').eq('status', statusFilter);
        tsk = (data || []).map(t => ({ type: 'task', ...t, volunteer_name: t.volunteers_itecpec?.name }));
    }

    const tbody = document.querySelector('#approvals-table tbody');
    tbody.innerHTML = '';

    const items = [...att, ...tsk].sort((a,b) => new Date(b.created_at || b.entry_time) - new Date(a.created_at || a.entry_time));

    items.forEach(item => {
        const row = document.createElement('tr');
        const isPending = item.status === 'pending';
        row.innerHTML = `
            <td><span class="badge" style="background:${item.type==='task'?'#3b82f6':'#f59e0b'}">${item.type}</span></td>
            <td>${item.volunteer_name || item.unique_code}</td>
            <td>${item.description || (item.entry_time ? 'Shift' : 'Task')}</td>
            <td>${new Date(item.created_at || item.entry_time).toLocaleString()}</td>
            <td>
                ${isPending ? `
                    <div style="display:flex; gap:5px;">
                        <button class="btn success small" onclick="approve('${item.id}', '${item.type}')">Accept</button>
                        <button class="btn danger small" onclick="decline('${item.id}', '${item.type}')">Decline</button>
                        <button class="btn whatsapp small" style="background:#25D366; color:white;" onclick="sendWhatsAppApproval('${item.id}', '${item.type}', '${item.volunteer_name || item.unique_code}')">WA</button>
                    </div>
                ` : `<span class="badge status-${item.status.toLowerCase()}">${item.status}</span>`}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Update Badge (show pending count only)
    const { count: pendingAtt } = await sb.from('attendance_itecpec').select('id', { count: 'exact' }).eq('status', 'pending');
    const { count: pendingTsk } = await sb.from('tasks_itecpec').select('id', { count: 'exact' }).eq('status', 'pending');
    const badge = document.getElementById('badge-approvals');
    if(badge) {
        badge.textContent = (pendingAtt || 0) + (pendingTsk || 0);
        badge.style.display = (pendingAtt + pendingTsk) > 0 ? 'inline-block' : 'none';
    }
}

async function loadLeaderboard() {
    const { data: stats, error } = await sb.from('volunteer_stats_itecpec').select('*').order('total_minutes', { ascending: false });
    const tbody = document.querySelector('#leaderboard-table tbody');
    if (!tbody) return;
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Error: ${error.message}</td></tr>`;
        return;
    }

    tbody.innerHTML = (stats || []).map((s, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:600;">${s.name}</td>
            <td>${(s.total_minutes / 60).toFixed(1)}h</td>
            <td>${s.tasks_completed}</td>
        </tr>
    `).join('');
}

window.approve = async (id, type) => {
    await callEdge('approve', { id, type, status: 'approved', approved_by: user.email, org: 'ITECPEC' });
    loadApprovals();
};

window.decline = async (id, type) => {
    const note = prompt("Reason for decline?");
    if (note === null) return;
    await callEdge('approve', { id, type, status: 'declined', note, approved_by: user.email, org: 'ITECPEC' });
    loadApprovals();
};

window.sendWhatsAppApproval = async (target_id, type, name) => {
    try {
        const org = ADMIN_ORG;
        const target_table = type === 'attendance' ? `attendance_${SUFFIX}` : `tasks_${SUFFIX}`;
        
        // Call the edge function to generate localized token and message
        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-action-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.access_token}` // Using admin's access token
            },
            body: JSON.stringify({
                target_table,
                target_id,
                action_type: 'approve_attendance',
                volunteer_name: name,
                org: org,
                require_pin: false
            })
        });
        
        const data = await response.json();
        if (data.waLink) {
            window.open(data.waLink, '_blank');
        } else {
            alert("Failed to generate WhatsApp link: " + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error("WA Error:", err);
        alert("Error generating action link. Check Edge Function logs.");
    }
};

async function loadVolunteers() {
     const { data } = await sb.from('volunteers_itecpec').select('*').order('name');
     const tbody = document.querySelector('#volunteers-table tbody');
     tbody.innerHTML = data.map(v => `
        <tr>
            <td>${v.name}</td>
            <td>ITECPEC</td>
            <td>${v.unique_code}</td>
            <td>${v.active ? 'Active' : 'Inactive'}</td>
            <td>
                <div style="display:flex; gap:5px;">
                    <button class="btn secondary small" onclick="viewVolunteerDetail('${v.id}')">Details</button>
                    <button class="btn secondary small" onclick="viewQR('${v.name}', 'ITECPEC', '${v.unique_code}')">QR</button>
                    <button class="btn primary small" onclick="openEditModal('${v.id}')">Edit</button>
                    <button class="btn danger small" onclick="deleteVolunteer('${v.id}', '${v.name}')">Delete</button>
                </div>
            </td>
        </tr>
     `).join('');
}


window.viewVolunteerDetail = async (id) => {
    currentDetailVolId = id;
    const { data: vol } = await sb.from('volunteers_itecpec').select('*').eq('id', id).single();
    if (!vol) return;

    document.getElementById('det-vol-name').textContent = vol.name;
    
    const img = document.getElementById('det-vol-image');
    const avatar = document.getElementById('det-vol-avatar');
    if (vol.profile_image_url) {
        img.src = vol.profile_image_url;
        img.style.display = 'block';
        avatar.style.display = 'none';
    } else {
        img.style.display = 'none';
        avatar.style.display = 'flex';
    }

    document.getElementById('modal-vol-detail').classList.remove('hidden');

    // Load Stats
    const { data: stats } = await sb.from('volunteer_stats_itecpec').select('*').eq('id', id).single();
    document.getElementById('det-vol-hours').textContent = ((stats?.total_minutes || 0) / 60).toFixed(1);
    document.getElementById('det-vol-tasks').textContent = stats?.tasks_completed || 0;

    switchDetailTab('attendance');
};

window.switchDetailTab = async (type) => {
    const btnAtt = document.getElementById('btn-show-att');
    const btnTsk = document.getElementById('btn-show-tasks');
    const viewAtt = document.getElementById('det-attendance-view');
    const viewTsk = document.getElementById('det-tasks-view');

    if (type === 'attendance') {
        btnAtt.style.background = 'var(--primary)';
        btnTsk.style.background = 'rgba(255,255,255,0.05)';
        viewAtt.classList.remove('hidden');
        viewTsk.classList.add('hidden');

        const { data } = await sb.from('attendance_itecpec').select('*').eq('volunteer_id', currentDetailVolId).order('entry_time', { ascending: false });
        document.querySelector('#det-att-table tbody').innerHTML = (data || []).map(a => `
            <tr>
                <td>${new Date(a.entry_time).toLocaleString()}</td>
                <td>${a.exit_time ? new Date(a.exit_time).toLocaleString() : '---'}</td>
                <td>${a.duration_minutes || 0}m</td>
                <td><span class="badge status-${a.status}">${a.status}</span></td>
            </tr>
        `).join('');
    } else {
        btnTsk.style.background = 'var(--primary)';
        btnAtt.style.background = 'rgba(255,255,255,0.05)';
        viewTsk.classList.remove('hidden');
        viewAtt.classList.add('hidden');

        const { data } = await sb.from('tasks_itecpec').select('*').eq('volunteer_id', currentDetailVolId).order('created_at', { ascending: false });
        document.querySelector('#det-tasks-table tbody').innerHTML = (data || []).map(t => `
            <tr>
                <td>${new Date(t.created_at).toLocaleDateString()}</td>
                <td>${t.title}</td>
                <td>${t.description || ''}</td>
                <td><span class="badge status-${t.status}">${t.status}</span></td>
            </tr>
        `).join('');
    }
};

// --- MODALS ---
window.openAddVolModal = () => {
    document.getElementById('modal-add-vol').classList.remove('hidden');
};

window.closeModal = (id) => {
    document.getElementById(''+id).classList.add('hidden');
};

document.getElementById('form-add-vol').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-vol-name').value;
    const email = document.getElementById('new-vol-email').value;
    const phone = document.getElementById('new-vol-phone').value;
    const imageFile = document.getElementById('new-vol-image').files[0];
    
    let imageUrl = null;
    if (imageFile) {
        imageUrl = await uploadVolunteerImage(imageFile);
    }
    
    // Create volunteer
    const { data, error } = await sb.from('volunteers_itecpec').insert({
        name, email, phone, profile_image_url: imageUrl
    }).select().single();
    
    if (error) {
        alert("Error: " + error.message);
    } else {
        alert(`Created volunteer: ${data.name} (${data.unique_code})`);
        closeModal('modal-add-vol');
        loadVolunteers();
        e.target.reset();
    }
});

async function uploadVolunteerImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await sb.storage
        .from('volunteers')
        .upload(filePath, file);

    if (error) {
        console.error("Upload error:", error);
        return null;
    }

    const { data: { publicUrl } } = sb.storage
        .from('volunteers')
        .getPublicUrl(filePath);

    return publicUrl;
}

// --- EDIT VOLUNTEER ---
window.openEditModal = async (id) => {
    console.log("Opening Edit Modal for ID:", id);
    const { data: v, error } = await sb.from(`volunteers_${SUFFIX}`).select('*').eq('id', id).single();
    if (error) return alert("Error fetching volunteer: " + error.message);

    document.getElementById('edit-vol-id').value = v.id;
    document.getElementById('edit-vol-name').value = v.name;
    document.getElementById('edit-vol-email').value = v.email || '';
    document.getElementById('edit-vol-phone').value = v.phone || '';

    const preview = document.getElementById('edit-vol-image-preview');
    if (v.profile_image_url) {
        preview.src = v.profile_image_url;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
        preview.src = '';
    }

    document.getElementById('modal-edit-vol').classList.remove('hidden');
};

document.getElementById('form-edit-vol').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-vol-id').value;
    const name = document.getElementById('edit-vol-name').value;
    const email = document.getElementById('edit-vol-email').value;
    const phone = document.getElementById('edit-vol-phone').value;
    const imageFile = document.getElementById('edit-vol-image').files[0];

    let updateData = { name, email, phone };
    if (imageFile) {
        const imageUrl = await uploadVolunteerImage(imageFile);
        if (imageUrl) updateData.profile_image_url = imageUrl;
    }

    const { error } = await sb.from(`volunteers_${SUFFIX}`).update(updateData).eq('id', id);

    if (error) {
        alert("Error updating volunteer: " + error.message);
    } else {
        alert("Volunteer updated successfully!");
        closeModal('modal-edit-vol');
        loadVolunteers();
        // Also refresh dashboard if visible
        if (activeTab === 'dashboard') loadDashboard();
    }
});

// --- DELETE VOLUNTEER ---
window.deleteVolunteer = async (id, name) => {
    if (!confirm(`Are you sure you want to delete volunteer "${name}"? This action cannot be undone and will remove all associated attendance and task records.`)) {
        return;
    }
    
    const { error } = await sb.from(`volunteers_${SUFFIX}`).delete().eq('id', id);
    
    if (error) {
        alert("Error deleting volunteer: " + error.message);
    } else {
        alert(`Volunteer "${name}" has been deleted successfully.`);
        loadVolunteers();
        if (activeTab === 'dashboard') loadDashboard();
        if (activeTab === 'leaderboard') loadLeaderboard();
    }
};

// --- QR VIEW ---
window.viewQR = (name, org, code) => {
    document.getElementById('modal-view-qr').classList.remove('hidden');
    document.getElementById('qr-vol-name').textContent = name;
    document.getElementById('qr-vol-code').textContent = code;
    
    const container = document.getElementById('qr-display');
    container.innerHTML = ''; // clear previous
    container.style.background = '#ffffff';
    container.style.padding = '15px';
    container.style.borderRadius = '8px';
    container.style.display = 'inline-block';
    
    const qrData = `VOL|${org}|${code}`;
    new QRCode(container, {
        text: qrData,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff"
    });
};

window.printBadge = () => {
    // Basic print trick
    const content = document.getElementById('modal-view-qr').innerHTML;
    const win = window.open('', '', 'height=500, width=500');
    win.document.write('<html><head><title>Badge</title>');
    win.document.write('</head><body style="text-align:center;">');
    win.document.write(content);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
};

async function loadDevices() {
    const { data } = await sb.from('devices').select('*').order('last_seen', {ascending: false});
    const tbody = document.querySelector('#devices-table tbody');
    tbody.innerHTML = data.map(d => `
       <tr>
           <td>${d.device_name}</td>
           <td>${d.org}</td>
           <td>${d.last_seen ? new Date(d.last_seen).toLocaleString() : 'Never'}</td>
           <td><button class="btn danger small">Revoke</button></td>
       </tr>
    `).join('');
}

// --- UTILS ---

async function callEdge(func, body) {
    const session = await sb.auth.getSession();
    const token = session.data.session?.access_token;
    
    // Use Functions URL from config or hardcode
    const funcUrl = `${SUPABASE_URL}/functions/v1/${func}`;
    
    const res = await fetch(funcUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log(`Edge Func ${func} Response:`, data);
    return data;
}

function setupRealtime() {
    sb.channel('admin-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_itecpec' }, (payload) => {
        // Refresh if on relevant tab
        if (activeTab === 'dashboard') loadDashboard();
        if (activeTab === 'approvals') loadApprovals();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks_itecpec' }, (payload) => {
         if (activeTab === 'dashboard') loadDashboard();
         if (activeTab === 'approvals') loadApprovals();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log', filter: `org=eq.ITECPEC` }, (payload) => {
        if (activeTab === 'dashboard') loadDashboard();
    })
    .subscribe();
}

// --- EXPORTS ---
window.exportBadges = async () => {
    const { data, error } = await sb.from(`volunteers_${SUFFIX}`).select('name, unique_code, email, phone').order('name');
    if (error) return alert("Error fetching data: " + error.message);
    
    let csv = 'Name,Code,Email,Phone\n';
    data.forEach(v => {
        csv += `"${v.name}","${v.unique_code}","${v.email || ''}","${v.phone || ''}"\n`;
    });
    
    downloadCSV(`volunteers_${SUFFIX}.csv`, csv);
};

window.exportAttendance = async () => {
    const reportDate = document.getElementById('report-date')?.value;
    let query = sb.from(`attendance_${SUFFIX}`).select(`
        entry_time, exit_time, duration_minutes, status, unique_code,
        volunteers_${SUFFIX}(name)
    `);

    if (reportDate) {
        const start = `${reportDate}T00:00:00`;
        const end = `${reportDate}T23:59:59`;
        query = query.gte('entry_time', start).lte('entry_time', end);
    }

    const { data, error } = await query.order('entry_time', { ascending: false });
    
    if (error) return alert("Error fetching data: " + error.message);
    
    let csv = 'Volunteer Name,Code,Entry Time,Exit Time,Duration (min),Status\n';
    data.forEach(a => {
        const name = a[`volunteers_${SUFFIX}`]?.name || 'Unknown';
        csv += `"${name}","${a.unique_code}","${a.entry_time}","${a.exit_time || ''}","${a.duration_minutes || 0}","${a.status}"\n`;
    });
    
    const filename = reportDate ? `attendance_${SUFFIX}_${reportDate}.csv` : `attendance_${SUFFIX}_full.csv`;
    downloadCSV(filename, csv);
};

window.loadDailyLogs = async () => {
    const tbody = document.querySelector('#daily-log-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading daily summary...</td></tr>';

    // Fetch Last 30 Days of Attendance
    const { data: att } = await sb.from(`attendance_${SUFFIX}`).select('entry_time, duration_minutes').eq('status', 'approved');
    const { data: tsk } = await sb.from(`tasks_${SUFFIX}`).select('created_at').eq('status', 'approved');

    const dayGroup = {};

    (att || []).forEach(a => {
        const day = new Date(a.entry_time).toLocaleDateString();
        if (!dayGroup[day]) dayGroup[day] = { attendees: new Set(), tasks: 0, hours: 0 };
        dayGroup[day].hours += (a.duration_minutes || 0) / 60;
        // We can't easily get unique attendees from this simple query without a name joined, 
        // but for summary 'unique_code' is in attendance.
    });
    
    // Re-fetch with unique codes for better 'Attendees' count
    const { data: attUnique } = await sb.from(`attendance_${SUFFIX}`).select('entry_time, unique_code').eq('status', 'approved');
    (attUnique || []).forEach(a => {
        const day = new Date(a.entry_time).toLocaleDateString();
        if (!dayGroup[day]) dayGroup[day] = { attendees: new Set(), tasks: 0, hours: 0 };
        dayGroup[day].attendees.add(a.unique_code);
    });

    (tsk || []).forEach(t => {
        const day = new Date(t.created_at).toLocaleDateString();
        if (!dayGroup[day]) dayGroup[day] = { attendees: new Set(), tasks: 0, hours: 0 };
        dayGroup[day].tasks++;
    });

    const sortedDays = Object.keys(dayGroup).sort((a,b) => new Date(b) - new Date(a));

    if (sortedDays.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No activity recorded yet.</td></tr>';
        return;
    }

    tbody.innerHTML = sortedDays.map(day => {
        const d = dayGroup[day];
        // Format date for the input
        const isoDate = new Date(day).toISOString().split('T')[0];
        return `
            <tr>
                <td>${day}</td>
                <td>${d.attendees.size}</td>
                <td>${d.tasks}</td>
                <td>${d.hours.toFixed(1)}h</td>
                <td>
                    <button class="btn secondary small" onclick="document.getElementById('report-date').value='${isoDate}'; exportAttendance();">Export Day</button>
                </td>
            </tr>
        `;
    }).join('');
};

// --- DAILY ACTIVITY VIEW ---
window.loadDailyActivity = async () => {
    const dateInput = document.getElementById('activity-date');
    if (!dateInput.value) {
        // Default to today
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Listen for date changes
    dateInput.onchange = loadDailyActivity;
    
    const selectedDate = dateInput.value;
    const start = `${selectedDate}T00:00:00`;
    const end = `${selectedDate}T23:59:59`;
    
    const grid = document.getElementById('activity-volunteers-grid');
    grid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Loading activities...</p>';
    
    // Fetch attendance and tasks for the selected date
    const { data: attendance } = await sb.from(`attendance_${SUFFIX}`)
        .select(`*, volunteers_${SUFFIX}(id, name, unique_code, profile_image_url)`)
        .gte('entry_time', start)
        .lte('entry_time', end);
    
    const { data: tasks } = await sb.from(`tasks_${SUFFIX}`)
        .select(`*, volunteers_${SUFFIX}(id, name, unique_code, profile_image_url)`)
        .gte('created_at', start)
        .lte('created_at', end);
    
    // Group by volunteer
    const volMap = {};
    
    (attendance || []).forEach(a => {
        const vol = a[`volunteers_${SUFFIX}`];
        if (!vol) return;
        if (!volMap[vol.id]) volMap[vol.id] = { ...vol, attendance: [], tasks: [] };
        volMap[vol.id].attendance.push(a);
    });
    
    (tasks || []).forEach(t => {
        const vol = t[`volunteers_${SUFFIX}`];
        if (!vol) return;
        if (!volMap[vol.id]) volMap[vol.id] = { ...vol, attendance: [], tasks: [] };
        volMap[vol.id].tasks.push(t);
    });
    
    const volunteers = Object.values(volMap);
    
    if (volunteers.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:var(--text-secondary);">No activity recorded for this date.</p>';
        return;
    }
    
    grid.innerHTML = volunteers.map(v => {
        const imgHtml = v.profile_image_url 
            ? `<img src="${v.profile_image_url}" style="width:60px; height:60px; border-radius:50%; object-fit:cover; border:2px solid var(--primary);">` 
            : `<div class="animated-avatar" style="width:60px; height:60px; border-radius:50%; background:#333; display:flex; align-items:center; justify-content:center; font-size:1.5rem; border:2px solid var(--primary);">👤</div>`;
        
        return `
            <div class="card" style="padding:20px;">
                <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px;">
                    ${imgHtml}
                    <div>
                        <h3 style="margin:0;">${v.name}</h3>
                        <p style="margin:5px 0 0; color:var(--text-secondary); font-size:0.9rem;">${v.unique_code}</p>
                    </div>
                </div>
                
                <div style="margin-top:15px;">
                    <h4 style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:10px;">Attendance (${v.attendance.length})</h4>
                    ${v.attendance.map(a => `
                        <div style="background:var(--card-bg); padding:10px; border-radius:6px; margin-bottom:8px; border-left:3px solid ${a.status === 'approved' ? 'var(--success-color)' : a.status === 'declined' ? 'var(--danger-color)' : 'var(--warning-color)'};">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="font-size:0.85rem;">${new Date(a.entry_time).toLocaleTimeString()} - ${a.exit_time ? new Date(a.exit_time).toLocaleTimeString() : 'In Progress'}</div>
                                    <div style="font-size:0.8rem; color:var(--text-secondary);">${a.duration_minutes || 0} mins • ${a.status}</div>
                                </div>
                                ${a.status === 'pending' ? `
                                    <div style="display:flex; gap:5px;">
                                        <button class="btn primary small" onclick="approveActivity('attendance', '${a.id}')">✓</button>
                                        <button class="btn danger small" onclick="declineActivity('attendance', '${a.id}')">✗</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top:15px;">
                    <h4 style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:10px;">Tasks (${v.tasks.length})</h4>
                    ${v.tasks.map(t => `
                        <div style="background:var(--card-bg); padding:10px; border-radius:6px; margin-bottom:8px; border-left:3px solid ${t.status === 'approved' ? 'var(--success-color)' : t.status === 'declined' ? 'var(--danger-color)' : 'var(--warning-color)'};">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="font-size:0.85rem; font-weight:600;">${t.description || 'Task'}</div>
                                    <div style="font-size:0.8rem; color:var(--text-secondary);">${t.minutes || 0} mins • ${t.status}</div>
                                </div>
                                ${t.status === 'pending' ? `
                                    <div style="display:flex; gap:5px;">
                                        <button class="btn primary small" onclick="approveActivity('task', '${t.id}')">✓</button>
                                        <button class="btn danger small" onclick="declineActivity('task', '${t.id}')">✗</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
};

window.approveActivity = async (type, id) => {
    const table = type === 'attendance' ? `attendance_${SUFFIX}` : `tasks_${SUFFIX}`;
    const { error } = await sb.from(table).update({ status: 'approved' }).eq('id', id);
    
    if (error) {
        alert("Error approving: " + error.message);
    } else {
        loadDailyActivity(); // Reload current view
        loadDashboard(); // Refresh dashboard stats and recent activities
        loadApprovals(); // Refresh approvals list
    }
};

window.declineActivity = async (type, id) => {
    const table = type === 'attendance' ? `attendance_${SUFFIX}` : `tasks_${SUFFIX}`;
    const { error } = await sb.from(table).update({ status: 'declined' }).eq('id', id);
    
    if (error) {
        alert("Error declining: " + error.message);
    } else {
        loadDailyActivity(); // Reload current view
        loadDashboard(); // Refresh dashboard stats and recent activities
        loadApprovals(); // Refresh approvals list
    }
};

window.printAllBadges = async () => {
    const { data: vols, error } = await sb.from(`volunteers_${SUFFIX}`).select('*').order('name');
    if (error) return alert("Error fetching volunteers: " + error.message);

    const win = window.open('', '', 'height=800, width=1000');
    win.document.write(`
        <html>
        <head>
            <title>All Badges - ${ADMIN_ORG}</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
            <style>
                body { font-family: 'Inter', sans-serif; padding: 20px; background: white; color: black; }
                .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                .badge-card { 
                    border: 2px solid #eee; 
                    padding: 20px; 
                    text-align: center; 
                    border-radius: 12px; 
                    page-break-inside: avoid;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .qr-container { margin: 15px auto; }
                .vol-name { font-size: 1.4rem; font-weight: 700; margin: 10px 0 5px; color: #1e293b; }
                .vol-org { font-size: 0.9rem; font-weight: 600; color: #64748b; letter-spacing: 1px; }
                .vol-code { font-family: monospace; font-size: 1.1rem; color: #475569; margin-top: 5px; }
                @media print {
                    .grid { gap: 10px; }
                    .badge-card { border: 1px solid #ccc; }
                }
            </style>
        </head>
        <body>
            <h1 style="text-align:center;">${ADMIN_ORG} Volunteer Badges</h1>
            <div class="grid">
                ${vols.map(v => `
                    <div class="badge-card">
                        <div class="vol-org">${ADMIN_ORG}</div>
                        <div id="qr-${v.unique_code}" class="qr-container"></div>
                        <div class="vol-name">${v.name}</div>
                        <div class="vol-code">${v.unique_code}</div>
                    </div>
                `).join('')}
            </div>
            <script>
                window.onload = () => {
                    const vols = ${JSON.stringify(vols)};
                    vols.forEach(v => {
                        new QRCode(document.getElementById('qr-' + v.unique_code), {
                            text: 'VOL|${ADMIN_ORG}|' + v.unique_code,
                            width: 150,
                            height: 150,
                            colorDark: "#000000",
                            colorLight: "#ffffff"
                        });
                    });
                    setTimeout(() => { window.print(); }, 1000);
                };
            </script>
        </body>
        </html>
    `);
    win.document.close();
};

function downloadCSV(filename, csvContent) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- SCANNER ---
let html5QrcodeScanner = null;

document.getElementById('btn-admin-scan').addEventListener('click', startAdminScanner);

function startAdminScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
    }
    html5QrcodeScanner = new Html5Qrcode("admin-qr-reader");
    html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, onAdminScan);
    document.getElementById('btn-admin-scan').style.display = 'none';
}

async function onAdminScan(decodedText) {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.pause();
    }
    
    const resEl = document.getElementById('scan-result');
    resEl.textContent = 'Processing...';
    resEl.style.color = 'blue';

    try {
        const parts = decodedText.split('|');
        if (parts.length !== 3 || parts[0] !== 'VOL') {
            throw new Error("Invalid Format");
        }
        const [_, org, code] = parts;
        
        // Admin Force Check-in/Out logic?
        // Let's just try checkin first, if fail, try checkout?
        // Or ask? For speed, let's try checkin.
        
        let res = await callEdge('checkin', { code, device_id: 'admin_panel', org: 'ITECPEC' });
        
        if (res.success) {
            resEl.textContent = `Checked IN: ${code}`;
            resEl.style.color = 'green';
        } else if (res.error === 'Already checked in') {
            // Attempt Checkout
             res = await callEdge('checkout', { code, device_id: 'admin_panel', org: 'ITECPEC' });
             if (res.success) {
                 resEl.textContent = `Checked OUT: ${code} (${res.data.duration_minutes}m)`;
                 resEl.style.color = 'orange';
             } else {
                 resEl.textContent = `Error: ${res.error}`;
                 resEl.style.color = 'red';
             }
        } else {
            resEl.textContent = `Error: ${res.error}`;
            resEl.style.color = 'red';
        }

    } catch (e) {
        resEl.textContent = "Scan Error: " + e.message;
        resEl.style.color = 'red';
    }

    setTimeout(() => {
        resEl.textContent = '';
        if (html5QrcodeScanner) html5QrcodeScanner.resume();
    }, 3000);
}
