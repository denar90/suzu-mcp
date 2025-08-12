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
  console.log('🔄 Spotify refresh function called');
  console.log('Method:', req.method);

  // Only allow POST requests for refresh
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Allow': 'POST' }
    });
  }

  try {
    console.log('🔍 Checking environment variables...');
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('❌ Spotify client credentials not configured');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error', 
        details: 'Spotify client credentials not configured' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get refresh token from request body
    const body = await req.json().catch(() => ({}));
    const refreshToken = body.refresh_token;

    if (!refreshToken) {
      return new Response(JSON.stringify({ 
        error: 'Missing refresh token', 
        details: 'refresh_token is required in request body' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🔄 Refreshing access token...');
    
    // Call Spotify token endpoint to refresh
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret),
        'User-Agent': 'Suzu-MCP-Server/1.0'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('❌ Spotify token refresh failed:', tokenData);
      return new Response(JSON.stringify({ 
        error: 'Token refresh failed',
        details: tokenData.error_description || 'Failed to refresh access token',
        spotify_error: tokenData.error
      }), {
        status: tokenResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!tokenData.access_token) {
      return new Response(JSON.stringify({ 
        error: 'Invalid refresh response', 
        details: 'No access token in response' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Token refreshed successfully');

    // Return the new tokens
    const response = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in || 3600,
      scope: tokenData.scope
    };

    // Include new refresh token if provided (Spotify sometimes provides a new one)
    if (tokenData.refresh_token) {
      response.refresh_token = tokenData.refresh_token;
    }

    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('💥 Error in spotify-refresh function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      type: error.constructor.name
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};