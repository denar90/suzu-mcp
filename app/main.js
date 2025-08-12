console.log('Script loaded!');

let accessToken = null;

async function authorizeSpotify() {
    console.log('authorizeSpotify called - using serverless function');
    
    try {
        // Get auth URL from serverless function
        const response = await fetch('/api/spotify-auth');
        if (!response.ok) {
            throw new Error('Failed to get auth URL');
        }
        
        const { authUrl } = await response.json();
        console.log('Auth URL from serverless function:', authUrl);
        
        // Open in new window for better UX
        const popup = window.open(authUrl, 'spotify-auth', 'width=600,height=700,scrollbars=yes,resizable=yes');
        
        // Optional: Listen for popup close to refresh the main window
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                console.log('Auth popup closed');
            }
        }, 1000);
        
    } catch (error) {
        console.error('Auth error:', error);
        alert('Authentication failed: ' + error.message);
    }
}

function getTokenFromURL() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
}

function showToken(token) {
    accessToken = token;
    document.getElementById('tokenDisplay').textContent = token;
    document.getElementById('step2').classList.remove('hidden');
    document.getElementById('step3').classList.remove('hidden');
    document.getElementById('authBtn').textContent = '✅ Authorized!';
    document.getElementById('authBtn').disabled = true;
}

function copyToken() {
    navigator.clipboard.writeText(accessToken).then(() => {
        showStatus('Token copied to clipboard!', 'success');
    }).catch(() => {
        showStatus('Failed to copy token', 'error');
    });
}

async function testToken() {
    if (!accessToken) return;
    
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (response.ok) {
            showStatus('✅ Token is valid! Spotify device detected.', 'success');
        } else if (response.status === 204) {
            showStatus('⚠️ Token valid but no active device. Open Spotify and play a song.', 'error');
        } else {
            showStatus('❌ Token invalid or expired.', 'error');
        }
    } catch (error) {
        showStatus('❌ Error testing token: ' + error.message, 'error');
    }
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `step ${type}`;
    setTimeout(() => {
        status.textContent = '';
        status.className = '';
    }, 5000);
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    const authBtn = document.getElementById('authBtn');
    console.log('Auth button found:', authBtn);
    
    if (authBtn) {
        authBtn.addEventListener('click', function() {
            console.log('Button clicked!');
            authorizeSpotify();
        });
    }
    
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyToken);
    }
    
    const testBtn = document.getElementById('testBtn');
    if (testBtn) {
        testBtn.addEventListener('click', testToken);
    }
    
    // Check if we're returning from Spotify auth
    const token = getTokenFromURL();
    if (token) {
        showToken(token);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});