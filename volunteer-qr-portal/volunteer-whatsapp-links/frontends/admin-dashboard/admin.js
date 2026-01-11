const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co'; // Replace with env or config
const SUPABASE_KEY = 'YOUR_SUPABASE_SERVICE_ROLE_OR_ANON'; // Restricted access recommended

const EF_URL = `${SUPABASE_URL}/functions/v1`;

async function fetchPendingActions() {
    try {
        // Fetch action tokens that are not used and not expired
        const response = await fetch(`${SUPABASE_URL}/rest/v1/action_tokens?used=eq.false&expires_at=gt.now()`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const actions = await response.json();
        
        renderActions(actions);
        document.getElementById('pendingCount').innerText = actions.length;
    } catch (err) {
        console.error('Error fetching actions:', err);
        showToast('Failed to load actions');
    }
}

function renderActions(actions) {
    const tbody = document.getElementById('actionsBody');
    if (actions.length === 0) {
        tbody.innerHTML = `<tr class="empty-state"><td colspan="6">No pending actions found.</td></tr>`;
        return;
    }

    tbody.innerHTML = actions.map(action => {
        const created = new Date(action.created_at).toLocaleString();
        const expires = new Date(action.expires_at).toLocaleTimeString();
        
        return `
            <tr class="fade-in">
                <td>${action.volunteer_name || 'Volunteer'}</td>
                <td><span class="badge">${action.org || 'N/A'}</span></td>
                <td>${action.action_type.replace(/_/g, ' ')}</td>
                <td>${created}</td>
                <td><span class="text-secondary">${expires}</span></td>
                <td>
                    <div class="wa-actions">
                        <button class="btn btn-whatsapp btn-sm" onclick="openWhatsApp('${action.token}')">
                            <i class="fab fa-whatsapp"></i> Open
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="copyWALink('${action.token}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function openWhatsApp(token) {
    // We call the edge function to get the prefilled message and wa.me link
    showToast('Preparing WhatsApp message...');
    try {
        // In a real app, you might already have the link or call a light endpoint
        const response = await fetch(`${EF_URL}/create-action-link`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ token_request: true, token: token }) // Placeholder logic
        });
        const data = await response.json();
        if (data.waLink) window.open(data.waLink, '_blank');
    } catch (err) {
        showToast('Integration requires configuration');
    }
}

function copyWALink(token) {
    const link = `https://scan.yourdomain.com/admin-action/?t=${token}`;
    navigator.clipboard.writeText(link);
    showToast('Action link copied to clipboard!');
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

document.getElementById('refreshBtn').addEventListener('click', fetchPendingActions);

// Initial load and polling
fetchPendingActions();
setInterval(fetchPendingActions, 10000);
