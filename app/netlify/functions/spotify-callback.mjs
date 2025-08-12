const sanitizeHtml = (str) => {
  return str.replace(/[&<>"']/g, (match) => {
    const escape = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escape[match];
  });
};

export default async (req) => {
  // Try to load dotenv if available (for local development)
  // In production, this will fail gracefully and use Netlify's env vars
  try {
    const { config } = await import('dotenv');
    config();
  } catch (e) {
    // dotenv not available or failed, use native environment variables
    console.log('Using native environment variables');
  }
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head><title>Method Not Allowed</title></head>
      <body>
        <h1>Method Not Allowed</h1>
        <p>Only GET requests are allowed for this endpoint</p>
        <p><a href="/">Go back</a></p>
      </body>
      </html>
    `, {
      status: 405,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  try {
    console.log('🔗 Callback function called');
    console.log('Request URL:', req.url);
    console.log('🔍 Environment check:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('SPOTIFY vars available:', Object.keys(process.env).filter(k => k.includes('SPOTIFY')));
    console.log('APP_URL available:', !!process.env.APP_URL);
    console.log('APP_URL value:', process.env.APP_URL);
    
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    
    console.log('Authorization code received:', !!code);
    console.log('Error parameter:', error);

    if (error) {
      const sanitizedError = sanitizeHtml(error);
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head><title>Spotify Auth Error</title></head>
        <body>
          <h1>Authentication Error</h1>
          <p>Error: ${sanitizedError}</p>
          <p><a href="/">Go back</a></p>
        </body>
        </html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (!code) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head><title>Spotify Auth Error</title></head>
        <body>
          <h1>Authentication Error</h1>
          <p>No authorization code received</p>
          <p><a href="/">Go back</a></p>
        </body>
        </html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('Spotify client credentials not configured');
      throw new Error('Server configuration error');
    }

    const appUrl = process.env.APP_URL;
    
    if (!appUrl) {
      console.error('❌ APP_URL environment variable is not set');
      throw new Error('APP_URL not configured. Please set APP_URL environment variable.');
    }
    
    const redirectUri = `${appUrl}/api/spotify-callback`;
    
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret),
        'User-Agent': 'Suzu-MCP-Server/1.0'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Spotify token exchange failed:', tokenData);
      throw new Error(tokenData.error_description || 'Failed to get access token');
    }

    if (!tokenData.access_token) {
      throw new Error('Invalid token response from Spotify');
    }

    const sanitizedToken = tokenData.access_token.replace(/[<>"'&]/g, '');

    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Spotify Authorization Success</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px; 
            background-color: #f9f9f9;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .token { 
            background: #f5f5f5; 
            padding: 15px; 
            border-radius: 5px; 
            word-break: break-all; 
            margin: 20px 0; 
            border: 1px solid #ddd;
            font-family: monospace;
            font-size: 14px;
          }
          .copy-btn { 
            background: #1db954; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 5px; 
            cursor: pointer; 
            font-size: 16px;
            margin: 10px 0;
          }
          .copy-btn:hover { background: #1ed760; }
          .success-icon {
            display: inline-block;
            background: #1db954;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            line-height: 24px;
            text-align: center;
            font-weight: bold;
            margin-right: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1><span class="success-icon">✓</span> Spotify Authorization Successful!</h1>
          
          <div class="token-section">
            <h3>Access Token (expires in 1 hour):</h3>
            <div class="token" id="accessTokenDisplay">${sanitizedToken}</div>
            <button class="copy-btn" onclick="copyAccessToken()">Copy Access Token</button>
          </div>
          
          ${tokenData.refresh_token ? `
          <div class="token-section">
            <h3>Refresh Token (for automatic renewal):</h3>
            <div class="token" id="refreshTokenDisplay">${tokenData.refresh_token.replace(/[<>"'&]/g, '')}</div>
            <button class="copy-btn" onclick="copyRefreshToken()">Copy Refresh Token</button>
          </div>
          ` : ''}
          
          <p><strong>Next steps:</strong></p>
          <ol>
            <li>Copy both tokens above</li>
            <li>Configure Suzu MCP with both tokens for automatic refresh</li>
            <li>Test the notification system</li>
          </ol>
        </div>
        
        <script>
          function copyAccessToken() {
            const token = document.getElementById('accessTokenDisplay').textContent.trim();
            navigator.clipboard.writeText(token).then(() => {
              showCopySuccess('access');
            }).catch(() => {
              alert('Please copy the access token manually.');
            });
          }
          
          function copyRefreshToken() {
            const token = document.getElementById('refreshTokenDisplay').textContent.trim();
            navigator.clipboard.writeText(token).then(() => {
              showCopySuccess('refresh');
            }).catch(() => {
              alert('Please copy the refresh token manually.');
            });
          }
          
          function showCopySuccess(tokenType) {
            const buttons = document.querySelectorAll('.copy-btn');
            buttons.forEach(btn => {
              if (btn.textContent.includes(tokenType === 'access' ? 'Access' : 'Refresh')) {
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                btn.style.background = '#28a745';
                setTimeout(() => {
                  btn.textContent = originalText;
                  btn.style.background = '#1db954';
                }, 2000);
              }
            });
          }
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Error in spotify-callback function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const sanitizedError = sanitizeHtml(errorMessage);
    
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head><title>Spotify Auth Error</title></head>
      <body>
        <h1>Authentication Error</h1>
        <p>Error: ${sanitizedError}</p>
        <p><a href="/">Try again</a></p>
      </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
};