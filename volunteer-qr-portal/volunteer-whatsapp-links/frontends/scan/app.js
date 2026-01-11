const EF_URL = 'https://YOUR_SUPABASE_URL.supabase.co/functions/v1';

const scanner = new Html5Qrcode("reader");
const config = { fps: 10, qrbox: { width: 250, height: 250 } };

scanner.start({ facingMode: "environment" }, config, (decodedText) => {
    handleScan(decodedText);
});

async function handleScan(code) {
    showStatus('Processing', `Checking code: ${code}...`, '⌛');
    try {
        // Logic to determine org based on subdomain or settings
        const org = window.location.hostname.includes('itec') ? 'ITECPEC' : 'CAPEC';
        
        const endpoint = code.includes('OUT') ? 'checkout' : 'checkin';
        
        const response = await fetch(`${EF_URL}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, org, device_id: 'cpanel-web' })
        });
        const data = await response.json();

        if (data.success) {
            showStatus('Success', 'Check-in recorded. Admin has been notified via WhatsApp.', '✅');
        } else {
            throw new Error(data.error);
        }
    } catch (err) {
        showStatus('Error', err.message, '❌');
    }
}

function showStatus(title, msg, icon) {
    document.getElementById('statusOverlay').classList.remove('hidden');
    document.getElementById('statusTitle').innerText = title;
    document.getElementById('statusMsg').innerText = msg;
    document.getElementById('statusIcon').innerText = icon;
}

document.getElementById('closeStatus').onclick = () => {
    document.getElementById('statusOverlay').classList.add('hidden');
};

document.getElementById('manualSubmit').onclick = () => {
    const code = document.getElementById('manualCode').value;
    if (code) handleScan(code);
};
