const EF_URL = 'https://YOUR_SUPABASE_URL.supabase.co/functions/v1';

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('t');

if (!token) {
    document.body.innerHTML = '<h1>Invalid Link</h1><p>Token is missing from the URL.</p>';
} else {
    initActionPage();
}

async function initActionPage() {
    try {
        const response = await fetch(`${EF_URL}/action-page?t=${token}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        // Populate UI
        document.getElementById('volName').innerText = data.target_summary.volunteer_name || 'N/A';
        document.getElementById('volOrg').innerText = data.target_summary.org || 'N/A';
        document.getElementById('volEvent').innerText = data.target_summary.event || 'N/A';
        document.getElementById('volTime').innerText = data.target_summary.time || 'N/A';
        
        if (data.require_pin) {
            document.getElementById('pinSection').classList.remove('hidden');
        }

        document.getElementById('loader').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');

        setupEventListeners(data);
    } catch (err) {
        showResult('Error', err.message, 'x');
    }
}

function setupEventListeners(data) {
    document.getElementById('approveBtn').onclick = () => applyAction('approve');
    document.getElementById('declineBtn').onclick = () => applyAction('decline');
    document.getElementById('assignBtn').onclick = () => applyAction('assign');
}

async function applyAction(actionType) {
    const pin = document.getElementById('pinInput').value;
    const note = document.getElementById('adminNote').value;

    document.getElementById('loader').classList.remove('hidden');
    document.getElementById('loader').querySelector('p').innerText = 'Applying Action...';

    try {
        const response = await fetch(`${EF_URL}/action-apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                action: actionType,
                admin_note: note,
                pin: pin
            })
        });
        const result = await response.json();

        if (!result.success) throw new Error(result.error);

        showResult('Success', result.message, '✓');
    } catch (err) {
        showResult('Failed', err.message, '!');
    }
}

function showResult(title, msg, icon) {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('mainContent').classList.add('hidden');
    
    const screen = document.getElementById('resultScreen');
    screen.classList.remove('hidden');
    document.getElementById('resultTitle').innerText = title;
    document.getElementById('resultMsg').innerText = msg;
    document.getElementById('resultIcon').innerText = icon;
    
    if (title === 'Failed' || title === 'Error') {
        document.querySelector('.icon-circle').style.backgroundColor = 'var(--decline)';
    }
}
